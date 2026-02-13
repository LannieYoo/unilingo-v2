# Implementation Plan: Error Tracking System

## Overview

This implementation plan breaks down the error tracking system into incremental steps, starting with backend infrastructure (trace ID middleware, logging), then error storage and APIs, followed by frontend integration (API wrapper, error handler), and finally the admin monitoring interface. Each step builds on previous work and includes testing to validate functionality early.

## Tasks

- [x] 1. Set up backend trace ID infrastructure
  - [x] 1.1 Create trace ID middleware for Flask
    - Create `backend/common/trace_middleware.py`
    - Implement `before_request` handler to extract or generate trace_id
    - Implement `after_request` handler to add x-trace-id header
    - Store trace_id in `flask.g.trace_id`
    - Register middleware with Flask app in `backend/app.py`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 1.2 Write property test for trace ID middleware
    - **Property 1: Trace ID Generation and Preservation**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Test with random requests with/without x-trace-id header
    - Verify UUID v4 format when generated
    - Verify preservation when provided
  
  - [x] 1.3 Write property test for trace ID response header
    - **Property 2: Trace ID Response Header Propagation**
    - **Validates: Requirements 1.4**
    - Test with random requests
    - Verify x-trace-id header in all responses

- [x] 2. Implement custom logging with trace IDs
  - [x] 2.1 Create custom logger formatter
    - Create `backend/common/logger.py`
    - Implement `TraceIDFormatter` class extending `logging.Formatter`
    - Format: `[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s`
    - Get trace_id from `flask.g.trace_id` or use "NO_TRACE"
    - Implement `setup_logging()` function to configure app logging
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.2 Write property test for log formatter
    - **Property 6: Log Entry Format with Trace ID**
    - **Validates: Requirements 2.1, 2.2**
    - Test with random log messages and trace IDs
    - Verify format matches pattern
  
  - [x] 2.3 Write edge case test for missing trace ID
    - Test logging when trace_id is not in flask.g
    - Verify "NO_TRACE" is used
    - _Requirements: 2.3_

- [x] 3. Create error events database schema
  - [x] 3.1 Add error_events table to schema
    - Update `doc/supabase-schema.sql`
    - Create table with columns: id, trace_id, where_from, message, detail, created_at
    - Add CHECK constraint on where_from (frontend/backend)
    - Add indexes on trace_id and created_at
    - Update `doc/database-schema.md` documentation
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 3.2 Execute schema changes in Supabase
    - Run SQL in Supabase SQL Editor
    - Verify table and indexes created
    - _Requirements: 3.1, 3.2_

- [x] 4. Implement error events service layer
  - [x] 4.1 Create error events service
    - Create `backend/modules/errors/service.py`
    - Implement `create_error_event()` function
    - Implement `get_error_events()` with pagination and filters
    - Implement `get_error_events_by_trace_id()` function
    - Add detail size validation (10KB limit)
    - Add message length validation (1000 chars)
    - Use `common/supabase.py` for database access
    - _Requirements: 3.3, 3.5, 4.3, 10.1, 10.3, 10.4_
  
  - [x] 4.2 Write property tests for error event service
    - **Property 7: Error Detail Size Limit**
    - **Validates: Requirements 3.3, 10.1**
    - Test with random error details of various sizes
    - Verify 10KB+ are truncated
  
  - [x] 4.3 Write property test for where_from validation
    - **Property 8: Where From Validation**
    - **Validates: Requirements 3.4**
    - Test with random invalid where_from values
    - Verify rejection
  
  - [x] 4.4 Write property test for message truncation
    - **Property 22: Error Message Length Limit**
    - **Validates: Requirements 10.3, 10.4**
    - Test with random long messages
    - Verify truncation and ellipsis

