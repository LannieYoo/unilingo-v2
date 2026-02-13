# Implementation Plan: User Approval UI Clarity

## Overview

This implementation plan breaks down the user approval UI clarity feature into incremental coding tasks. The approach follows the existing project architecture with React + TypeScript frontend and FastAPI + Python backend. Tasks are organized to deliver core functionality first, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Add approval status to JWT token and auth context
  - Modify `backend/src/common/auth.py` to include `is_approved` field in JWT token payload
  - Update frontend auth context to store and expose `is_approved` status
  - Ensure token refresh updates approval status
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 2. Create frontend approval status utilities
  - [x] 2.1 Add approval status types to `common/types.ts`
    - Define `ApprovalStatus` interface with `isApproved`, `isActive`, `isPending`, `canAccessFeatures`
    - _Requirements: 7.1_
  
  - [x] 2.2 Create `useApprovalStatus` hook in `common/hooks/`
    - Implement hook that reads approval status from auth context
    - Add caching to prevent repeated checks
    - Return `ApprovalStatus` object
    - _Requirements: 7.1, 7.4, 7.5_
  
  - [ ] 2.3 Write property test for approval status hook
    - **Property 15: Frontend Approval Status Check**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [ ] 3. Create approval status UI components
  - [x] 3.1 Create `ApprovalStatusBadge` component in `common/components/`
    - Display "Approved" (green), "Pending Approval" (yellow), or "Inactive" (gray) badge
    - Support size variants (sm, md, lg)
    - Add tooltip with status explanation
    - _Requirements: 1.1, 4.1, 4.2_
  
  - [x] 3.2 Create `PendingApprovalMessage` component in `common/components/`
    - Display informational message explaining pending status
    - Include what users can/cannot do while pending
    - Include instructions on how to get approved
    - Support banner, modal, and inline variants
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 3.3 Write property test for pending user UI rendering
    - **Property 1: Pending User UI Rendering**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [ ] 4. Implement feature access restrictions in frontend
  - [ ] 4.1 Create feature access guard component
    - Check approval status using `useApprovalStatus` hook
    - Block access and show `PendingApprovalMessage` for unapproved users
    - Allow access for approved users
    - _Requirements: 2.1, 2.4_
  
  - [ ] 4.2 Add consistent error messaging for restricted features
    - Define error message constants in `common/enum.ts`
    - Ensure all restriction messages follow same format
    - _Requirements: 2.2, 2.3, 2.5_
  
  - [ ] 4.3 Write property tests for feature access restriction
    - **Property 2: Feature Access Restriction**
    - **Property 3: Restricted Page Navigation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ] 5. Create backend approval validation decorator
  - [x] 5.1 Add `@require_approval` decorator in `backend/src/common/decorators.py`
    - Check user's `is_approved` status from JWT
    - Return 403 with descriptive message if not approved
    - Log unauthorized access attempts
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 5.2 Write property tests for backend approval validation
    - **Property 17: Backend Approval Validation**
    - **Property 18: Profile Endpoint Access**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5**

- [ ] 6. Checkpoint - Ensure basic approval flow works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Create admin approval service and endpoints
  - [x] 7.1 Create approval service in `backend/src/modules/admin/service.py`
    - Implement `get_pending_users()` to fetch users with `is_approved=False`
    - Implement `approve_user(user_id, admin_id)` to set `is_approved=True`
    - Implement `bulk_approve_users(user_ids, admin_id)` for bulk approval
    - Create approval log entries with timestamp and admin ID
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 7.2 Create approval DTOs in `backend/src/modules/admin/dto.py`
    - Define `PendingUserDTO` with id, email, created_at, user_level, is_approved
    - Define `BulkApproveRequestDTO` with user_ids list
    - _Requirements: 3.2_
  
  - [x] 7.3 Create approval endpoints in `backend/src/modules/admin/router.py`
    - GET `/api/admin/users/pending` - returns list of pending users
    - POST `/api/admin/users/{user_id}/approve` - approves single user
    - POST `/api/admin/users/bulk-approve` - approves multiple users
    - All endpoints require admin authentication
    - _Requirements: 3.1, 3.3, 3.5_
  
  - [ ] 7.4 Write property tests for approval operations
    - **Property 5: User Approval State Transition**
    - **Property 6: Approval Action Logging**
    - **Property 7: Bulk Approval**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6**

- [ ] 8. Create frontend approval service
  - [x] 8.1 Create `approvalService.js` in `common/services/`
    - Implement `getPendingUsers()` API call
    - Implement `approveUser(userId)` API call
    - Implement `bulkApproveUsers(userIds)` API call
    - Transform responses with `keysToCamel()`
    - _Requirements: 3.1, 3.3, 3.5_

