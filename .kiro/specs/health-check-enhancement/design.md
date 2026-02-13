# Design Document: Health Check Enhancement

## Overview

This design enhances the existing `/api/health` endpoint to provide comprehensive system diagnostics with response time measurements. The enhancement adds database connectivity checks, external API availability checks, and cache system verification. An admin interface will display health check results visually, enabling rapid issue identification during deployments or incidents.

The design maintains backward compatibility with existing monitoring tools while providing richer diagnostic information through a structured response format.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Health View                        │
│  (React Component - displays health check results)          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP GET /api/health
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Health Check Router                         │
│  (Flask Blueprint - handles HTTP requests)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Health Check Service                        │
│  (Business logic - orchestrates all checks)                  │
└─────┬──────────┬──────────┬──────────┬──────────────────────┘
      │          │          │          │
      ▼          ▼          ▼          ▼
   ┌────┐   ┌────────┐  ┌──────┐  ┌───────┐
   │ DB │   │External│  │Cache │  │Logging│
   │    │   │  APIs  │  │      │  │       │
   └────┘   └────────┘  └──────┘  └───────┘
```

### Data Flow

1. **Request**: Admin view or monitoring tool sends GET request to `/api/health`
2. **Orchestration**: Health service executes all checks in parallel (where possible)
3. **Measurement**: Each check measures its own execution time
4. **Aggregation**: Service collects all check results and determines overall status
5. **Response**: Router returns structured JSON with all diagnostic information
6. **Display**: Admin view renders results with visual indicators

## Components and Interfaces

### Backend Components

#### 1. Health Check Service (`backend/src/common/modules/health/service.py`)

**Enhanced Functions:**

```python
def check_database() -> CheckResult:
    """
    Execute SELECT 1 query against Supabase PostgreSQL.
    Returns: CheckResult with ok status and latency_ms
    Timeout: 5 seconds
    """

def check_external_api(api_name: str, url: str, timeout: int = 3) -> CheckResult:
    """
    Verify external API availability with lightweight request.
    Args:
        api_name: Name of the API (e.g., "translation", "dictionary")
        url: API endpoint URL
        timeout: Request timeout in seconds
    Returns: CheckResult with ok status and latency_ms
    """

def check_cache() -> CheckResult:
    """
    Verify cache system (Redis or dictionary_cache table).
    Returns: CheckResult with ok status and latency_ms
    """

def perform_health_check() -> HealthCheckResponse:
    """
    Orchestrate all health checks and aggregate results.
    Returns: Complete health check response with all check results
    """

def determine_overall_status(checks: Dict[str, CheckResult]) -> str:
    """
    Determine overall system status based on check results.
    Args:
        checks: Dictionary of check results
    Returns: "ok", "degraded", or "down"
    Logic:
        - "down" if critical checks (db) fail
        - "degraded" if non-critical checks fail
        - "ok" if all checks pass
    """
```

#### 2. Health Check Router (`backend/src/common/modules/health/router.py`)

**Enhanced Endpoint:**

```python
@router.route('/health', methods=['GET'])
def health_check():
    """
    Enhanced health check endpoint.
    Returns:
        200: System is healthy or degraded
        503: System is down (critical failure)
    Response format:
        {
            "status": "ok" | "degraded" | "down",
            "time": "2026-02-01T10:00:00Z",
            "checks": {
                "db": {"ok": true, "latency_ms": 12},
                "translation_api": {"ok": true, "latency_ms": 80},
                "dictionary_api": {"ok": true, "latency_ms": 75},
                "cache": {"ok": true, "latency_ms": 3}
            },
            "trace_id": "abc123"
        }
    """
