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
  async getUsers(accessToken, page = 1, limit = 20) {
    const response = await api.get(ADMIN_ENDPOINTS.USERS, {
      params: { page, limit },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  /**
   * Get login logs (admin only).
   */
  async getLoginLogs(accessToken, limit = 100, userId = null) {
    const params = { limit };
    if (userId) params.user_id = userId;
    
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
  async getSttLogs(accessToken, limit = 100, userId = null) {
    const params = { limit };
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
  async getSttLogsSummary(accessToken) {
    const response = await api.get(`${ADMIN_ENDPOINTS.STT_LOGS}/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

export default authService;
