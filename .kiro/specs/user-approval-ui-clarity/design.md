# Design Document: User Approval UI Clarity

## Overview

This design improves the user experience around approval status by providing clear, informative UI messaging and a streamlined admin approval workflow. The solution addresses the confusion between account status (active/inactive) and approval status (pending/approved) by implementing distinct visual indicators, informative messages, and backend validation.

The design follows the existing architecture patterns:
- Frontend: React components with hooks for state management
- Backend: FastAPI endpoints with service layer for business logic
- Database: Supabase with existing users table (is_approved, is_active fields)
- Authentication: JWT tokens with user metadata

## Architecture

### Component Structure

```
Frontend:
├── common/components/
│   ├── ApprovalStatusBadge.jsx       # Visual status indicator
│   └── PendingApprovalMessage.jsx    # Informational message component
├── common/hooks/
│   └── useApprovalStatus.js          # Hook for checking approval status
├── common/services/
│   └── approvalService.js            # API calls for approval operations
├── modules/admin/components/
│   └── PendingUsersPanel.jsx         # Admin panel for user approval
└── modules/member/views/
    └── PendingApprovalView.jsx       # Full-page status explanation

Backend:
├── common/
│   ├── auth.py                       # Add approval status to JWT
│   └── decorators.py                 # Add @require_approval decorator
└── modules/admin/
    ├── router.py                     # Approval endpoints
    └── service.py                    # Approval business logic
```

### Data Flow

1. **User Login**: Backend includes `is_approved` in JWT token
2. **Frontend Check**: Components use `useApprovalStatus()` hook to check status
3. **Feature Access**: Protected routes/components check approval before rendering
4. **Admin Approval**: Admin clicks approve → API call → Database update → User notified
5. **Status Update**: User refreshes token or re-logs in to get updated status

## Components and Interfaces

### Frontend Components

#### ApprovalStatusBadge

```typescript
interface ApprovalStatusBadgeProps {
  isApproved: boolean;
  isActive: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

// Displays:
// - "Approved" badge (green) when is_approved=true
// - "Pending Approval" badge (yellow) when is_approved=false
// - "Inactive" badge (gray) when is_active=false
```

#### PendingApprovalMessage

```typescript
interface PendingApprovalMessageProps {
  variant?: 'banner' | 'modal' | 'inline';
  showInstructions?: boolean;
  onContactAdmin?: () => void;
}

// Displays informational message explaining:
// - What pending approval means
// - What users can/cannot do
// - How to get approved
```

#### PendingUsersPanel

```typescript
interface PendingUser {
  id: string;
  email: string;
  createdAt: string;
  userLevel: string;
  isApproved: boolean;
}

interface PendingUsersPanelProps {
  onApprove: (userId: string) => Promise<void>;
  onBulkApprove: (userIds: string[]) => Promise<void>;
}

// Admin panel showing:
// - List of pending users
// - Approve button per user
// - Bulk approve checkbox + button
// - Filter/search functionality
```

### Frontend Hooks

#### useApprovalStatus

```typescript
interface ApprovalStatus {
  isApproved: boolean;
  isActive: boolean;
  isPending: boolean;
  canAccessFeatures: boolean;
}

function useApprovalStatus(): ApprovalStatus {
  // Returns current user's approval status from auth context
  // Cached to avoid repeated checks
}
```

### Frontend Services

#### approvalService

```typescript
interface ApprovalService {
  // Get list of pending users (admin only)
  getPendingUsers(): Promise<PendingUser[]>;
  
  // Approve a single user (admin only)
  approveUser(userId: string): Promise<void>;
  
  // Approve multiple users (admin only)
  bulkApproveUsers(userIds: string[]): Promise<void>;
  
  // Check if current user is approved
  checkApprovalStatus(): Promise<boolean>;
}
```

### Backend Endpoints

#### GET /api/admin/users/pending

```python
# Returns list of users with is_approved=False
# Admin only
# Response: List[UserDTO]
```

#### POST /api/admin/users/{user_id}/approve

```python
# Sets is_approved=True for specified user
# Admin only
# Logs approval action
# Response: success_response()
```

#### POST /api/admin/users/bulk-approve

```python
# Request body: { user_ids: List[str] }
# Sets is_approved=True for all specified users
# Admin only
# Logs bulk approval action
# Response: success_response(approved_count=N)
```

### Backend Decorators

#### @require_approval

```python
def require_approval(func):
    """
    Decorator to check if user is approved before allowing access.
    Returns 403 if user is not approved.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user.is_approved:
            raise AppError(
                "APPROVAL_REQUIRED",
                "Your account is pending approval. Please contact an administrator.",
                403
            )
        return await func(*args, **kwargs)
    return wrapper
```

