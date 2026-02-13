# Requirements Document

## Introduction

This specification addresses the confusion around user approval status in the system. Currently, users can log in but remain in a "pending approval" state until an admin approves them. The UI lacks clear messaging about what this status means, what users can do while pending, and how to get approved. This feature will improve the user experience by providing clear, informative messaging and a streamlined approval workflow.

## Glossary

- **User**: A person who has registered an account in the system
- **Admin**: A user with administrative privileges (user_level='admin')
- **Approval_Status**: The state of admin approval for a user (is_approved field)
- **Account_Status**: The active/inactive state of a user account (is_active field)
- **Pending_User**: A user with is_approved=False
- **Approved_User**: A user with is_approved=True
- **Feature_Access**: The ability to use system features beyond basic account management
- **Approval_UI**: User interface components that display and manage approval status
- **Status_Badge**: Visual indicator showing user's approval state

## Requirements

### Requirement 1: Display Clear Approval Status

**User Story:** As a pending user, I want to see my approval status clearly explained, so that I understand why I cannot access certain features.

#### Acceptance Criteria

1. WHEN a pending user logs in, THE Approval_UI SHALL display a prominent status badge indicating "Pending Approval"
2. WHEN a pending user views their profile or dashboard, THE Approval_UI SHALL display an informational message explaining what "Pending Approval" means
3. THE informational message SHALL include what users can do while pending (view profile, change settings)
4. THE informational message SHALL include what users cannot do while pending (use core features)
5. THE informational message SHALL include instructions on how to get approved (contact admin, wait for review)

### Requirement 2: Prevent Feature Access for Pending Users

**User Story:** As a pending user, I want to receive clear feedback when I try to use restricted features, so that I understand why access is denied and what to do next.

#### Acceptance Criteria

1. WHEN a pending user attempts to access a restricted feature, THE System SHALL prevent the action and display an informative message
2. THE informative message SHALL explain that approval is required to use this feature
3. THE informative message SHALL include instructions on how to get approved
4. WHEN a pending user navigates to restricted pages, THE System SHALL redirect to a status explanation page or show an overlay message
5. THE System SHALL maintain a consistent message format across all restricted features

### Requirement 3: Admin User Approval Management

**User Story:** As an admin, I want to view and approve pending users, so that I can grant access to legitimate users efficiently.

#### Acceptance Criteria

1. WHEN an admin views the admin panel, THE System SHALL display a list of all pending users
2. THE pending users list SHALL show user email, registration date, and current status
3. WHEN an admin clicks an approve button for a user, THE System SHALL set is_approved=True for that user
4. WHEN an admin approves a user, THE System SHALL log the approval action with timestamp and admin identifier
5. THE System SHALL provide a bulk approval option for multiple users
6. WHEN a user is approved, THE System SHALL update the user's status immediately in the database

### Requirement 4: Distinguish Account Status from Approval Status

**User Story:** As a user, I want to clearly understand the difference between my account being active and being approved, so that I know what each status means for my access.

#### Acceptance Criteria

1. THE Approval_UI SHALL display account status (active/inactive) separately from approval status (pending/approved)
2. WHEN displaying status information, THE System SHALL use distinct visual indicators for account status and approval status
3. THE System SHALL explain that account status controls login ability while approval status controls feature access
4. WHEN an account is inactive, THE System SHALL prevent login regardless of approval status
5. WHEN an account is active but not approved, THE System SHALL allow login but restrict feature access

### Requirement 5: Automatic Admin Approval

**User Story:** As a system administrator, I want admin users to be automatically approved, so that they can immediately access all features without manual approval.

#### Acceptance Criteria

1. WHEN a user is created with user_level='admin', THE System SHALL automatically set is_approved=True
2. WHEN a user's user_level is changed to 'admin', THE System SHALL automatically set is_approved=True
3. THE System SHALL not require manual approval for admin users
4. WHEN an admin user logs in, THE System SHALL not display pending approval messages

### Requirement 6: User Notification on Approval

**User Story:** As a pending user, I want to be notified when my account is approved, so that I know I can start using the system features.

#### Acceptance Criteria

1. WHEN a user's approval status changes from pending to approved, THE System SHALL create a notification record
2. WHEN an approved user logs in for the first time after approval, THE System SHALL display a welcome message indicating approval
3. THE welcome message SHALL inform the user that they now have full access to system features
4. THE System SHALL clear the pending approval badge and messages after approval

### Requirement 7: Frontend Status Checking

**User Story:** As a developer, I want a consistent way to check user approval status in the frontend, so that I can conditionally render UI elements based on approval state.

#### Acceptance Criteria

1. THE System SHALL provide a frontend utility function to check if the current user is approved
2. THE utility function SHALL return the approval status from the user's authentication token or profile data
3. WHEN the approval status changes, THE System SHALL update the frontend state immediately
4. THE System SHALL provide React hooks or composables for checking approval status in components
5. THE System SHALL cache approval status to avoid repeated API calls

### Requirement 8: Backend Approval Validation

**User Story:** As a developer, I want backend endpoints to validate user approval status, so that unapproved users cannot bypass frontend restrictions.

#### Acceptance Criteria

1. WHEN a user makes an API request to a restricted endpoint, THE System SHALL verify the user's is_approved status
2. IF the user is not approved, THEN THE System SHALL return a 403 Forbidden error with a descriptive message
3. THE error message SHALL indicate that approval is required to access this resource
4. THE System SHALL log unauthorized access attempts by pending users
5. THE System SHALL allow access to user profile and settings endpoints regardless of approval status