```

### Frontend Components

#### 1. Health Check Service (`frontend/src/modules/auth/_06_services/service.js`)

**New Function:**

```javascript
async getHealthCheck(accessToken) {
    const response = await api.get('/api/health', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return response.data;
}
```

#### 2. Admin View Enhancement (`frontend/src/modules/admin/_02_views/AdminView.jsx`)

**New Tab:**

```javascript
// Add "헬스체크" tab to existing tabs
<button
    onClick={() => setActiveTab('health')}
    className={...}>
    헬스체크
</button>

// Health check tab content
{!loading && activeTab === 'health' && (
    <HealthCheckPanel 
        healthData={healthData}
        onRefresh={fetchHealthCheck}
    />
)}
```

#### 3. Health Check Panel Component (`frontend/src/modules/admin/_01_components/HealthCheckPanel.jsx`)

**New Component:**

```javascript
export default function HealthCheckPanel({ healthData, onRefresh }) {
    // Display overall status with color indicator
    // Display each check result with OK/FAIL badge
    // Display response time for each check
    // Display error messages for failed checks
    // Provide refresh button to trigger new check
}
```

## Data Models

### Backend Data Structures

```python
from typing import TypedDict, Optional

class CheckResult(TypedDict):
    """Result of a single health check"""
    ok: bool
    latency_ms: int
    error: Optional[str]  # Only present when ok=False

class HealthCheckResponse(TypedDict):
    """Complete health check response"""
    status: str  # "ok" | "degraded" | "down"
    time: str    # ISO 8601 timestamp
    checks: dict[str, CheckResult]
    trace_id: str
```

### Frontend Data Structures

```typescript
interface CheckResult {
    ok: boolean;
    latency_ms: number;
    error?: string;
}

interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'down';
    time: string;
    checks: {
        db: CheckResult;
        translation_api: CheckResult;
        dictionary_api: CheckResult;
        cache: CheckResult;
    };
    trace_id: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN the health check endpoint is called, THE Health_Check_System SHALL return a response with `status`, `time`, and `checks` fields
  Thoughts: This is testing the structure of the response. We can verify that for any health check call, the response contains these required fields.
  Testable: yes - property

1.2 THE Health_Check_System SHALL set `status` to "ok" when all checks pass
  Thoughts: This is testing the logic for determining overall status. We can create scenarios where all checks pass and verify the status is "ok".
  Testable: yes - property

1.3 THE Health_Check_System SHALL set `status` to "degraded" when non-critical checks fail
  Thoughts: This tests status determination logic. We can simulate non-critical check failures and verify status is "degraded".
  Testable: yes - property

1.4 THE Health_Check_System SHALL set `status` to "down" when critical checks fail
  Thoughts: This tests status determination logic. We can simulate critical check failures and verify status is "down".
  Testable: yes - property

1.5 THE Health_Check_System SHALL include an ISO 8601 formatted timestamp in the `time` field
  Thoughts: This tests timestamp format. We can verify the timestamp matches ISO 8601 format for any health check response.
  Testable: yes - property

1.6 THE Health_Check_System SHALL include a `checks` object containing results for each check type
  Thoughts: This tests response structure. We can verify that the checks object contains all expected check types.
  Testable: yes - property

2.1 WHEN the database check is performed, THE Health_Check_System SHALL execute a `SELECT 1` query against Supabase PostgreSQL
  Thoughts: This is testing implementation details. We can verify the query is executed, but this is more of an integration test.
  Testable: yes - example

2.2 WHEN the database query succeeds, THE Health_Check_System SHALL return a Check_Result with `ok: true` and the query latency
  Thoughts: This tests the success case for database checks. We can verify the result structure when DB is available.
  Testable: yes - property

2.3 WHEN the database query fails, THE Health_Check_System SHALL return a Check_Result with `ok: false` and an error message
  Thoughts: This tests the failure case for database checks. We can simulate DB failures and verify the error result.
  Testable: yes - property

2.4 THE Health_Check_System SHALL measure database response time in milliseconds
  Thoughts: This tests that latency measurement exists and is in the correct unit. We can verify latency_ms is present and is a number.
  Testable: yes - property

2.5 WHEN the database check times out after 5 seconds, THE Health_Check_System SHALL return `ok: false`
  Thoughts: This is an edge case for timeout handling. We can simulate slow DB responses and verify timeout behavior.
  Testable: edge-case

3.1 WHEN the external API check is performed, THE Health_Check_System SHALL verify translation API availability
  Thoughts: This tests that translation API is checked. We can verify the check is performed and result is included.
  Testable: yes - example

3.2 WHEN the external API check is performed, THE Health_Check_System SHALL verify dictionary API availability
  Thoughts: This tests that dictionary API is checked. We can verify the check is performed and result is included.
  Testable: yes - example

3.3 WHEN an external API request succeeds, THE Health_Check_System SHALL return a Check_Result with `ok: true` and the request latency
  Thoughts: This tests success case for external API checks. We can verify result structure when API is available.
  Testable: yes - property

3.4 WHEN an external API request fails, THE Health_Check_System SHALL return a Check_Result with `ok: false` and an error message
  Thoughts: This tests failure case for external API checks. We can simulate API failures and verify error result.
  Testable: yes - property

3.5 THE Health_Check_System SHALL use a timeout of 3 seconds for external API checks
  Thoughts: This is testing timeout configuration. This is an implementation detail that's hard to test as a property.
  Testable: edge-case

3.6 THE Health_Check_System SHALL measure external API response time in milliseconds
  Thoughts: This tests that latency measurement exists. We can verify latency_ms is present for API checks.
  Testable: yes - property

4.1 WHEN Redis is configured, THE Health_Check_System SHALL verify Redis connectivity using a PING command
  Thoughts: This tests Redis check implementation. This is an integration test for specific configuration.
  Testable: yes - example

4.2 WHEN Redis is not configured, THE Health_Check_System SHALL verify the dictionary_cache table with a lightweight query
  Thoughts: This tests fallback cache check. This is an integration test for specific configuration.
  Testable: yes - example

4.3 WHEN the cache check succeeds, THE Health_Check_System SHALL return a Check_Result with `ok: true` and the operation latency
  Thoughts: This tests success case for cache checks. We can verify result structure when cache is available.
  Testable: yes - property

4.4 WHEN the cache check fails, THE Health_Check_System SHALL return a Check_Result with `ok: false` and an error message
  Thoughts: This tests failure case for cache checks. We can simulate cache failures and verify error result.
  Testable: yes - property

4.5 THE Health_Check_System SHALL measure cache response time in milliseconds
  Thoughts: This tests that latency measurement exists. We can verify latency_ms is present for cache checks.
  Testable: yes - property

5.1 WHEN an administrator accesses the admin page, THE Admin_Health_View SHALL display a "헬스체크" (Health Check) menu item
  Thoughts: This is a UI test for menu presence. We can verify the menu item exists in the rendered component.
  Testable: yes - example

5.2 WHEN the health check tab is selected, THE Admin_Health_View SHALL fetch and display current health check results
  Thoughts: This tests UI behavior. We can verify that selecting the tab triggers an API call and displays results.
  Testable: yes - example

5.3 WHEN displaying check results, THE Admin_Health_View SHALL show each check's status (OK/FAIL) with visual indicators
  Thoughts: This tests UI rendering. We can verify that check results are displayed with appropriate visual indicators.
  Testable: yes - example

5.4 WHEN displaying check results, THE Admin_Health_View SHALL show response time for each check in milliseconds
  Thoughts: This tests UI rendering. We can verify that latency values are displayed for each check.
  Testable: yes - example

5.5 THE Admin_Health_View SHALL provide a "새로고침" (Refresh) button to manually trigger a new health check
  Thoughts: This tests UI functionality. We can verify the button exists and triggers a new API call when clicked.
  Testable: yes - example

5.6 WHEN a check fails, THE Admin_Health_View SHALL display the error message
  Thoughts: This tests error display. We can verify that error messages are shown when checks fail.
  Testable: yes - example

5.7 WHEN the health check request fails, THE Admin_Health_View SHALL display an error notification
  Thoughts: This tests error handling. We can verify that API failures show appropriate error notifications.
  Testable: yes - example

6.1 WHEN a health check is performed, THE Health_Check_System SHALL log the overall result
  Thoughts: This tests logging behavior. We can verify that log entries are created for health checks.
  Testable: yes - example

6.2 WHEN any check fails, THE Health_Check_System SHALL log the failure with error details
  Thoughts: This tests error logging. We can verify that failures are logged with details.
  Testable: yes - property

6.3 WHEN a check times out, THE Health_Check_System SHALL log the timeout event
  Thoughts: This tests timeout logging. This is an edge case for timeout scenarios.
  Testable: edge-case

6.4 THE Health_Check_System SHALL include trace_id in all log entries for correlation
  Thoughts: This tests log format. We can verify that trace_id is present in log entries.
  Testable: yes - property

6.5 THE Health_Check_System SHALL NOT raise exceptions that prevent the endpoint from returning a response
  Thoughts: This tests error handling robustness. We can verify that even with failures, the endpoint returns a response.
  Testable: yes - property

7.1 THE Health_Check_System SHALL maintain the `/api/health` endpoint path
  Thoughts: This tests backward compatibility. We can verify the endpoint path hasn't changed.
  Testable: yes - example

7.2 THE Health_Check_System SHALL return HTTP 200 when status is "ok"
  Thoughts: This tests HTTP status code mapping. We can verify the correct status code for "ok" status.
  Testable: yes - property

7.3 THE Health_Check_System SHALL return HTTP 503 when status is "down"
  Thoughts: This tests HTTP status code mapping. We can verify the correct status code for "down" status.
  Testable: yes - property

7.4 THE Health_Check_System SHALL return HTTP 200 when status is "degraded"
  Thoughts: This tests HTTP status code mapping. We can verify the correct status code for "degraded" status.
  Testable: yes - property

7.5 THE Health_Check_System SHALL include the trace_id field in the response for compatibility
  Thoughts: This tests backward compatibility. We can verify trace_id is present in responses.
  Testable: yes - property

### Property Reflection

After reviewing all testable properties, I've identified the following consolidations:

- Properties 2.2, 3.3, 4.3 (success cases) can be combined into one property about CheckResult structure for successful checks
- Properties 2.3, 3.4, 4.4 (failure cases) can be combined into one property about CheckResult structure for failed checks
- Properties 2.4, 3.6, 4.5 (latency measurement) are redundant with the success case property
- Properties 7.2, 7.3, 7.4 (HTTP status codes) can be combined into one property about status-to-HTTP-code mapping
- Properties 1.2, 1.3, 1.4 (status determination) can be combined into one comprehensive property

### Correctness Properties

Property 1: Health check response structure
*For any* health check request, the response should contain `status`, `time`, `checks`, and `trace_id` fields, where `time` is ISO 8601 formatted and `checks` contains all expected check types (db, translation_api, dictionary_api, cache)
**Validates: Requirements 1.1, 1.5, 1.6, 7.5**

Property 2: Overall status determination
*For any* set of check results, the overall status should be "down" when critical checks (db) fail, "degraded" when only non-critical checks fail, and "ok" when all checks pass
**Validates: Requirements 1.2, 1.3, 1.4**

Property 3: Successful check result structure
*For any* successful health check (db, external API, or cache), the CheckResult should have `ok: true` and a non-negative `latency_ms` value
**Validates: Requirements 2.2, 2.4, 3.3, 3.6, 4.3, 4.5**

Property 4: Failed check result structure
*For any* failed health check (db, external API, or cache), the CheckResult should have `ok: false` and an `error` field containing a descriptive message
**Validates: Requirements 2.3, 3.4, 4.4**

Property 5: HTTP status code mapping
*For any* health check response, the HTTP status code should be 503 when status is "down", and 200 when status is "ok" or "degraded"
**Validates: Requirements 7.2, 7.3, 7.4**

Property 6: Error resilience
*For any* health check execution, even when individual checks fail or timeout, the endpoint should return a valid response without raising unhandled exceptions
**Validates: Requirements 6.5**

Property 7: Trace ID logging
*For any* health check that includes failures, the log entries should contain the trace_id for correlation
**Validates: Requirements 6.2, 6.4**

## Error Handling

### Error Categories

1. **Database Connection Errors**
   - Connection timeout (5 seconds)
   - Connection refused
   - Authentication failure
   - Query execution failure

2. **External API Errors**
   - Request timeout (3 seconds)
   - Network errors
   - HTTP error responses (4xx, 5xx)
   - DNS resolution failures

3. **Cache Errors**
   - Redis connection failure
   - Redis command timeout
   - Table query failure (fallback)

### Error Handling Strategy

```python
def safe_check(check_func, check_name: str) -> CheckResult:
    """
    Wrapper for health checks that ensures errors don't crash the endpoint.
    
    Args:
        check_func: Function that performs the check
        check_name: Name of the check for logging
    
    Returns:
        CheckResult with ok=False and error message if check fails
    """
    try:
        start_time = time.time()
        result = check_func()
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=True, latency_ms=latency_ms)
    except TimeoutError as e:
        logger.warning(f"{check_name} check timed out: {e}", extra={'trace_id': g.get('trace_id')})
        return CheckResult(ok=False, latency_ms=0, error=f"Timeout: {str(e)}")
    except Exception as e:
        logger.error(f"{check_name} check failed: {e}", extra={'trace_id': g.get('trace_id')})
        return CheckResult(ok=False, latency_ms=0, error=str(e))
```

### Logging Strategy

- **INFO**: Successful health checks with overall status
- **WARNING**: Individual check failures (non-critical)
- **ERROR**: Critical check failures (database)
- **All logs include**: trace_id, check_name, latency_ms, error details

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases (timeouts), and integration points
- **Property tests**: Verify universal properties across all inputs (response structure, status determination)

### Unit Testing

**Backend Unit Tests** (`backend/tests/test_health_service.py`):
- Test database check with mocked successful connection
- Test database check with mocked connection failure
- Test database check with timeout
- Test external API check with mocked successful response
- Test external API check with mocked failure
- Test cache check with Redis available
- Test cache check with Redis unavailable (fallback to table)
- Test overall status determination with various check combinations
- Test error handling and logging

**Frontend Unit Tests** (`frontend/src/modules/admin/__tests__/HealthCheckPanel.test.jsx`):
- Test health check panel renders with successful checks
- Test health check panel renders with failed checks
- Test refresh button triggers API call
- Test error notification displays on API failure

### Property-Based Testing

**Backend Property Tests** (`backend/tests/test_health_properties.py`):

Each property test should run minimum 100 iterations with randomized inputs.

```python
# Property 1: Health check response structure
# Feature: health-check-enhancement, Property 1
def test_health_check_response_structure():
    """For any health check request, response contains required fields"""
    # Generate random check results
    # Verify response has status, time, checks, trace_id
    # Verify time is ISO 8601 format
    # Verify checks contains all expected types

# Property 2: Overall status determination
# Feature: health-check-enhancement, Property 2
def test_overall_status_determination():
    """For any set of check results, status is correctly determined"""
    # Generate random combinations of check results
    # Verify status is "down" when db fails
    # Verify status is "degraded" when only non-critical fail
    # Verify status is "ok" when all pass

# Property 3: Successful check result structure
# Feature: health-check-enhancement, Property 3
def test_successful_check_result_structure():
    """For any successful check, result has ok=True and latency_ms >= 0"""
    # Generate random successful check scenarios
    # Verify CheckResult structure

# Property 4: Failed check result structure
# Feature: health-check-enhancement, Property 4
def test_failed_check_result_structure():
    """For any failed check, result has ok=False and error message"""
    # Generate random failure scenarios
    # Verify CheckResult structure with error

# Property 5: HTTP status code mapping
# Feature: health-check-enhancement, Property 5
def test_http_status_code_mapping():
    """For any health check response, HTTP code matches status"""
    # Generate random health check responses
    # Verify HTTP 503 for "down", HTTP 200 for "ok"/"degraded"

# Property 6: Error resilience
# Feature: health-check-enhancement, Property 6
def test_error_resilience():
    """For any check failures, endpoint returns valid response"""
    # Simulate various error conditions
    # Verify endpoint always returns response without exceptions

# Property 7: Trace ID logging
# Feature: health-check-enhancement, Property 7
def test_trace_id_logging():
    """For any failed check, logs contain trace_id"""
    # Generate random failure scenarios
    # Verify trace_id in log entries
```

### Integration Testing

- Test complete health check flow with real database connection
- Test health check with external APIs (use test endpoints)
- Test admin view health check tab end-to-end
- Test backward compatibility with existing monitoring tools

### Test Configuration

- Property tests: Minimum 100 iterations per test
- Timeouts: Use shorter timeouts in tests (1 second for DB, 0.5 seconds for APIs)
- Mocking: Mock external dependencies (database, APIs, Redis) for unit tests
- Test data: Generate random check results for property tests

## Implementation Notes

### Backend Implementation Priority

1. Enhance service layer with new check functions
2. Update router to use new response format
3. Add comprehensive error handling and logging
4. Write unit tests and property tests

### Frontend Implementation Priority

1. Add health check API call to auth service
2. Create HealthCheckPanel component
3. Add health check tab to AdminView
4. Write component tests

### Backward Compatibility

- Maintain `/api/health` endpoint path
- Keep trace_id in response
- Use HTTP 200/503 status codes as before
- Existing monitoring tools will continue to work
- New fields (checks, time) are additive

### Performance Considerations

- Execute checks in parallel where possible (external APIs)
- Use short timeouts to prevent slow responses
- Cache check results briefly (optional future enhancement)
- Minimize database query overhead (SELECT 1 is lightweight)
