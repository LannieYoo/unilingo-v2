/**
 * Global Error Handler
 * 
 * Captures unhandled errors and promise rejections, reports them to the backend,
 * and logs trace IDs for debugging.
 */

import { apiFetch } from './api.js';

let isInitialized = false;
let authStore = null;

/**
 * Set up global error handler
 * 
 * Listens to window.onerror and window.onunhandledrejection events
 * and reports errors to the backend.
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.authStore - Auth store for getting user context
 */
export function setupGlobalErrorHandler(options = {}) {
  if (isInitialized) {
    console.warn('[ErrorHandler] Already initialized');
    return;
  }
  
  authStore = options.authStore;
  isInitialized = true;
  
  // Handle synchronous errors
  window.addEventListener('error', (event) => {
    handleError(event.error || new Error(event.message), {
      url: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    handleError(error, {
      type: 'unhandledRejection',
    });
  });
  
  console.log('[ErrorHandler] Global error handler initialized');
}

/**
 * Handle error and report to backend
 * 
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
async function handleError(error, context = {}) {
  try {
    // Extract error details
    const message = error.message || 'Unknown error';
    const stackTrace = error.stack || '';
    const url = context.url || window.location.href;
    const userAgent = navigator.userAgent;
    
    // Get trace ID from error (if from API call) or generate new one
    const traceId = error.traceId || crypto.randomUUID();
    
    // Get user context from auth store
    let userContext = {};
    if (authStore && typeof authStore.getState === 'function') {
      const state = authStore.getState();
      if (state.user) {
        userContext = {
          userId: state.user.id,
          email: state.user.email,
        };
      }
    }
    
    // Log to console with trace ID
    console.error('[TRACE_ID]', traceId);
    console.error('[ERROR]', message);
    if (stackTrace) {
      console.error('[STACK]', stackTrace);
    }
    
    // Report error to backend
    await reportError({
      traceId,
      message,
      stackTrace,
      userContext,
      url,
      userAgent,
    });
  } catch (reportError) {
    // Don't create error loops - just log to console
    console.error('[ErrorHandler] Failed to report error:', reportError);
  }
}

/**
 * Report error to backend
 * 
 * @param {Object} errorReport - Error report data
 * @param {string} errorReport.traceId - Trace ID
 * @param {string} errorReport.message - Error message
 * @param {string} errorReport.stackTrace - Stack trace
 * @param {Object} errorReport.userContext - User context
 * @param {string} errorReport.url - URL where error occurred
 * @param {string} errorReport.userAgent - User agent string
 * @returns {Promise<void>}
 */
export async function reportError(errorReport) {
  try {
    // Get access token from auth store
    let accessToken = null;
    if (authStore && typeof authStore.getState === 'function') {
      const state = authStore.getState();
      accessToken = state.accessToken;
    }
    
    // Don't report if not authenticated
    if (!accessToken) {
      console.warn('[ErrorHandler] Not authenticated, skipping error report');
      return;
    }
    
    // Send error report to backend
    await apiFetch('/api/errors', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        trace_id: errorReport.traceId,
        message: errorReport.message,
        stack_trace: errorReport.stackTrace,
        user_context: errorReport.userContext,
        url: errorReport.url,
        user_agent: errorReport.userAgent,
      }),
    });
    
    console.log('[ErrorHandler] Error reported successfully:', errorReport.traceId);
  } catch (error) {
    // Don't create error loops
    console.error('[ErrorHandler] Failed to send error report:', error);
  }
}

/**
 * Manually report an error
 * 
 * @param {Error} error - Error to report
 * @param {string} traceId - Optional trace ID
 * @returns {Promise<void>}
 */
export async function manualReportError(error, traceId = null) {
  await handleError(error, { traceId });
}

export default {
  setupGlobalErrorHandler,
  reportError,
  manualReportError,
};
