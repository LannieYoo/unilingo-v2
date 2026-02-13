/**
 * Error Monitoring Service
 * API calls for admin error monitoring
 */

import { apiFetch, buildQueryString } from '../../../common/api.js';

/**
 * Convert snake_case keys to camelCase
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 */
function keysToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * Get error events with pagination and filters
 * 
 * @param {string} accessToken - Access token
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Page size (default: 100)
 * @param {'frontend' | 'backend' | null} options.whereFrom - Filter by source
 * @param {string | null} options.startDate - Start date (ISO format)
 * @param {string | null} options.endDate - End date (ISO format)
 * @returns {Promise<{data: import('../../../common/types.js').PaginatedErrorResponse, traceId: string}>}
 */
export async function getErrorEvents(accessToken, options = {}) {
  const {
    page = 1,
    pageSize = 100,
    whereFrom = null,
    startDate = null,
    endDate = null,
  } = options;
  
  // Build query parameters
  const params = {
    page,
    page_size: pageSize,
  };
  
  if (whereFrom) {
    params.where_from = whereFrom;
  }
  
  if (startDate) {
    params.start_date = startDate;
  }
  
  if (endDate) {
    params.end_date = endDate;
  }
  
  const queryString = buildQueryString(params);
  
  // Make request
  const response = await apiFetch(`/api/admin/errors${queryString}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  // Transform response to camelCase
  const camelData = keysToCamel(response.data);
  
  return {
    data: camelData.data,
    traceId: response.traceId,
  };
}

/**
 * Get error events by trace ID
 * 
 * @param {string} accessToken - Access token
 * @param {string} traceId - Trace ID to search for
 * @returns {Promise<{data: import('../../../common/types.js').ErrorEvent[], traceId: string}>}
 */
export async function getErrorEventsByTraceId(accessToken, traceId) {
  // Make request
  const response = await apiFetch(`/api/admin/errors/${traceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  // Transform response to camelCase
  const camelData = keysToCamel(response.data);
  
  return {
    data: camelData.data,
    traceId: response.traceId,
  };
}

/**
 * Trigger test error (for testing error tracking)
 * 
 * @param {string} accessToken - Access token
 * @returns {Promise<{traceId: string}>}
 */
export async function triggerTestError(accessToken) {
  try {
    // This endpoint intentionally throws an error
    await apiFetch('/api/admin/errors/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    // Should not reach here
    throw new Error('Test error endpoint did not throw error');
  } catch (error) {
    // Expected to fail with 500 error
    // Return the trace ID from the error
    return {
      traceId: error.traceId,
      error: error.message,
    };
  }
}

export default {
  getErrorEvents,
  getErrorEventsByTraceId,
  triggerTestError,
};
