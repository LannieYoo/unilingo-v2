/**
 * Approval service - API calls for user approval operations.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to convert snake_case to camelCase
const keysToCamel = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

export const approvalService = {
  /**
   * Get list of pending users (admin only).
   * 
   * @param {string} accessToken - Admin access token
   * @returns {Promise<Object>} Pending users data
   */
  async getPendingUsers(accessToken) {
    try {
      const response = await api.get('/api/admin/users/pending', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      // Convert snake_case to camelCase
      const camelData = keysToCamel(response.data);
      
      // Extract data from success response wrapper
      return camelData.data || camelData;
    } catch (error) {
      // Log trace_id if available
      const traceId = error.response?.data?.error?.trace_id || error.response?.headers?.['x-trace-id'];
      if (traceId) {
        console.error(`[Approval Service] getPendingUsers failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Approval Service] getPendingUsers failed:', error);
      }
      throw error;
    }
  },

  /**
   * Approve a single user (admin only).
   * 
   * @param {string} accessToken - Admin access token
   * @param {number} userId - User ID to approve
   * @returns {Promise<Object>} Success response
   */
  async approveUser(accessToken, userId) {
    try {
      const response = await api.post(`/api/admin/users/${userId}/approve`, {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      return keysToCamel(response.data);
    } catch (error) {
      // Log trace_id if available
      const traceId = error.response?.data?.error?.trace_id || error.response?.headers?.['x-trace-id'];
      if (traceId) {
        console.error(`[Approval Service] approveUser failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Approval Service] approveUser failed:', error);
      }
      throw error;
    }
  },

  /**
   * Approve multiple users (admin only).
   * 
   * @param {string} accessToken - Admin access token
   * @param {number[]} userIds - Array of user IDs to approve
   * @returns {Promise<Object>} Success response with approved count
   */
  async bulkApproveUsers(accessToken, userIds) {
    try {
      const response = await api.post('/api/admin/users/bulk-approve', {
        user_ids: userIds,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      return keysToCamel(response.data);
    } catch (error) {
      // Log trace_id if available
      const traceId = error.response?.data?.error?.trace_id || error.response?.headers?.['x-trace-id'];
      if (traceId) {
        console.error(`[Approval Service] bulkApproveUsers failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Approval Service] bulkApproveUsers failed:', error);
      }
      throw error;
    }
  },
};

export default approvalService;
