# Implementation Plan: Usage Limit Tracking System

## Overview

This implementation plan breaks down the usage limit tracking system into incremental coding tasks. The system will track character usage for translation and STT features, enforce limits based on user subscription levels, and provide visual feedback through a frontend component. Tasks are organized to build core functionality first, then add testing, and finally integrate all components.

## Tasks

- [x] 1. Set up database schema and configuration
  - Create usage_logs table in Supabase with all required columns and constraints
  - Add USAGE_LIMITS configuration to backend config.py
  - Update doc/supabase-schema.sql with new table definition
  - Update doc/database-schema.md with usage_logs documentation
  - _Requirements: 6.1, 6.3, 6.5_

- [x] 2. Implement backend usage service layer
  - [x] 2.1 Create usage service module structure
    - Create backend/src/common/modules/usage/ directory
    - Create __init__.py, service.py, router.py, dto.py files
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement usage DTO models
    - Create UsageResponse model with all required fields
    - Create TrackUsageRequest model with validation
    - _Requirements: 5.2, 5.3_

  - [x] 2.3 Implement core usage service methods
    - Implement get_monthly_limit() to return limits by user level
    - Implement get_current_month() to return YYYY-MM format
    - Implement calculate_total_usage() and calculate_percentage()
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 2.4 Implement get_current_usage() method
    - Query usage_logs table for current month
    - Handle case when no record exists (return zeros)
    - Calculate total and percentage
    - Return complete usage data
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 2.5 Implement track_usage() method with upsert logic
    - Use INSERT ... ON CONFLICT UPDATE for concurrent safety
    - Handle both translation and STT usage types
    - Create new record with zero initial values if needed
    - Increment appropriate counter (translation_chars or stt_chars)
    - Update updated_at timestamp
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 6.2, 6.4_

  - [x] 2.6 Implement check_limit() method
    - Get current usage for user
    - Get monthly limit for user level
    - Check if current + new usage would exceed limit
    - Return (can_proceed, error_message) tuple
    - Allow unlimited for admin users
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [ ] 2.7 Write property test for usage tracking completeness
    - **Property 1: Usage Tracking Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ] 2.8 Write property test for counter separation invariant
    - **Property 2: Counter Separation Invariant**
    - **Validates: Requirements 1.3**

  - [ ] 2.9 Write property test for combined limit calculation
    - **Property 6: Combined Limit Calculation**
    - **Validates: Requirements 2.5**

  - [ ] 2.10 Write property test for concurrent request safety
    - **Property 16: Concurrent Request Safety**
    - **Validates: Requirements 6.2**

  - [ ] 2.11 Write unit tests for service layer
    - Test get_monthly_limit() for all user levels
    - Test boundary conditions (exactly at limit, one over, one under)
    - Test calculate_percentage() with zero limit
    - Test new user returns zero values

- [-] 3. Implement backend API endpoints
  - [x] 3.1 Create usage router with GET /api/usage/current endpoint
    - Add authentication dependency
    - Call service.get_current_usage()
    - Return success_response with usage data
    - Include trace_id in response
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Create POST /api/usage/track endpoint
    - Validate request body with TrackUsageRequest DTO
    - Call service.track_usage()
    - Return success_response
    - Include trace_id in response
    - _Requirements: 1.1, 1.2_

  - [x] 3.3 Register usage router in main application
    - Import and include usage router in backend/src/main.py
    - _Requirements: 5.1_

  - [ ] 3.4 Write property test for API response completeness
    - **Property 15: API Response Completeness**
    - **Validates: Requirements 5.2, 5.3**

  - [ ] 3.5 Write unit tests for API endpoints
    - Test 401 for unauthenticated requests
    - Test validation errors for invalid usage_type
    - Test validation errors for negative char_count

- [ ] 4. Checkpoint - Ensure backend tests pass
  - Run pytest for all usage module tests
  - Verify database operations work correctly
  - Ask the user if questions arise

