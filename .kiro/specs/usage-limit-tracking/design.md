# Design Document: Usage Limit Tracking System

## Overview

The usage limit tracking system monitors and enforces character usage limits for translation and STT features. It consists of three main components: a backend tracking service that records usage in the database, a middleware layer that enforces limits before processing requests, and a frontend indicator component that displays usage information to users.

The system tracks character counts per user per calendar month, enforces limits based on subscription levels (Guest: 5,000, Pro: 50,000, Pro Plus: 200,000, Admin: unlimited), and provides real-time feedback through color-coded visual indicators.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  UsageIndicator Component                                    │
│  - Displays current usage and limits                         │
│  - Color-coded visual feedback (green/yellow/red)            │
│  - Warning and blocking modals                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Usage Router (API Endpoints)                                │
│  - GET /api/usage/current                                    │
│  - POST /api/usage/track                                     │
├─────────────────────────────────────────────────────────────┤
│  Usage Middleware                                            │
│  - Pre-request limit checking                                │
│  - Automatic usage tracking                                  │
├─────────────────────────────────────────────────────────────┤
│  Usage Service                                               │
│  - Business logic for tracking and enforcement               │
│  - Monthly limit calculations                                │
│  - Database operations                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ SQL
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  usage_logs table                                            │
│  - user_id, month, translation_chars, stt_chars              │
│  - Unique constraint on (user_id, month)                     │
│  - Index on (user_id, month)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Usage Query Flow**: Frontend → GET /api/usage/current → Usage Service → Database → Response
2. **Usage Tracking Flow**: Translation/STT Request → Middleware (check limit) → Process Request → POST /api/usage/track → Database
3. **Limit Enforcement Flow**: Request → Middleware → Check current usage + request size → Allow/Deny

## Components and Interfaces

### Backend Components

#### 1. Usage Service (`backend/src/common/modules/usage/service.py`)

```python
from typing import Optional
from datetime import datetime
from common.supabase import get_supabase_client

class UsageService:
    """Service for tracking and enforcing usage limits"""
    
    def get_current_usage(self, user_id: int, user_level: str) -> dict:
        """
        Get current month usage for a user
        
        Returns:
            {
                'translation_chars': int,
                'stt_chars': int,
                'total_chars': int,
                'limit': int | None,  # None for admin
                'percentage': float | None,  # None for admin
                'month': str  # YYYY-MM
            }
        """
        pass
    
    def track_usage(self, user_id: int, char_count: int, usage_type: str) -> None:
        """
        Record character usage for translation or STT
        
        Args:
            user_id: User identifier
            char_count: Number of characters processed
            usage_type: 'translation' or 'stt'
        """
        pass
    
    def check_limit(self, user_id: int, user_level: str, char_count: int) -> tuple[bool, Optional[str]]:
        """
        Check if user can process char_count characters
        
        Returns:
            (can_proceed: bool, error_message: Optional[str])
        """
        pass
    
    def get_monthly_limit(self, user_level: str) -> Optional[int]:
        """
        Get monthly character limit for user level
        
        Returns:
            Character limit or None for unlimited (admin)
        """
        pass
```

#### 2. Usage Router (`backend/src/common/modules/usage/router.py`)

```python
from fastapi import APIRouter, Depends
from common.auth import get_current_user
from common.response import success_response

router = APIRouter(prefix="/api/usage", tags=["usage"])

@router.get("/current")
async def get_current_usage(user=Depends(get_current_user)):
    """Get current month usage for authenticated user"""
    pass

@router.post("/track")
async def track_usage(
    char_count: int,
    usage_type: str,
    user=Depends(get_current_user)
):
    """Track character usage (called after processing)"""
    pass
```

#### 3. Usage Middleware (`backend/src/common/usage_middleware.py`)

```python
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class UsageMiddleware(BaseHTTPMiddleware):
    """Middleware to check usage limits before processing requests"""
    
    async def dispatch(self, request: Request, call_next):
        # Check if request is for translation or STT
        # Extract character count from request
        # Check user's current usage + request size against limit
        # If over limit, return 429 Too Many Requests
        # Otherwise, proceed with request
        pass
```

#### 4. Usage DTO (`backend/src/common/modules/usage/dto.py`)

```python
from pydantic import BaseModel, Field

class UsageResponse(BaseModel):
    translation_chars: int
    stt_chars: int
    total_chars: int
    limit: Optional[int]  # None for admin
    percentage: Optional[float]  # None for admin
    month: str
    user_level: str

class TrackUsageRequest(BaseModel):
    char_count: int = Field(gt=0)
    usage_type: str = Field(pattern="^(translation|stt)$")
```

