/**
 * Auth service - API calls.
 */
import axios from 'axios';
import { AUTH_ENDPOINTS, ADMIN_ENDPOINTS } from '../_08_constants';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh queue management for automatic retry on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: auto-refresh token and retry on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 403 NOT_APPROVED — admin revoked approval mid-session
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.code === 'NOT_APPROVED'
    ) {
      const { useAuthStore } = await import('../_05_stores/authStore');
      const store = useAuthStore.getState();
      // Fetch user info for display in the modal, then block access
      store.setTokens(null);
      useAuthStore.setState({
        isAuthenticated: false,
        isAdmin: false,
        pendingApproval: true,
      });
      return Promise.reject(error);
    }

    // Only handle 401, skip already-retried or auth endpoint requests
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/google')
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request and wait
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { useAuthStore } = await import('../_05_stores/authStore');
      const store = useAuthStore.getState();
      const refreshToken = store.tokens?.refresh_token;

      if (!refreshToken) {
        if (store.isAuthenticated) {
          store.handleTokenExpired();
        }
        processQueue(error);
        return Promise.reject(error);
      }

      // Attempt token refresh (calls /auth/refresh which is excluded from interception)
      const response = await api.post(AUTH_ENDPOINTS.REFRESH, {
        refresh_token: refreshToken,
      });
      const newTokens = response.data;

      if (newTokens?.access_token) {
        // Update store with new tokens
        store.setTokens(newTokens);
        processQueue(null, newTokens.access_token);

        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${newTokens.access_token}`;
        return api(originalRequest);
      }

      store.handleTokenExpired();
      processQueue(error);
      return Promise.reject(error);
    } catch (refreshError) {
      const { useAuthStore } = await import('../_05_stores/authStore');
      const store = useAuthStore.getState();

      if (refreshError.response?.data?.error?.code === 'SESSION_EXPIRED') {
        store.handleSessionExpired();
      } else if (store.isAuthenticated) {
        store.handleTokenExpired();
      }
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const authService = {
  /**
   * Get Google OAuth authorization URL.
   */
  async getGoogleAuthUrl(redirectUri) {
    const response = await api.post(AUTH_ENDPOINTS.GOOGLE_AUTH, {
      redirect_uri: redirectUri,
    });
    return response.data;
  },

  /**
   * Handle Google OAuth callback.
   */
  async googleCallback(code, redirectUri) {
    const response = await api.post(AUTH_ENDPOINTS.GOOGLE_CALLBACK, {
      code,
      redirect_uri: redirectUri,
    });
    return response.data;
  },

  /**
   * Refresh access token.
   */
  async refreshToken(refreshToken) {
    const response = await api.post(AUTH_ENDPOINTS.REFRESH, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user info.
   */
  async getMe(accessToken) {
    const response = await api.get(AUTH_ENDPOINTS.ME, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Logout.
   */
  async logout(accessToken) {
    const response = await api.post(AUTH_ENDPOINTS.LOGOUT, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Admin APIs
  /**
   * Get all users (admin only).
   */
  async getUsers(accessToken, page = 1, limit = 20, search = '') {
    const params = { page, limit };
    if (search) params.search = search;
    
    const response = await api.get(ADMIN_ENDPOINTS.USERS, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get login logs (admin only).
   */
  async getLoginLogs(accessToken, limit = 100, page = 1, userId = null, search = '') {
    const params = { limit, page };
    if (userId) params.user_id = userId;
    if (search) params.search = search;
    
    const response = await api.get(ADMIN_ENDPOINTS.LOGIN_LOGS, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Check admin status.
   */
  async checkAdmin(accessToken) {
    const response = await api.get(ADMIN_ENDPOINTS.CHECK, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Toggle user active status (admin only).
   */
  async toggleUserActive(accessToken, userId) {
    const response = await api.post(`${ADMIN_ENDPOINTS.USERS}/${userId}/toggle-active`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Update user level (admin only).
   */
  async updateUserLevel(accessToken, userId, userLevel) {
    const response = await api.post(`${ADMIN_ENDPOINTS.USERS}/${userId}/update-level`, {
      user_level: userLevel
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Update user GPU time limit (admin only).
   * @param {number|null} dailyGpuLimitMinutes - Minutes per day, or null to reset to level default
   */
  async updateUserGpuLimit(accessToken, userId, dailyGpuLimitMinutes) {
    const response = await api.post(`${ADMIN_ENDPOINTS.USERS}/${userId}/update-gpu-limit`, {
      daily_gpu_limit_minutes: dailyGpuLimitMinutes
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // STT Log APIs
  /**
   * Create STT usage log.
   */
  async createSttLog(accessToken, data) {
    const response = await api.post(ADMIN_ENDPOINTS.STT_LOGS, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get STT logs (admin only).
   */
  async getSttLogs(accessToken, limit = 100, userId = null, page = 1) {
    const params = { limit, page };
    if (userId) params.user_id = userId;
    
    const response = await api.get(ADMIN_ENDPOINTS.STT_LOGS, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get STT usage summary (admin only).
   */
  async getSttLogsSummary(accessToken, limit = 100, page = 1, search = '') {
    const params = { limit, page };
    if (search) params.search = search;
    
    const response = await api.get(`${ADMIN_ENDPOINTS.STT_LOGS}/summary`, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Translation Log APIs
  /**
   * Create translation log.
   */
  async createTranslationLog(accessToken, data) {
    const response = await api.post(ADMIN_ENDPOINTS.TRANSLATION_LOGS, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get recent translation logs for current user.
   */
  async getRecentTranslationLogs(accessToken, limit = 10) {
    const response = await api.get(`${ADMIN_ENDPOINTS.TRANSLATION_LOGS}/recent`, {
      params: { limit },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get all translation logs for current user.
   */
  async getTranslationLogs(accessToken, limit = 100, userId = null) {
    const params = { limit };
    if (userId) params.user_id = userId;
    
    const response = await api.get(ADMIN_ENDPOINTS.TRANSLATION_LOGS, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Delete translation log.
   */
  async deleteTranslationLog(accessToken, logId) {
    const response = await api.delete(`${ADMIN_ENDPOINTS.TRANSLATION_LOGS}/${logId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Toggle translation log favorite status.
   */
  async toggleTranslationFavorite(accessToken, logId) {
    const response = await api.post(`${ADMIN_ENDPOINTS.TRANSLATION_LOGS}/${logId}/favorite`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Toggle dictionary log favorite status.
   */
  async toggleDictionaryFavorite(accessToken, logId) {
    const response = await api.put(`${ADMIN_ENDPOINTS.DICTIONARY_LOGS}/${logId}/favorite`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get favorite translation logs for current user.
   */
  async getFavoriteTranslationLogs(accessToken, limit = 100) {
    const response = await api.get(`${ADMIN_ENDPOINTS.TRANSLATION_LOGS}/favorites`, {
      params: { limit },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Dictionary Log APIs
  /**
   * Create dictionary search log.
   */
  async createDictionaryLog(accessToken, data) {
    const response = await api.post(ADMIN_ENDPOINTS.DICTIONARY_LOGS, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get recent dictionary search logs for current user.
   */
  async getRecentDictionaryLogs(accessToken, limit = 10) {
    const response = await api.get(`${ADMIN_ENDPOINTS.DICTIONARY_LOGS}/recent`, {
      params: { limit },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get all dictionary search logs for current user.
   */
  async getDictionaryLogs(accessToken, limit = 50, offset = 0, favoritesOnly = false) {
    const params = { limit, offset };
    if (favoritesOnly) params.favorites_only = 'true';
    const response = await api.get(ADMIN_ENDPOINTS.DICTIONARY_LOGS, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Delete dictionary search log.
   */
  async deleteDictionaryLog(accessToken, logId) {
    const response = await api.delete(`${ADMIN_ENDPOINTS.DICTIONARY_LOGS}/${logId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Clear all dictionary search logs for current user.
   */
  async clearDictionaryLogs(accessToken) {
    const response = await api.delete(`${ADMIN_ENDPOINTS.DICTIONARY_LOGS}/clear`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // User Settings APIs
  /**
   * Get user's language preferences.
   */
  async getLanguagePreferences(accessToken) {
    const response = await api.get(`${ADMIN_ENDPOINTS.SETTINGS}/language`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Update user's language preferences.
   */
  async updateLanguagePreferences(accessToken, data) {
    const response = await api.put(`${ADMIN_ENDPOINTS.SETTINGS}/language`, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get system health check status.
   */
  async getHealthCheck() {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default authService;