## Data Models

### User Model (Existing)

```python
class User:
    id: UUID
    email: str
    user_level: str  # 'admin' | 'pro' | 'free'
    is_active: bool  # Controls login ability
    is_approved: bool  # Controls feature access
    created_at: datetime
    updated_at: datetime
```

### JWT Token Payload (Enhanced)

```python
class TokenPayload:
    user_id: UUID
    email: str
    user_level: str
    is_active: bool
    is_approved: bool  # Add this field
    exp: int
```

### Approval Log (New)

```python
class ApprovalLog:
    id: UUID
    user_id: UUID  # User who was approved
    approved_by: UUID  # Admin who approved
    approved_at: datetime
    notes: Optional[str]
```

### Frontend User Context (Enhanced)

```typescript
interface UserContext {
  id: string;
  email: string;
  userLevel: string;
  isActive: boolean;
  isApproved: boolean;  // Add this field
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Pending User UI Rendering

*For any* user with is_approved=False and is_active=True, when the UI is rendered, it should display a "Pending Approval" badge and an informational message that includes: what pending means, what users can/cannot do, and how to get approved.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Feature Access Restriction

*For any* pending user (is_approved=False) and any restricted feature, attempting to access that feature should be blocked and return a consistent error message explaining that approval is required and how to get approved.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 3: Restricted Page Navigation

*For any* pending user navigating to a restricted page, the system should either redirect to a status explanation page or display an overlay message preventing access.

**Validates: Requirements 2.4**

### Property 4: Admin Panel Pending Users Display

*For any* set of pending users in the database, when an admin views the admin panel, all pending users should appear in the list with their email, registration date, and current status displayed.

**Validates: Requirements 3.1, 3.2**

### Property 5: User Approval State Transition

*For any* pending user, when an admin approves that user, the user's is_approved field should immediately become True in the database, and the UI should reflect this change.

**Validates: Requirements 3.3, 3.6**

### Property 6: Approval Action Logging

*For any* approval action (single or bulk), the system should create a log entry containing the approved user ID(s), approving admin ID, and timestamp.

**Validates: Requirements 3.4, 8.4**

### Property 7: Bulk Approval

*For any* set of pending users, when an admin performs bulk approval, all users in the set should have is_approved=True after the operation completes.

**Validates: Requirements 3.5**

### Property 8: Status Distinction in UI

*For any* user, the UI should display account status (is_active) and approval status (is_approved) as separate, visually distinct indicators with explanatory text about what each status controls.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 9: Inactive Account Login Prevention

*For any* user with is_active=False, login attempts should fail regardless of the value of is_approved.

**Validates: Requirements 4.4**

### Property 10: Active Unapproved User Access

*For any* user with is_active=True and is_approved=False, login should succeed but access to restricted features should be blocked.

**Validates: Requirements 4.5**

### Property 11: Admin Auto-Approval

*For any* user with user_level='admin', the is_approved field should always be True, whether set during creation or when user_level is changed to admin, and no pending approval UI should be displayed for admin users.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 12: Approval Notification Creation

*For any* user whose approval status changes from False to True, a notification record should be created in the system.

**Validates: Requirements 6.1**

### Property 13: Approved User UI State

*For any* approved user (is_approved=True), the UI should not display pending approval badges or messages, and should show full feature access.

**Validates: Requirements 6.4**

### Property 14: Welcome Message Content

*For any* welcome message displayed after approval, it should inform the user that they now have full access to system features.

**Validates: Requirements 6.3**

### Property 15: Frontend Approval Status Check

*For any* user, the frontend utility function/hook should correctly return the user's approval status from the authentication token or profile data, and this value should be cached to avoid repeated API calls.

**Validates: Requirements 7.1, 7.2, 7.4, 7.5**

### Property 16: Frontend State Synchronization

*For any* user whose approval status changes in the backend, the frontend state should update to reflect the new status immediately (on next token refresh or page load).

**Validates: Requirements 7.3**

### Property 17: Backend Approval Validation

*For any* restricted API endpoint and any unapproved user, the backend should verify is_approved status and return a 403 Forbidden error with a message indicating that approval is required.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 18: Profile Endpoint Access

*For any* user regardless of approval status, access to profile and settings endpoints should be allowed (these endpoints should not require approval).

**Validates: Requirements 8.5**

## Error Handling

### Frontend Error Handling

1. **API Errors**: When approval-related API calls fail, display user-friendly error messages
2. **Network Errors**: Handle network failures gracefully with retry options
3. **Invalid State**: If user data is inconsistent (e.g., missing is_approved field), default to pending state for safety
4. **Token Expiry**: When token expires, refresh to get latest approval status

### Backend Error Handling

1. **Invalid User ID**: Return 404 when trying to approve non-existent user
2. **Permission Denied**: Return 403 when non-admin tries to approve users
3. **Database Errors**: Log errors and return 500 with generic message
4. **Concurrent Approval**: Handle race conditions where multiple admins approve same user
5. **Invalid Status Transition**: Prevent setting is_approved=False for admin users

### Error Messages

```typescript
const ERROR_MESSAGES = {
  APPROVAL_REQUIRED: "Your account is pending approval. Please contact an administrator to gain access to this feature.",
  NOT_ADMIN: "Only administrators can approve users.",
  USER_NOT_FOUND: "User not found.",
  APPROVAL_FAILED: "Failed to approve user. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection and try again."
};
```

## Testing Strategy

### Unit Tests

Unit tests will focus on specific examples, edge cases, and error conditions:

1. **Component Rendering**:
   - ApprovalStatusBadge renders correct badge for each status combination
   - PendingApprovalMessage displays correct content
   - PendingUsersPanel renders empty state when no pending users

2. **Hook Behavior**:
   - useApprovalStatus returns correct status from auth context
   - Hook updates when auth context changes
   - Hook handles missing user data gracefully

3. **Service Functions**:
   - approvalService.approveUser makes correct API call
   - Service handles API errors appropriately
   - Bulk approval sends correct payload

4. **Backend Endpoints**:
   - GET /api/admin/users/pending returns only unapproved users
   - POST /api/admin/users/{id}/approve updates database
   - Endpoints return 403 for non-admin users

5. **Decorator Behavior**:
   - @require_approval allows approved users
   - @require_approval blocks unapproved users
   - Decorator returns correct error message

6. **Edge Cases**:
   - User with is_active=False and is_approved=True cannot login
   - Admin user cannot have is_approved set to False
   - Approving already-approved user is idempotent

### Property-Based Tests

Property tests will verify universal properties across all inputs (minimum 100 iterations per test):

1. **Property 1: Pending User UI Rendering**
   - Generate random users with is_approved=False
   - Verify UI always shows badge and complete message
   - **Tag: Feature: user-approval-ui-clarity, Property 1**

2. **Property 2: Feature Access Restriction**
   - Generate random pending users and restricted features
   - Verify access is always blocked with correct message
   - **Tag: Feature: user-approval-ui-clarity, Property 2**

3. **Property 5: User Approval State Transition**
   - Generate random pending users
   - Approve them and verify is_approved=True in database
   - **Tag: Feature: user-approval-ui-clarity, Property 5**

4. **Property 7: Bulk Approval**
   - Generate random sets of pending users
   - Bulk approve and verify all have is_approved=True
   - **Tag: Feature: user-approval-ui-clarity, Property 7**

5. **Property 9: Inactive Account Login Prevention**
   - Generate random users with is_active=False
   - Verify login fails regardless of is_approved value
   - **Tag: Feature: user-approval-ui-clarity, Property 9**

6. **Property 10: Active Unapproved User Access**
   - Generate random users with is_active=True, is_approved=False
   - Verify login succeeds but features are blocked
   - **Tag: Feature: user-approval-ui-clarity, Property 10**

7. **Property 11: Admin Auto-Approval**
   - Generate random users with user_level='admin'
   - Verify is_approved is always True
   - **Tag: Feature: user-approval-ui-clarity, Property 11**

8. **Property 15: Frontend Approval Status Check**
   - Generate random users with various approval statuses
   - Verify frontend function returns correct status
   - Verify caching prevents repeated API calls
   - **Tag: Feature: user-approval-ui-clarity, Property 15**

9. **Property 17: Backend Approval Validation**
   - Generate random unapproved users and restricted endpoints
   - Verify backend always returns 403 with correct message
   - **Tag: Feature: user-approval-ui-clarity, Property 17**

10. **Property 18: Profile Endpoint Access**
    - Generate random users with any approval status
    - Verify profile/settings endpoints are always accessible
    - **Tag: Feature: user-approval-ui-clarity, Property 18**

### Integration Tests

1. **End-to-End Approval Flow**:
   - Create pending user → Admin approves → User logs in → Verify full access
   
2. **Status Synchronization**:
   - Approve user in backend → Frontend updates without page refresh
   
3. **Multi-Admin Approval**:
   - Multiple admins approve different users simultaneously → All approvals succeed

### Testing Configuration

- **Property Test Library**: fast-check (JavaScript/TypeScript)
- **Minimum Iterations**: 100 per property test
- **Test Framework**: Vitest (frontend), pytest (backend)
- **Coverage Target**: 80% for approval-related code
