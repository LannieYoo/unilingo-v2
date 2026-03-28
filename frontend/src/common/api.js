/**
 * API Fetch Wrapper with Trace ID Support
 * 
 * Wraps fetch API to automatically:
 * - Generate and include trace IDs in request headers
 * - Extract trace IDs from response headers
 * - Preserve trace IDs in error handling
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * API fetch wrapper with trace ID support
 * 
 * @template T
 * @param {string} url - API endpoint (relative or absolute)
 * @param {RequestInit & { skipTraceId?: boolean }} options - Fetch options
 * @returns {Promise<{ data: T, traceId: string, status: number }>}
 */
export async function apiFetch(url, options = {}) {
  const { skipTraceId = false, ...fetchOptions } = options;
  
  // Generate trace ID using crypto.randomUUID()
  const traceId = skipTraceId ? null : crypto.randomUUID();
  
  // Build full URL
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  
  // Add trace ID to headers
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };
  
  if (traceId) {
    headers['x-trace-id'] = traceId;
  }
  
  try {
    // Make request
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });
    
    // Extract trace ID from response headers
    const responseTraceId = response.headers.get('x-trace-id') || traceId;
    
    // Parse response body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Handle 401 Unauthorized - token expired
    if (response.status === 401) {
      // Import auth store dynamically to avoid circular dependency
      const { useAuthStore } = await import('../modules/auth/_05_stores/authStore');
      const store = useAuthStore.getState();
      // Only trigger token expired if user was authenticated
      if (store.isAuthenticated) {
        store.handleTokenExpired();
      }
    }
    
    // Handle error responses
    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.data = data;
      error.traceId = responseTraceId;
      throw error;
    }
    
    // Return data with trace ID
    return {
      data,
      traceId: responseTraceId,
      status: response.status,
    };
  } catch (error) {
    // Preserve trace ID in error
    if (!error.traceId && traceId) {
      error.traceId = traceId;
    }
    throw error;
  }
}

/**
 * Helper function to build query string from params object
 * 
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  
  const query = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  return query ? `?${query}` : '';
}

/**
 * GET request with trace ID
 * 
 * @template T
 * @param {string} url - API endpoint
 * @param {Object} params - Query parameters
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{ data: T, traceId: string, status: number }>}
 */
export async function apiGet(url, params = {}, options = {}) {
  const queryString = buildQueryString(params);
  return apiFetch(`${url}${queryString}`, {
    ...options,
    method: 'GET',
  });
}

/**
 * POST request with trace ID
 * 
 * @template T
 * @param {string} url - API endpoint
 * @param {Object} body - Request body
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{ data: T, traceId: string, status: number }>}
 */
export async function apiPost(url, body = {}, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request with trace ID
 * 
 * @template T
 * @param {string} url - API endpoint
 * @param {Object} body - Request body
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{ data: T, traceId: string, status: number }>}
 */
export async function apiPut(url, body = {}, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request with trace ID
 * 
 * @template T
 * @param {string} url - API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<{ data: T, traceId: string, status: number }>}
 */
export async function apiDelete(url, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'DELETE',
  });
}

export default apiFetch;