- [x] 5. Checkpoint - Verify backend infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement error reporting API
  - [x] 6.1 Create error DTOs
    - Create `backend/modules/errors/dto.py`
    - Define `ErrorReportDTO` with trace_id, message, stack_trace, user_context, url, user_agent
    - Define `ErrorEventDTO` for responses
    - Use Pydantic for validation
    - _Requirements: 4.2_
  
  - [x] 6.2 Create error reporting router
    - Create `backend/modules/errors/router.py`
    - Implement POST /api/errors endpoint
    - Require authentication using `common/auth.py`
    - Call error service to store event
    - Return 201 on success, 400 on validation error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.4_
  
  - [x] 6.3 Write property tests for error reporting endpoint
    - **Property 10: Error Report Storage with Correct Source**
    - **Validates: Requirements 4.3**
    - Test with random error reports
    - Verify where_from is "frontend"
    
    - **Property 11: Error Report Success Response**
    - **Validates: Requirements 4.4**
    - Test with random valid payloads
    - Verify 201 status
    
    - **Property 12: Error Report Validation Failure Response**
    - **Validates: Requirements 4.5**
    - Test with random invalid payloads
    - Verify 400 status
    
    - **Property 23: Error Reporting Authentication**
    - **Validates: Requirements 11.4**
    - Test without authentication
    - Verify 401 status

- [x] 7. Implement admin error monitoring API
  - [x] 7.1 Add admin error endpoints to router
    - Add GET /api/admin/errors endpoint with pagination
    - Add GET /api/admin/errors/:trace_id endpoint
    - Add POST /api/admin/errors/test endpoint (trigger 500 error)
    - Require admin role using `@require_admin` decorator
    - Call error service for data retrieval
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 9.2_
  
  - [x] 7.2 Write property tests for admin endpoints
    - **Property 13: Admin Endpoint Authentication**
    - **Validates: Requirements 5.3, 11.1, 11.5**
    - Test without authentication
    - Verify 401 status
    
    - **Property 14: Admin Endpoint Authorization**
    - **Validates: Requirements 5.4, 11.2, 11.5**
    - Test with non-admin user
    - Verify 403 status
    
    - **Property 15: Error List Pagination**
    - **Validates: Requirements 5.5**
    - Test with random page/page_size values
    - Verify correct subset returned
    
    - **Property 16: Error List Sort Order**
    - **Validates: Requirements 5.6**
    - Test with random error events
    - Verify descending order by created_at

- [x] 8. Register error module with Flask app
  - [x] 8.1 Wire error router to Flask app
    - Import error router in `backend/app.py`
    - Register blueprint with app
    - Verify endpoints are accessible
    - _Requirements: 4.1, 5.1, 5.2_

- [x] 9. Checkpoint - Verify backend APIs
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement frontend API wrapper with trace IDs
  - [x] 10.1 Create apiFetch wrapper function
    - Create `frontend/src/common/api.ts`
    - Implement `apiFetch<T>()` function
    - Generate trace_id using `crypto.randomUUID()`
    - Add x-trace-id header to requests
    - Extract x-trace-id from response headers
    - Return both data and traceId
    - Handle errors and preserve trace_id
    - _Requirements: 1.5, 1.6, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 10.2 Write property tests for apiFetch
    - **Property 3: Frontend Trace ID Generation**
    - **Validates: Requirements 1.5, 6.2, 6.3**
    - Test with random API calls
    - Verify UUID v4 generation and header inclusion
    
    - **Property 4: Frontend Trace ID Extraction**
    - **Validates: Requirements 1.6, 6.4**
    - Test with random responses
    - Verify trace ID extraction
    
    - **Property 5: Trace ID Preservation in Error Handling**
    - **Validates: Requirements 6.5**
    - Test with random API errors
    - Verify trace ID preserved

- [x] 11. Implement global error handler
  - [x] 11.1 Create error handler module
    - Create `frontend/src/common/errorHandler.ts`
    - Implement `setupGlobalErrorHandler()` function
    - Listen to `window.onerror` and `window.onunhandledrejection`
    - Implement `reportError()` function
    - Extract error details (message, stack, url, user_agent)
    - Get user context from auth store
    - Call POST /api/errors with error report
    - Log trace_id to console
    - Handle error reporting failures gracefully
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 11.2 Initialize error handler in app entry point
    - Import and call `setupGlobalErrorHandler()` in `frontend/src/main.tsx`
    - Verify error handler is active
    - _Requirements: 7.1_
  
  - [x] 11.3 Write property tests for error handler
    - **Property 17: Global Error Handler Reporting**
    - **Validates: Requirements 7.2, 7.5**
    - Test with random unhandled errors
    - Verify error reports sent with correct fields
    
    - **Property 18: Error Handler Trace ID Inclusion**
    - **Validates: Requirements 7.3**
    - Test with random API errors
    - Verify trace ID in error report
    
    - **Property 19: Error Handler Console Logging**
    - **Validates: Requirements 7.4**
    - Test with random errors
    - Verify console logging