### Frontend Components

#### 1. UsageIndicator Component (`frontend/src/common/components/UsageIndicator.jsx`)

```javascript
/**
 * Displays current usage and limits with color-coded visual feedback
 * 
 * Props:
 * - usageType: 'translation' | 'stt' (for context)
 * - onLimitExceeded: callback when limit is exceeded
 */
const UsageIndicator = ({ usageType, onLimitExceeded }) => {
  // Fetch usage data on mount
  // Display usage bar with color coding
  // Show warning at 90%
  // Show blocking modal at 100%
  // Update after each request
  
  return (
    <div className="usage-indicator">
      {/* Usage bar */}
      {/* Percentage text */}
      {/* Warning/blocking modal */}
    </div>
  );
};
```

#### 2. Usage Hook (`frontend/src/common/hooks/useUsage.js`)

```javascript
/**
 * Hook for managing usage data and state
 */
const useUsage = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchUsage = async () => {
    // GET /api/usage/current
  };
  
  const trackUsage = async (charCount, usageType) => {
    // POST /api/usage/track
    // Update local state
  };
  
  const checkLimit = (charCount) => {
    // Check if request would exceed limit
    // Return boolean
  };
  
  return { usage, loading, fetchUsage, trackUsage, checkLimit };
};
```

#### 3. Usage Service (`frontend/src/common/services/usageService.js`)

```javascript
/**
 * API calls for usage tracking
 */
export const usageService = {
  getCurrentUsage: async () => {
    // GET /api/usage/current
  },
  
  trackUsage: async (charCount, usageType) => {
    // POST /api/usage/track
  }
};
```

## Data Models

### Database Schema

```sql
CREATE TABLE usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,  -- YYYY-MM format
  translation_chars INTEGER NOT NULL DEFAULT 0,
  stt_chars INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT usage_logs_user_month_unique UNIQUE(user_id, month),
  CONSTRAINT usage_logs_translation_chars_check CHECK (translation_chars >= 0),
  CONSTRAINT usage_logs_stt_chars_check CHECK (stt_chars >= 0)
);

CREATE INDEX idx_usage_logs_user_month ON usage_logs(user_id, month);
CREATE INDEX idx_usage_logs_month ON usage_logs(month);
```

### User Level Limits (from config.py)

```python
USAGE_LIMITS = {
    'guest': 5000,
    'pro': 50000,
    'pro_plus': 200000,
    'admin': None  # Unlimited
}
```

### Usage Calculation Logic