- [-] 5. Implement usage middleware for limit enforcement
  - [x] 5.1 Create usage_middleware.py with UsageMiddleware class
    - Identify translation and STT endpoints
    - Extract character count from request body
    - Get current user from request
    - Call service.check_limit() before processing
    - Return 429 error if limit exceeded
    - Allow request to proceed if within limit
    - _Requirements: 2.6, 2.7_

  - [x] 5.2 Register middleware in main application
    - Add UsageMiddleware to backend/src/main.py
    - Configure to run before request processing
    - _Requirements: 2.6_

  - [ ] 5.3 Write property test for admin unlimited access
    - **Property 5: Admin Unlimited Access**
    - **Validates: Requirements 2.4**

  - [ ] 5.4 Write property test for pre-processing limit enforcement
    - **Property 7: Pre-Processing Limit Enforcement**
    - **Validates: Requirements 2.6**

  - [ ] 5.5 Write unit tests for middleware
    - Test middleware allows admin requests regardless of usage
    - Test middleware blocks at 90% threshold
    - Test middleware blocks at 100% threshold
    - Test middleware allows requests below threshold

- [-] 6. Implement frontend usage service
  - [x] 6.1 Create usageService.js with API methods
    - Implement getCurrentUsage() to call GET /api/usage/current
    - Implement trackUsage() to call POST /api/usage/track
    - Use keysToCamel() for response transformation
    - Handle errors with trace_id logging
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 Write unit tests for usage service
    - Test API calls with correct endpoints
    - Test error handling with trace_id
    - Test response transformation

- [-] 7. Implement frontend usage hook
  - [x] 7.1 Create useUsage.js custom hook
    - Implement state management for usage data
    - Implement fetchUsage() to call usageService.getCurrentUsage()
    - Implement trackUsage() to call usageService.trackUsage() and update local state
    - Implement checkLimit() to verify if request would exceed limit
    - Return usage, loading, and methods
    - _Requirements: 3.8, 5.1_

  - [ ] 7.2 Write unit tests for usage hook
    - Test state updates after fetchUsage()
    - Test state updates after trackUsage()
    - Test checkLimit() returns correct boolean

- [-] 8. Implement UsageIndicator component
  - [x] 8.1 Create UsageIndicator.jsx component structure
    - Accept usageType and onLimitExceeded props
    - Use useUsage hook to fetch and manage usage data
    - Fetch usage on component mount
    - _Requirements: 3.1, 3.2_

  - [x] 8.2 Implement usage display rendering
    - Render "Used: X / Y characters (Z%)" for non-admin users
    - Render "Used: X characters (Unlimited)" for admin users
    - Display current user level
    - _Requirements: 3.3, 3.4, 4.4_

  - [x] 8.3 Implement color-coded visual feedback
    - Apply green color when usage < 70%
    - Apply yellow color when usage 70-90%
    - Apply red color when usage ≥ 90%
    - Use Tailwind CSS classes for styling
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 8.4 Implement warning modal at 90% threshold
    - Show warning modal when usage reaches 90%
    - Display current usage and limit
    - Show upgrade options
    - _Requirements: 4.1, 4.4_

  - [x] 8.5 Implement blocking modal at 100% threshold
    - Show blocking modal when usage exceeds 100%
    - Prevent new requests by calling onLimitExceeded callback
    - Display upgrade message for guest users
    - Show user level and upgrade options
    - _Requirements: 4.2, 4.3, 4.4, 8.4_

  - [ ] 8.6 Write property test for color coding by percentage
    - **Property 11: Color Coding by Percentage**
    - **Validates: Requirements 3.5, 3.6, 3.7**

  - [ ] 8.7 Write property test for usage display completeness
    - **Property 8: Usage Display Completeness**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 8.8 Write unit tests for UsageIndicator component
    - Test renders "Unlimited" for admin users
    - Test shows upgrade message for guest users at limit
    - Test warning modal appears at 90%
    - Test blocking modal appears at 100%
    - Test color changes at thresholds

- [x] 9. Integrate UsageIndicator into translation page
  - [x] 9.1 Add UsageIndicator to translator view
    - Import UsageIndicator component
    - Add to translator page layout
    - Pass usageType="translation" prop
    - Implement onLimitExceeded callback to disable translation button
    - _Requirements: 3.1, 4.3_

  - [x] 9.2 Update translation flow to track usage
    - After successful translation, call trackUsage() with character count
    - Update UsageIndicator state
    - _Requirements: 1.1, 3.8_