- [x] 12. Create admin error monitoring types and services
  - [x] 12.1 Add error types to common types
    - Update `frontend/src/common/types.ts`
    - Define `ErrorEvent` interface
    - Define `ErrorFilters` interface
    - _Requirements: 8.1_
  
  - [x] 12.2 Create error monitoring service
    - Create `frontend/src/modules/admin/services/errorService.ts`
    - Implement `getErrorEvents()` function with pagination and filters
    - Implement `getErrorEventsByTraceId()` function
    - Implement `triggerTestError()` function
    - Use `apiFetch` wrapper for all API calls
    - Transform snake_case to camelCase using `keysToCamel()`
    - _Requirements: 5.1, 5.2, 9.2_

- [x] 13. Create admin error monitoring hooks
  - [x] 13.1 Create error monitoring hooks
    - Create `frontend/src/modules/admin/hooks/useErrorEvents.ts`
    - Implement `useErrorEvents()` hook with pagination and filters
    - Implement `useErrorByTraceId()` hook
    - Handle loading and error states
    - _Requirements: 8.2, 8.4_

- [x] 14. Create admin error monitoring components
  - [x] 14.1 Create ErrorTable component
    - Create `frontend/src/modules/admin/components/ErrorTable.tsx`
    - Display columns: timestamp, trace_id, where_from, message
    - Make trace_id clickable
    - Use `libs/shadcn/ui/table` components
    - _Requirements: 8.2, 8.3, 8.4_
  
  - [x] 14.2 Create ErrorFilters component
    - Create `frontend/src/modules/admin/components/ErrorFilters.tsx`
    - Add date range picker
    - Add source filter (frontend/backend/all)
    - Add trace_id search input
    - Use `libs/shadcn/ui/input` and `libs/shadcn/ui/select` components
    - _Requirements: 8.5, 8.6_
  
  - [x] 14.3 Create ErrorDetailModal component
    - Create `frontend/src/modules/admin/components/ErrorDetailModal.tsx`
    - Display all error events for a trace_id
    - Show full error details including stack trace
    - Use `libs/shadcn/ui/dialog` component
    - _Requirements: 8.4_
  
  - [x] 14.4 Create TestErrorButton component
    - Create `frontend/src/modules/admin/components/TestErrorButton.tsx`
    - Call `triggerTestError()` on click
    - Display trace_id in console
    - Show success/error toast
    - Use `libs/shadcn/ui/button` component
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 15. Create admin error monitoring view
  - [x] 15.1 Create ErrorMonitoringView
    - Create `frontend/src/modules/admin/views/ErrorMonitoringView.tsx`
    - Use `useErrorEvents()` hook
    - Render ErrorFilters, ErrorTable, TestErrorButton
    - Handle trace_id click to open ErrorDetailModal
    - Add pagination controls
    - Require admin authentication
    - _Requirements: 8.1, 8.2, 8.7, 11.3_
  
  - [x] 15.2 Add route for error monitoring page
    - Update admin router configuration
    - Add route: `/admin/errors`
    - Require admin role
    - _Requirements: 8.1_
  
  - [x] 15.3 Write property test for non-admin access
    - **Property 20: Non-Admin Access Redirect**
    - **Validates: Requirements 8.7, 11.3**
    - Test with random non-admin users
    - Verify redirect to home page

- [x] 16. Checkpoint - Verify frontend integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Integration testing and verification
  - [x] 17.1 Write end-to-end trace ID flow test
    - Make frontend API request
    - Verify trace ID in request header
    - Verify trace ID in backend logs
    - Verify trace ID in response header
    - Verify trace ID matches throughout
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [x] 17.2 Write error reporting flow test
    - Trigger frontend error
    - Verify error report sent to backend
    - Verify error stored in database
    - Verify error appears in admin interface
    - Verify trace ID correlation
    - _Requirements: 4.3, 7.2, 8.2_
  
  - [x] 17.3 Write test error button integration test
    - Click test error button
    - Verify 500 error triggered
    - Verify trace ID in console
    - Verify trace ID in backend logs
    - Verify error in admin interface within 5 seconds
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Backend uses Flask (not FastAPI) - adjust middleware accordingly
- Frontend uses existing auth system for access control
- All database changes must update both `supabase-schema.sql` and `database-schema.md`
