# Requirements Document

## Introduction

This document specifies the requirements for a usage limit display and tracking system that monitors and enforces character usage limits for translation and STT (Speech-to-Text) features based on user subscription levels.

## Glossary

- **Usage_Tracker**: The system component responsible for recording and monitoring character usage
- **Usage_Indicator**: The UI component that displays current usage and limits to users
- **Character_Count**: The number of characters processed in a translation or STT request
- **Monthly_Limit**: The maximum number of characters a user can process per calendar month based on their subscription level
- **Usage_Period**: A calendar month (YYYY-MM format) used for tracking usage
- **User_Level**: The subscription tier (Guest, Pro, Pro Plus, Admin) that determines usage limits
- **Limit_Enforcement**: The mechanism that prevents usage when limits are exceeded

## Requirements

### Requirement 1: Track Character Usage

**User Story:** As a system administrator, I want to track character usage per user per month, so that I can enforce subscription limits and monitor system usage.

#### Acceptance Criteria

1. WHEN a translation request is processed, THE Usage_Tracker SHALL record the Character_Count for that user's current Usage_Period
2. WHEN an STT request is processed, THE Usage_Tracker SHALL record the Character_Count for that user's current Usage_Period
3. THE Usage_Tracker SHALL maintain separate counters for translation and STT usage within each Usage_Period
4. WHEN recording usage for a new Usage_Period, THE Usage_Tracker SHALL create a new usage record with zero initial values
5. WHEN recording usage for an existing Usage_Period, THE Usage_Tracker SHALL increment the existing counters
6. THE Usage_Tracker SHALL associate all usage records with a specific user_id

### Requirement 2: Enforce Usage Limits

**User Story:** As a system administrator, I want to enforce usage limits based on subscription levels, so that users stay within their allocated quotas.

#### Acceptance Criteria

1. WHEN a user with Guest level reaches 5,000 characters in the current Usage_Period, THE Limit_Enforcement SHALL prevent further usage
2. WHEN a user with Pro level reaches 50,000 characters in the current Usage_Period, THE Limit_Enforcement SHALL prevent further usage
3. WHEN a user with Pro Plus level reaches 200,000 characters in the current Usage_Period, THE Limit_Enforcement SHALL prevent further usage
4. WHEN a user with Admin level makes a request, THE Limit_Enforcement SHALL allow unlimited usage
5. WHEN checking limits, THE Limit_Enforcement SHALL sum both translation and STT character counts for the current Usage_Period
6. WHEN a request would exceed the Monthly_Limit, THE Limit_Enforcement SHALL reject the request before processing

### Requirement 3: Display Current Usage

**User Story:** As a user, I want to see my current usage and limits, so that I can monitor my quota consumption.

#### Acceptance Criteria

1. WHEN a user views the translation page, THE Usage_Indicator SHALL display their current character usage and Monthly_Limit
2. WHEN a user views the STT page, THE Usage_Indicator SHALL display their current character usage and Monthly_Limit
3. WHEN displaying usage for non-Admin users, THE Usage_Indicator SHALL show the format "Used: X / Y characters (Z%)"
4. WHEN displaying usage for Admin users, THE Usage_Indicator SHALL show the format "Used: X characters (Unlimited)"
5. WHEN usage is below 70% of Monthly_Limit, THE Usage_Indicator SHALL display in green color
6. WHEN usage is between 70% and 90% of Monthly_Limit, THE Usage_Indicator SHALL display in yellow color
7. WHEN usage exceeds 90% of Monthly_Limit, THE Usage_Indicator SHALL display in red color
8. WHEN a user completes a translation or STT request, THE Usage_Indicator SHALL update to reflect the new usage total

### Requirement 4: Provide Usage Warnings

**User Story:** As a user, I want to receive warnings when approaching my usage limit, so that I can manage my quota effectively.

#### Acceptance Criteria

1. WHEN a user's usage reaches 90% of their Monthly_Limit, THE Usage_Indicator SHALL display a warning message
2. WHEN a user's usage exceeds 100% of their Monthly_Limit, THE Usage_Indicator SHALL display a blocking message with upgrade options
3. WHEN displaying a blocking message, THE Usage_Indicator SHALL prevent new translation or STT requests
4. THE Usage_Indicator SHALL provide clear information about the user's current User_Level and available upgrade options

### Requirement 5: Provide Usage Query API

**User Story:** As a frontend developer, I want to query current usage data, so that I can display accurate information to users.

#### Acceptance Criteria

1. THE Usage_Tracker SHALL provide an endpoint that returns current month usage for the authenticated user
2. WHEN querying usage, THE Usage_Tracker SHALL return translation character count, STT character count, total count, and Monthly_Limit
3. WHEN querying usage, THE Usage_Tracker SHALL return the percentage of limit used
4. WHEN querying usage for a user with no usage record, THE Usage_Tracker SHALL return zero values
5. THE Usage_Tracker SHALL respond to usage queries within 200ms

### Requirement 6: Persist Usage Data

**User Story:** As a system administrator, I want usage data persisted in the database, so that usage tracking survives system restarts and enables historical analysis.

#### Acceptance Criteria

1. THE Usage_Tracker SHALL store usage records in a dedicated usage_logs table
2. WHEN storing usage data, THE Usage_Tracker SHALL use upsert operations to handle concurrent requests
3. THE Usage_Tracker SHALL create a unique constraint on (user_id, month) to prevent duplicate records
4. THE Usage_Tracker SHALL maintain created_at and updated_at timestamps for each usage record
5. THE Usage_Tracker SHALL create an index on (user_id, month) for efficient queries

### Requirement 7: Handle Monthly Reset

**User Story:** As a system administrator, I want usage to reset at the start of each calendar month, so that users receive their full quota each month.

#### Acceptance Criteria

1. WHEN a new calendar month begins, THE Usage_Tracker SHALL create new usage records with zero values for active users
2. WHEN querying usage in a new month, THE Usage_Tracker SHALL not include previous months' usage in the current total
3. THE Usage_Tracker SHALL preserve historical usage records for auditing and analysis
4. WHEN calculating limits, THE Usage_Tracker SHALL only consider the current Usage_Period

### Requirement 8: Handle Guest User Limits

**User Story:** As a system administrator, I want to track guest user usage, so that unauthenticated users have appropriate limits.

#### Acceptance Criteria

1. WHEN a guest user makes a request, THE Limit_Enforcement SHALL apply the Guest level limit of 5,000 characters
2. THE Usage_Tracker SHALL track guest usage separately from authenticated users
3. WHEN tracking guest usage, THE Usage_Tracker SHALL use a consistent identifier for the guest session
4. WHEN a guest user exceeds their limit, THE Usage_Indicator SHALL display a message encouraging account creation