- [ ] 9. Create admin pending users panel
  - [x] 9.1 Create `PendingUsersPanel` component in `modules/admin/components/`
    - Display table of pending users with email, registration date, status
    - Add approve button for each user
    - Add bulk selection checkboxes
    - Add bulk approve button
    - Handle loading and error states
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 9.2 Integrate panel into admin view
    - Add new tab or section in admin dashboard
    - Wire up approval service calls
    - Show success/error notifications
    - _Requirements: 3.1_
  
  - [ ] 9.3 Write property test for admin panel display
    - **Property 4: Admin Panel Pending Users Display**
    - **Validates: Requirements 3.1, 3.2**

- [-] 10. Implement admin auto-approval logic
  - [x] 10.1 Update user creation logic in backend
    - When creating user with `user_level='admin'`, set `is_approved=True`
    - _Requirements: 5.1_
  
  - [x] 10.2 Update user level change logic in backend
    - When changing `user_level` to 'admin', set `is_approved=True`
    - _Requirements: 5.2_
  
  - [x] 10.3 Ensure admin users don't see pending UI
    - Update frontend components to skip pending messages for admins
    - _Requirements: 5.3, 5.4_
  
  - [ ] 10.4 Write property test for admin auto-approval
    - **Property 11: Admin Auto-Approval**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 11. Implement account status vs approval status distinction
  - [x] 11.1 Update UI to show both statuses separately
    - Display account status (active/inactive) badge
    - Display approval status (pending/approved) badge
    - Add explanatory text about what each status controls
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 11.2 Implement inactive account login prevention
    - Ensure backend blocks login for `is_active=False` users
    - Show appropriate error message
    - _Requirements: 4.4_
  
  - [x] 11.3 Implement active unapproved user flow
    - Allow login for `is_active=True, is_approved=False` users
    - Block feature access but allow profile/settings
    - _Requirements: 4.5_
  
  - [ ] 11.4 Write property tests for status distinction
    - **Property 8: Status Distinction in UI**
    - **Property 9: Inactive Account Login Prevention**
    - **Property 10: Active Unapproved User Access**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 12. Checkpoint - Ensure admin approval workflow works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement approval notifications
  - [ ] 13.1 Create notification on approval status change
    - When user is approved, create notification record
    - _Requirements: 6.1_
  
  - [ ] 13.2 Display welcome message on first login after approval
    - Check if user was recently approved
    - Show welcome message with "full access" information
    - _Requirements: 6.2, 6.3_
  
  - [ ] 13.3 Clear pending UI elements for approved users
    - Remove pending badges and messages
    - Show full feature access
    - _Requirements: 6.4_
  
  - [ ] 13.4 Write property tests for approval notifications
    - **Property 12: Approval Notification Creation**
    - **Property 13: Approved User UI State**
    - **Property 14: Welcome Message Content**
    - **Validates: Requirements 6.1, 6.3, 6.4**

- [ ] 14. Update database schema documentation
  - [ ] 14.1 Update `doc/supabase-schema.sql`
    - Add approval_logs table definition if needed
    - Document is_approved field usage
    - _Requirements: 3.4_
  
  - [ ] 14.2 Update `doc/database-schema.md`
    - Document approval status fields
    - Document approval_logs table
    - Explain approval workflow
    - _Requirements: 3.4_

- [ ] 15. Add observability for approval operations
  - [ ] 15.1 Add trace_id to approval endpoints
    - Include trace_id in all approval API responses
    - Log approval operations with trace_id
    - _Requirements: 3.4, 8.4_
  
  - [ ] 15.2 Add approval metrics to health check (optional)
    - Track pending user count
    - Track approval rate
    - _Requirements: 3.1_

- [ ] 16. Final integration and testing
  - [ ] 16.1 Test complete approval flow end-to-end
    - Create pending user → Login → See pending UI → Admin approves → User sees approved UI
    - _Requirements: All_
  
  - [ ] 16.2 Test edge cases
    - Inactive approved user cannot login
    - Active unapproved user can login but not use features
    - Admin user is auto-approved
    - Bulk approval works for multiple users
    - _Requirements: 4.4, 4.5, 5.1, 3.5_
  
  - [ ] 16.3 Write integration tests
    - Test full approval workflow
    - Test status synchronization between frontend and backend
    - Test multi-admin approval scenarios
    - _Requirements: All_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow coding standards from `.kiro/steering/coding-standards.md`
- Update database schema documentation per `.kiro/steering/database-management.md`
- Add observability per `.kiro/steering/observability-standards.md`