```python
def calculate_total_usage(translation_chars: int, stt_chars: int) -> int:
    """Sum translation and STT usage"""
    return translation_chars + stt_chars

def calculate_percentage(total: int, limit: Optional[int]) -> Optional[float]:
    """Calculate usage percentage, None for unlimited"""
    if limit is None:
        return None
    return (total / limit) * 100 if limit > 0 else 0

def get_current_month() -> str:
    """Get current month in YYYY-MM format"""
    return datetime.now().strftime("%Y-%m")
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Usage Tracking Completeness
*For any* translation or STT request with a character count, the Usage_Tracker should record that usage in the database for the user's current month, incrementing the appropriate counter (translation_chars or stt_chars).
**Validates: Requirements 1.1, 1.2, 1.5**

### Property 2: Counter Separation Invariant
*For any* sequence of translation and STT requests, the translation_chars and stt_chars counters should remain independent—adding translation usage should not affect STT count and vice versa.
**Validates: Requirements 1.3**

### Property 3: New Period Initialization
*For any* user and any new month (YYYY-MM) that has no existing usage record, the first usage tracking operation should create a record with zero initial values before incrementing.
**Validates: Requirements 1.4**

### Property 4: User Association Invariant
*For any* usage record in the database, it must be associated with a valid user_id, and all operations for that user should only affect their own records.
**Validates: Requirements 1.6**

### Property 5: Admin Unlimited Access
*For any* user with Admin level, regardless of their current usage amount, the Limit_Enforcement should allow the request to proceed without rejection.
**Validates: Requirements 2.4**

### Property 6: Combined Limit Calculation
*For any* user's usage check, the total usage should equal the sum of translation_chars and stt_chars for the current month, and this total should be compared against the user's Monthly_Limit.
**Validates: Requirements 2.5**

### Property 7: Pre-Processing Limit Enforcement
*For any* request that would cause the user's total usage to exceed their Monthly_Limit, the Limit_Enforcement should reject the request before any processing occurs.
**Validates: Requirements 2.6**

### Property 8: Usage Display Completeness
*For any* page (translation or STT) where the UsageIndicator is rendered, it should display the user's current total character usage and their Monthly_Limit (or "Unlimited" for admin).
**Validates: Requirements 3.1, 3.2**

### Property 9: Format Consistency for Non-Admin
*For any* non-admin user, the UsageIndicator should render usage in the format "Used: X / Y characters (Z%)" where X is total usage, Y is the limit, and Z is the percentage.
**Validates: Requirements 3.3**

### Property 10: Format Consistency for Admin
*For any* admin user, the UsageIndicator should render usage in the format "Used: X characters (Unlimited)" where X is total usage.
**Validates: Requirements 3.4**

### Property 11: Color Coding by Percentage
*For any* usage percentage P, the UsageIndicator should display green when P < 70%, yellow when 70% ≤ P < 90%, and red when P ≥ 90%.
**Validates: Requirements 3.5, 3.6, 3.7**

### Property 12: UI State Update After Request
*For any* completed translation or STT request, the UsageIndicator should update its displayed values to reflect the new total usage within the same user session.
**Validates: Requirements 3.8**

### Property 13: Blocking Behavior When Limit Exceeded
*For any* user whose usage exceeds 100% of their Monthly_Limit, the UsageIndicator should prevent new translation or STT requests from being initiated.
**Validates: Requirements 4.3**

### Property 14: Upgrade Information Display
*For any* user viewing the UsageIndicator, the component should display their current User_Level and available upgrade options when showing warning or blocking messages.
**Validates: Requirements 4.4**

### Property 15: API Response Completeness
*For any* usage query to the API, the response should include translation_chars, stt_chars, total_chars, limit (or null for admin), percentage (or null for admin), month, and user_level fields.
**Validates: Requirements 5.2, 5.3**

### Property 16: Concurrent Request Safety
*For any* set of concurrent usage tracking requests for the same user and month, the final stored usage should equal the sum of all character counts without data loss or duplicate records.
**Validates: Requirements 6.2**

### Property 17: Timestamp Maintenance
*For any* usage record, it should have both created_at and updated_at timestamps, where updated_at is modified whenever the record is updated.
**Validates: Requirements 6.4**

### Property 18: Monthly Isolation
*For any* two different months M1 and M2, usage tracked in M1 should not affect usage calculations or limit enforcement in M2, and querying usage for M2 should only return M2's data.
**Validates: Requirements 7.2, 7.4**

### Property 19: Historical Data Preservation
*For any* usage record from a previous month, it should remain in the database unchanged when new months' records are created.
**Validates: Requirements 7.3**

### Property 20: Guest User Limit Application
*For any* guest user request, the Limit_Enforcement should apply the Guest level limit (5,000 characters) regardless of the request type.
**Validates: Requirements 8.1**

### Property 21: Guest User Isolation
*For any* guest user session, usage tracking should use a consistent session identifier and should not affect or be affected by authenticated user usage records.
**Validates: Requirements 8.2, 8.3**

## Error Handling

### Error Scenarios

1. **Limit Exceeded Error**
   - HTTP Status: 429 Too Many Requests
   - Response: `{ "error": "Usage limit exceeded", "current_usage": X, "limit": Y, "trace_id": "..." }`
   - User Action: Display upgrade modal

2. **Invalid Usage Type Error**
   - HTTP Status: 400 Bad Request
   - Response: `{ "error": "Invalid usage_type. Must be 'translation' or 'stt'", "trace_id": "..." }`
   - User Action: Log error, retry with correct type

3. **Database Connection Error**
   - HTTP Status: 503 Service Unavailable
   - Response: `{ "error": "Unable to track usage. Please try again.", "trace_id": "..." }`
   - User Action: Display error message, allow retry

4. **Unauthenticated User Error**
   - HTTP Status: 401 Unauthorized
   - Response: `{ "error": "Authentication required", "trace_id": "..." }`
   - User Action: Redirect to login

5. **Concurrent Update Conflict**
   - Handled internally with upsert retry logic
   - No user-facing error
   - Logged with trace_id for monitoring

### Error Recovery

- **Transient Errors**: Implement exponential backoff retry (max 3 attempts)
- **Permanent Errors**: Display user-friendly message with trace_id for support
- **Graceful Degradation**: If usage tracking fails, log error but allow request to proceed (fail open for better UX)

## Testing Strategy

### Unit Tests

Unit tests should focus on specific examples, edge cases, and error conditions:

1. **Service Layer Tests**
   - Test get_monthly_limit() returns correct values for each user level
   - Test get_current_month() returns correct YYYY-MM format
   - Test calculate_percentage() handles zero limit correctly
   - Test calculate_percentage() returns None for admin (unlimited)
   - Test check_limit() at exact boundary (e.g., 5000 for guest)
   - Test check_limit() one character over limit
   - Test check_limit() one character under limit

2. **API Endpoint Tests**
   - Test GET /api/usage/current returns 401 for unauthenticated users
   - Test POST /api/usage/track validates usage_type enum
   - Test POST /api/usage/track rejects negative char_count
   - Test GET /api/usage/current returns zero values for new users (edge case from 5.4)

3. **Middleware Tests**
   - Test middleware allows admin requests regardless of usage
   - Test middleware blocks requests at 90% threshold (warning from 4.1)
   - Test middleware blocks requests at 100% threshold (blocking from 4.2)
   - Test middleware allows requests below threshold

4. **Frontend Component Tests**
   - Test UsageIndicator renders "Unlimited" for admin users
   - Test UsageIndicator shows upgrade message for guest users at limit (from 8.4)
   - Test color changes at 70% and 90% thresholds
   - Test warning modal appears at 90%
   - Test blocking modal appears at 100%

### Property-Based Tests

Property tests should verify universal properties across all inputs with minimum 100 iterations each:

1. **Property Test: Usage Tracking Completeness (Property 1)**
   - Generate random user_id, char_count, usage_type
   - Call track_usage()
   - Verify database record exists and counter incremented
   - **Tag: Feature: usage-limit-tracking, Property 1: Usage Tracking Completeness**

2. **Property Test: Counter Separation Invariant (Property 2)**
   - Generate random sequence of translation and STT requests
   - Track all usage
   - Verify translation_chars only affected by translation requests
   - Verify stt_chars only affected by STT requests
   - **Tag: Feature: usage-limit-tracking, Property 2: Counter Separation Invariant**

3. **Property Test: Combined Limit Calculation (Property 6)**
   - Generate random translation_chars and stt_chars values
   - Verify total_usage = translation_chars + stt_chars
   - Verify limit check uses this total
   - **Tag: Feature: usage-limit-tracking, Property 6: Combined Limit Calculation**

4. **Property Test: Admin Unlimited Access (Property 5)**
   - Generate random usage amounts (including very large values)
   - Set user level to admin
   - Verify all requests allowed regardless of amount
   - **Tag: Feature: usage-limit-tracking, Property 5: Admin Unlimited Access**

5. **Property Test: Color Coding by Percentage (Property 11)**
   - Generate random usage percentages from 0-100%
   - Verify color is green for < 70%, yellow for 70-90%, red for ≥ 90%
   - **Tag: Feature: usage-limit-tracking, Property 11: Color Coding by Percentage**

6. **Property Test: Monthly Isolation (Property 18)**
   - Generate random usage for multiple different months
   - Verify querying one month returns only that month's data
   - Verify usage in month M1 doesn't affect limits in month M2
   - **Tag: Feature: usage-limit-tracking, Property 18: Monthly Isolation**

7. **Property Test: Concurrent Request Safety (Property 16)**
   - Generate random number of concurrent requests with random char_counts
   - Execute all concurrently for same user/month
   - Verify final total equals sum of all char_counts
   - Verify no duplicate records created
   - **Tag: Feature: usage-limit-tracking, Property 16: Concurrent Request Safety**

8. **Property Test: API Response Completeness (Property 15)**
   - Generate random user states (different levels, usage amounts)
   - Query API for each
   - Verify response contains all required fields
   - Verify null values for admin limit/percentage
   - **Tag: Feature: usage-limit-tracking, Property 15: API Response Completeness**

### Integration Tests

1. **End-to-End Flow Test**
   - Create user, make translation request, verify usage tracked
   - Query usage API, verify correct values returned
   - Make requests until limit reached, verify blocking

2. **Monthly Reset Test**
   - Create usage in month M1
   - Simulate month change to M2
   - Verify M2 starts with zero usage
   - Verify M1 data still exists

3. **Guest User Flow Test**
   - Make requests as guest user
   - Verify 5,000 character limit enforced
   - Verify upgrade message shown at limit

### Test Configuration

- **Property tests**: Minimum 100 iterations per test
- **Test framework**: Backend (pytest), Frontend (Vitest)
- **Coverage target**: 80% code coverage for service and middleware layers
- **CI/CD**: All tests must pass before deployment

