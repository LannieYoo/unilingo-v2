# Implementation Plan: Health Check Enhancement

## Overview

This plan implements comprehensive health check monitoring for database, external APIs, and cache systems with latency measurements and admin dashboard visualization. The implementation follows the existing Flask patterns and integrates with the current admin interface.

## Tasks

- [x] 1. Enhance backend health check service with new check functions
  - [x] 1.1 Implement database connectivity check
    - Add `check_database()` function that executes `SELECT 1` query
    - Measure and return latency in milliseconds
    - Handle connection timeouts (5 seconds)
    - Return CheckResult with ok status and latency_ms
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 1.2 Write property test for database check
    - **Property 3: Successful check result structure**
    - **Validates: Requirements 2.2, 2.4**
  
  - [x] 1.3 Implement external API checks
    - Add `check_external_api()` function for Translation and Dictionary APIs
    - Use HEAD requests or minimal payloads to avoid costs
    - Set timeout to 3 seconds
    - Measure and return latency in milliseconds
    - Return CheckResult for each API
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 1.4 Write property test for external API checks
    - **Property 3: Successful check result structure**
    - **Property 4: Failed check result structure**
    - **Validates: Requirements 3.3, 3.4**
  
  - [x] 1.5 Implement cache connectivity check
    - Add `check_cache()` function
    - Try Redis PING command first
    - Fall back to dictionary_cache table query if Redis unavailable
    - Measure and return latency in milliseconds
    - Include cache method in result details
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ] 1.6 Write property test for cache check fallback
    - **Property 6: Cache check method selection**
    - **Validates: Requirements 3.2, 3.3**

- [x] 2. Update health check service orchestration
  - [x] 2.1 Implement parallel check execution
    - Create `perform_health_check()` function
    - Execute all checks (db, translation_api, dictionary_api, cache)
    - Use try-except to ensure individual failures don't stop other checks
    - Aggregate all check results
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 2.2 Write property test for resilient execution
    - **Property 5: Resilient execution**
    - **Validates: Requirements 1.5, 2.6, 3.7, 5.1**
  
  - [x] 2.3 Implement overall status determination
    - Add `determine_overall_status()` function
    - Return "ok" when all checks pass
    - Return "degraded" when any check fails
    - _Requirements: 4.2, 4.3_
  
  - [ ] 2.4 Write property test for status determination
    - **Property 2: Overall status determination**
    - **Validates: Requirements 1.2, 1.3, 1.4**

- [x] 3. Update health check DTOs and response format
  - [x] 3.1 Create CheckResult data model
    - Add CheckResult TypedDict with ok, latency_ms, error fields
    - Add optional details field for additional information
    - _Requirements: 4.5_
  
  - [x] 3.2 Update HealthCheckResponse data model
    - Update response structure with status, time, checks, trace_id
    - Ensure time field uses ISO 8601 format
    - Include all check types in checks dictionary
    - _Requirements: 4.1, 4.4_
  
  - [ ] 3.3 Write property test for response structure
    - **Property 1: Health check response structure**
    - **Property 9: Timestamp format validation**
    - **Validates: Requirements 1.1, 1.5, 1.6, 4.4**

- [x] 4. Update health check router endpoint
  - [x] 4.1 Enhance /api/health endpoint
    - Update route to call new `perform_health_check()` function
    - Return structured JSON response with all check results
    - Always return HTTP 200 (never 500 for check failures)
    - Include trace_id in response
    - Add comprehensive error handling
    - _Requirements: 5.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 4.2 Write property test for HTTP status codes
    - **Property 5: HTTP status code mapping**
    - **Property 13: No 500 errors for check failures**
    - **Validates: Requirements 5.4, 7.2, 7.3, 7.4**
  
  - [x] 4.3 Write unit tests for router endpoint
    - Test endpoint with all checks passing
    - Test endpoint with database failure
    - Test endpoint with external API failures
    - Test endpoint with cache failure
    - Test response format and status codes

- [x] 5. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add health check API call to frontend auth service
  - [x] 6.1 Add getHealthCheck function
    - Add function to `frontend/src/modules/auth/_06_services/service.js`
    - Make GET request to `/api/health`
    - Include authorization header with access token
    - Use keysToCamel to convert response
    - _Requirements: 6.1_

- [x] 7. Create HealthCheckPanel component
  - [x] 7.1 Create component file
    - Create `frontend/src/modules/admin/_01_components/HealthCheckPanel.jsx`
    - Accept healthData and onRefresh props
    - Display overall status with color indicator (green for "ok", yellow for "degraded")
    - _Requirements: 6.2_
  
  - [x] 7.2 Implement individual check cards
    - Display each check (db, translation_api, dictionary_api, cache)
    - Show OK/FAIL badge with appropriate colors
    - Display latency in milliseconds with color coding
    - Show error messages for failed checks
    - _Requirements: 6.3, 6.4, 6.6_
  
  - [x] 7.3 Add refresh functionality
    - Add refresh button that calls onRefresh prop
    - Show loading state during refresh
    - Display last checked timestamp
    - _Requirements: 6.5_
  
  - [ ] 7.4 Write component tests
    - Test component renders with successful checks
    - Test component renders with failed checks
    - Test refresh button triggers callback
    - Test error display

- [x] 8. Integrate health check into AdminView
  - [x] 8.1 Add health check tab
    - Add "헬스체크" tab button to AdminView
    - Add tab state management
    - _Requirements: 6.1_
  
  - [x] 8.2 Add health check data fetching
    - Add fetchHealthCheck function using authService
    - Add healthData state
    - Fetch health check data when tab is selected
    - Handle loading and error states
    - _Requirements: 6.2_
  
  - [x] 8.3 Render HealthCheckPanel in tab content
    - Render HealthCheckPanel when health tab is active
    - Pass healthData and fetchHealthCheck as props
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Add comprehensive error handling and logging
  - [x] 9.1 Add error handling wrappers
    - Create `safe_check()` wrapper function for all checks
    - Ensure exceptions are caught and converted to CheckResult
    - Log all check failures with trace_id
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [x] 9.2 Add timeout handling
    - Implement timeout for each check (5 seconds for DB, 3 seconds for APIs)
    - Mark timed-out checks as failed
    - Continue with other checks after timeout
    - _Requirements: 5.3, 6.3_
  
  - [ ] 9.3 Write property test for error resilience
    - **Property 6: Error resilience**
    - **Validates: Requirements 6.5**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Backend uses Flask framework (not FastAPI)
- Frontend follows existing admin panel patterns
- Health checks execute in parallel where possible to minimize response time
- Individual check failures don't prevent other checks from running