- [x] 10. Integrate UsageIndicator into STT page
  - [x] 10.1 Add UsageIndicator to STT view
    - Import UsageIndicator component
    - Add to STT page layout
    - Pass usageType="stt" prop
    - Implement onLimitExceeded callback to disable STT recording
    - _Requirements: 3.2, 4.3_

  - [x] 10.2 Update STT flow to track usage
    - After successful STT processing, call trackUsage() with character count
    - Update UsageIndicator state
    - _Requirements: 1.2, 3.8_

- [ ] 11. Implement guest user handling
  - [ ] 11.1 Add guest user identification logic
    - Create consistent session identifier for guest users
    - Store in localStorage or session storage
    - _Requirements: 8.3_

  - [ ] 11.2 Apply guest limits in backend
    - Detect guest users in middleware
    - Apply 5,000 character limit
    - Track guest usage separately
    - _Requirements: 8.1, 8.2_

  - [ ] 11.3 Write property test for guest user limit application
    - **Property 20: Guest User Limit Application**
    - **Validates: Requirements 8.1**

  - [ ] 11.4 Write property test for guest user isolation
    - **Property 21: Guest User Isolation**
    - **Validates: Requirements 8.2, 8.3**

  - [ ] 11.5 Write integration test for guest user flow
    - Test guest user can make requests up to 5,000 characters
    - Test blocking at limit
    - Test upgrade message shown

- [-] 12. Implement monthly reset logic
  - [x] 12.1 Add monthly isolation to usage queries
    - Ensure get_current_usage() only returns current month data
    - Ensure check_limit() only considers current month
    - _Requirements: 7.2, 7.4_

  - [x] 12.2 Verify historical data preservation
    - Ensure old month records are not deleted
    - Ensure new month starts with zero usage
    - _Requirements: 7.1, 7.3_

  - [ ] 12.3 Write property test for monthly isolation
    - **Property 18: Monthly Isolation**
    - **Validates: Requirements 7.2, 7.4**

  - [ ] 12.4 Write property test for historical data preservation
    - **Property 19: Historical Data Preservation**
    - **Validates: Requirements 7.3**

  - [ ] 12.5 Write integration test for monthly reset
    - Test usage in month M1 doesn't affect M2
    - Test M2 starts with zero
    - Test M1 data still exists

- [x] 13. Add error handling and logging
  - [x] 13.1 Implement error responses with trace_id
    - Add 429 error for limit exceeded
    - Add 400 error for invalid usage_type
    - Add 503 error for database failures
    - Include trace_id in all error responses
    - _Requirements: Error Handling section_

  - [x] 13.2 Add logging for usage operations
    - Log usage tracking operations with trace_id
    - Log limit enforcement decisions
    - Log errors with trace_id
    - _Requirements: Error Handling section_

  - [x] 13.3 Implement frontend error handling
    - Display user-friendly error messages
    - Show trace_id for support
    - Implement retry logic for transient errors
    - _Requirements: Error Handling section_

- [x] 14. Add usage monitoring to Admin page
  - [x] 14.1 Create UsageMonitoringPanel component
    - Display system-wide usage statistics
    - Show top users by usage
    - Show usage trends by month
    - _Requirements: Observability standards_

  - [x] 14.2 Add UsageMonitoringPanel to Admin view
    - Add new tab to AdminView.jsx
    - Integrate UsageMonitoringPanel component
    - _Requirements: Observability standards_

- [x] 15. Add health check for usage tracking
  - [x] 15.1 Create check_usage_tracking() function
    - Test database connectivity for usage_logs table
    - Test basic query performance
    - Return CheckResult with latency
    - _Requirements: Observability standards_

  - [x] 15.2 Integrate into health check service
    - Add to perform_health_check() in backend/src/common/modules/health/service.py
    - _Requirements: Observability standards_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Run all backend tests (pytest)
  - Run all frontend tests (npm test or pnpm test)
  - Verify integration between frontend and backend
  - Test end-to-end flow: create user → make requests → reach limit → verify blocking
  - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- Follow observability standards: include trace_id in all responses and logs
- Follow database management rules: update schema documentation files
- Use existing patterns from error-tracking and health-check features
