/**
 * Usage service - API calls for usage tracking.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

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

export const usageService = {
  /**
   * Get current month usage for authenticated user.
   * 
   * @param {string} accessToken - User access token
   * @returns {Promise<Object>} Usage data with translationChars, sttChars, totalChars, limit, percentage, month, userLevel
   */
  async getCurrentUsage(accessToken) {
    try {
      const response = await api.get('/api/usage/current', {
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
        console.error(`[Usage Service] getCurrentUsage failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Usage Service] getCurrentUsage failed:', error);
      }
      throw error;
    }
  },

  /**
   * Get current month usage for guest user (by IP).
   * 
   * @returns {Promise<Object>} Usage data with translationChars, sttChars, totalChars, limit, percentage, month, userLevel
   */
  async getGuestUsage() {
    try {
      const response = await api.get('/api/usage/guest/current');
      
      // Convert snake_case to camelCase
      const camelData = keysToCamel(response.data);
      
      // Extract data from success response wrapper
      return camelData.data || camelData;
    } catch (error) {
      // Log trace_id if available
      const traceId = error.response?.data?.error?.trace_id || error.response?.headers?.['x-trace-id'];
      if (traceId) {
        console.error(`[Usage Service] getGuestUsage failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Usage Service] getGuestUsage failed:', error);
      }
      throw error;
    }
  },

  /**
   * Track character usage after processing.
   * 
   * @param {string} accessToken - User access token
   * @param {number} charCount - Number of characters processed
   * @param {string} usageType - Type of usage: 'translation' or 'stt'
   * @returns {Promise<Object>} Success response
   */
  async trackUsage(accessToken, charCount, usageType) {
    try {
      const response = await api.post('/api/usage/track', {
        char_count: charCount,
        usage_type: usageType,
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
        console.error(`[Usage Service] trackUsage failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Usage Service] trackUsage failed:', error);
      }
      throw error;
    }
  },

  /**
   * Track character usage for guest user (by IP).
   * 
   * @param {number} charCount - Number of characters processed
   * @param {string} usageType - Type of usage: 'translation' or 'stt'
   * @returns {Promise<Object>} Success response
   */
  async trackGuestUsage(charCount, usageType) {
    try {
      const response = await api.post('/api/usage/guest/track', {
        char_count: charCount,
        usage_type: usageType,
      });
      
      return keysToCamel(response.data);
    } catch (error) {
      // Log trace_id if available
      const traceId = error.response?.data?.error?.trace_id || error.response?.headers?.['x-trace-id'];
      if (traceId) {
        console.error(`[Usage Service] trackGuestUsage failed (trace_id: ${traceId}):`, error);
      } else {
        console.error('[Usage Service] trackGuestUsage failed:', error);
      }
      throw error;
    }
  },
};

export default usageService;
