/**
 * Common Types
 * Shared type definitions across the application
 */

/**
 * Error Event
 * @typedef {Object} ErrorEvent
 * @property {string} id - Error event ID
 * @property {string} traceId - Trace ID
 * @property {'frontend' | 'backend'} whereFrom - Error source
 * @property {string} message - Error message
 * @property {Object} detail - Error details
 * @property {string} detail.stackTrace - Stack trace
 * @property {Object} detail.userContext - User context
 * @property {string} detail.url - URL where error occurred
 * @property {string} detail.userAgent - User agent
 * @property {string} createdAt - ISO timestamp
 */

/**
 * Error Filters
 * @typedef {Object} ErrorFilters
 * @property {'frontend' | 'backend' | null} whereFrom - Filter by source
 * @property {string | null} startDate - Start date (ISO format)
 * @property {string | null} endDate - End date (ISO format)
 * @property {string | null} traceId - Filter by trace ID
 */

/**
 * Paginated Error Response
 * @typedef {Object} PaginatedErrorResponse
 * @property {ErrorEvent[]} data - Error events
 * @property {number} total - Total count
 * @property {number} page - Current page
 * @property {number} pageSize - Page size
 */

/**
 * Approval Status
 * @typedef {Object} ApprovalStatus
 * @property {boolean} isApproved - Whether user is approved
 * @property {boolean} isActive - Whether user account is active
 * @property {boolean} isPending - Whether user is pending approval
 * @property {boolean} canAccessFeatures - Whether user can access features
 */

// Export empty object to make this a module
export {};
