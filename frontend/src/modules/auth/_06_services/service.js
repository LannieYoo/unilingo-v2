/**
 * Auth service - API calls.
 */
import axios from 'axios';
import { AUTH_ENDPOINTS, ADMIN_ENDPOINTS } from '../_08_constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if it's a 401 error (token expired)
    if (error.response?.status === 401) {
      // Import auth store dynamically to avoid circular dependency
      import('../_05_stores/authStore').then(({ useAuthStore }) => {
        const store = useAuthStore.getState();
        // Only trigger token expired if user was authenticated
        if (store.isAuthenticated) {
          store.handleTokenExpired();
        }
      });
    }
    return Promise.reject(error);
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
  async getDictionaryLogs(accessToken, limit = 50) {
    const response = await api.get(ADMIN_ENDPOINTS.DICTIONARY_LOGS, {
      params: { limit },
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
