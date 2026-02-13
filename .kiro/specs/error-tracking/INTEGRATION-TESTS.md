# Integration Tests: Error Tracking System

**Feature:** error-tracking  
**Date:** 2026-02-01

## Overview

This document provides integration test scenarios for the error tracking system. These tests verify end-to-end functionality across frontend, backend, and database.

## Prerequisites

1. Backend server running on `http://localhost:8001`
2. Frontend server running on `http://localhost:5173`
3. Supabase database accessible
4. Admin user account available
5. Non-admin user account available

## Test 17.1: End-to-End Trace ID Flow

**Validates:** Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6

### Objective
Verify that trace IDs are generated, propagated, and preserved throughout the entire request/response cycle.

### Test Steps

#### Step 1: Frontend Generates Trace ID
1. Open browser DevTools (F12)
2. Navigate to any page that makes API calls
3. Open Network tab
4. Make an API request (e.g., login, fetch data)
5. Inspect request headers

**Expected Result:**
- Request should have `x-trace-id` header
- Value should be valid UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

**Verification:**
```javascript
// In browser console
const response = await fetch('http://localhost:8001/api/health', {
  headers: { 'x-trace-id': crypto.randomUUID() }
});
console.log('Request trace ID:', response.headers.get('x-trace-id'));
```

#### Step 2: Backend Receives and Preserves Trace ID
1. Check backend logs (console or log file)
2. Look for log entries with the trace ID from Step 1

**Expected Result:**
- Backend logs should contain the same trace ID
- Log format: `[timestamp] [level] [trace_id] [module] message`

**Verification:**
```bash
# Check backend logs
tail -f backend/logs/daily.log | grep "trace_id"
```

#### Step 3: Backend Returns Trace ID in Response
1. In browser DevTools Network tab
2. Inspect response headers for the same request

**Expected Result:**
- Response should have `x-trace-id` header
- Value should match the request trace ID

**Verification:**
```javascript
// In browser console
const response = await fetch('http://localhost:8001/api/health');
const traceId = response.headers.get('x-trace-id');
console.log('Response trace ID:', traceId);
console.log('Is valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(traceId));
```

#### Step 4: Frontend Extracts Trace ID
1. Use apiFetch wrapper to make a request
2. Check returned traceId value

**Expected Result:**
- apiFetch should return object with `traceId` property
- Value should match response header

**Verification:**
```javascript
// In browser console
import { apiFetch } from './src/common/api.js';
const result = await apiFetch('/api/health');
console.log('Extracted trace ID:', result.traceId);
```

### Success Criteria
- ✅ Frontend generates valid UUID v4 trace IDs
- ✅ Trace IDs included in request headers
- ✅ Backend logs contain trace IDs
- ✅ Backend returns trace IDs in response headers
- ✅ Frontend extracts trace IDs from responses
- ✅ Trace ID remains consistent throughout the flow

---

## Test 17.2: Error Reporting Flow

**Validates:** Requirements 4.3, 7.2, 8.2

### Objective
Verify that errors are captured, reported, stored, and displayed in the admin interface.

### Test Steps

#### Step 1: Trigger Frontend Error
1. Login as any user
2. Open browser console
3. Trigger an error manually:

```javascript
// Trigger unhandled error
throw new Error('Test error for integration testing');
```

**Expected Result:**
- Error caught by global error handler
- Console shows `[TRACE_ID]` log with UUID
- Console shows `[ERROR]` log with error message

#### Step 2: Verify Error Report Sent to Backend
1. Open Network tab in DevTools
2. Look for POST request to `/api/errors`
3. Inspect request payload

**Expected Result:**
- POST request to `/api/errors` should be sent
- Request should include:
  - `trace_id`: UUID
  - `message`: Error message
  - `stack_trace`: Stack trace
  - `user_context`: User info
  - `url`: Current page URL
  - `user_agent`: Browser info

**Verification:**
```javascript
// Check network request
// Look for POST /api/errors in Network tab
// Inspect request payload
```

#### Step 3: Verify Error Stored in Database
1. Login as admin user
2. Navigate to `/admin/errors`
3. Look for the error in the list

**Expected Result:**
- Error should appear in the error list
- Should show correct timestamp
- Should show `frontend` as source
- Should show error message
- Trace ID should be clickable

**Alternative Verification (Direct Database Query):**
```sql
-- In Supabase SQL Editor
SELECT * FROM error_events 
WHERE message LIKE '%Test error for integration testing%'
ORDER BY created_at DESC 
LIMIT 1;
```

#### Step 4: Verify Error Details in Admin Interface
1. In `/admin/errors` page
2. Click on the trace ID of the test error
3. Modal should open with full details

**Expected Result:**
- Modal displays all error events for that trace ID
- Shows full stack trace
- Shows user context
- Shows URL and user agent
- Shows timestamp

### Success Criteria
- ✅ Frontend errors are caught by global handler
- ✅ Error reports sent to backend with all required fields
- ✅ Errors stored in database with correct `where_from` value
- ✅ Errors appear in admin interface
- ✅ Trace ID correlation works end-to-end
- ✅ Error details accessible via trace ID

---

## Test 17.3: Test Error Button Integration

**Validates:** Requirements 9.2, 9.3, 9.4, 9.5

### Objective
Verify that the test error button triggers a backend error and the error appears in the admin interface within 5 seconds.

### Test Steps

#### Step 1: Trigger Test Error
1. Login as admin user
2. Navigate to `/admin/errors`
3. Click "Trigger Test Error" button
4. Note the current time

**Expected Result:**
- Button shows loading state
- Success message appears with trace ID
- Console shows `[TEST_ERROR] Trace ID: xxx`
- Console shows `[TRACE_ID] xxx`

#### Step 2: Verify Backend Error
1. Check backend logs immediately
2. Look for test error log entry

**Expected Result:**
- Backend logs show: `Test error triggered: trace_id=xxx`
- Backend logs show: `Test error - trace_id: xxx`
- Error logged at ERROR level

**Verification:**
```bash
# Check backend logs
tail -f backend/logs/daily.log | grep "Test error"
```

#### Step 3: Verify Error in Admin Interface
1. Wait up to 5 seconds
2. Refresh the error list (or it should auto-update)
3. Look for the test error

**Expected Result:**
- Error appears in list within 5 seconds
- Source shows `backend`
- Message shows "Test error triggered by admin"
- Trace ID matches the one from Step 1

#### Step 4: Verify Error Details
1. Click on the trace ID
2. Inspect error details in modal

**Expected Result:**
- Modal shows error event
- Detail includes `test: true`
- Detail includes `endpoint: /api/admin/errors/test`
- Timestamp is recent (within last minute)

### Success Criteria
- ✅ Test error button triggers backend error
- ✅ Trace ID logged to console
- ✅ Backend logs contain trace ID
- ✅ Error appears in admin interface within 5 seconds
- ✅ Error details are correct and complete

---

## Additional Integration Tests

### Test: Trace ID Correlation Across Multiple Requests

**Objective:** Verify that different requests have different trace IDs

**Steps:**
1. Make multiple API requests
2. Collect trace IDs from each request
3. Verify all trace IDs are unique

**Expected Result:**
- Each request has a unique trace ID
- No trace ID collisions

### Test: Error Filtering

**Objective:** Verify that error filters work correctly

**Steps:**
1. Navigate to `/admin/errors`
2. Apply source filter (frontend/backend)
3. Apply date range filter
4. Search by trace ID

**Expected Result:**
- Filtered results match criteria
- Pagination works with filters
- Filters can be reset

### Test: Pagination

**Objective:** Verify pagination works correctly

**Steps:**
1. Navigate to `/admin/errors`
2. If total errors > 50, test pagination
3. Click "Next" and "Previous" buttons

**Expected Result:**
- Correct page numbers displayed
- Correct subset of errors shown
- Navigation buttons enabled/disabled appropriately

### Test: Non-Admin Access Control

**Objective:** Verify non-admin users cannot access error monitoring

**Steps:**
1. Login as non-admin user
2. Navigate to `/admin/errors`

**Expected Result:**
- "Access Denied" message displayed
- No error data visible
- User not redirected (stays on page with error message)

### Test: Unauthenticated Access

**Objective:** Verify unauthenticated users cannot access error monitoring

**Steps:**
1. Logout (clear authentication)
2. Navigate to `/admin/errors`

**Expected Result:**
- "Access Denied" message displayed
- Or redirect to login page (depending on implementation)

---

## Manual Testing Checklist

### Backend
- [ ] Trace ID middleware generates UUIDs when not provided
- [ ] Trace ID middleware preserves client-provided UUIDs
- [ ] Trace ID appears in all log messages
- [ ] Error events stored in database
- [ ] Admin endpoints require authentication
- [ ] Admin endpoints require admin role
- [ ] Test error endpoint triggers 500 error

### Frontend
- [ ] apiFetch generates trace IDs
- [ ] apiFetch includes trace IDs in headers
- [ ] apiFetch extracts trace IDs from responses
- [ ] Global error handler catches unhandled errors
- [ ] Error reports sent to backend
- [ ] Trace IDs logged to console
- [ ] Error monitoring page loads for admin
- [ ] Error monitoring page blocked for non-admin
- [ ] Error table displays errors
- [ ] Filters work correctly
- [ ] Pagination works correctly
- [ ] Trace ID click opens detail modal
- [ ] Test error button works

### Database
- [ ] error_events table exists
- [ ] Indexes on trace_id and created_at exist
- [ ] where_from constraint enforced
- [ ] Timestamps auto-generated
- [ ] Error details stored as JSONB

---

## Automated Test Execution

### Backend Tests
```bash
# Run all backend tests
python -m pytest backend/tests/ -v

# Run specific test file
python -m pytest backend/tests/test_error_router.py -v

# Run with coverage
python -m pytest backend/tests/ --cov=backend/src/common/modules/errors
```

### Frontend Tests (When Framework Installed)
```bash
# Install test framework
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react

# Run tests
npm test

# Run specific test
npm test -- api.test.js

# Run with coverage
npm test -- --coverage
```

---

## Test Results Template

### Test Execution Record

**Date:** ___________  
**Tester:** ___________  
**Environment:** Development / Staging / Production

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 17.1 | End-to-End Trace ID Flow | ⬜ Pass / ⬜ Fail | |
| 17.2 | Error Reporting Flow | ⬜ Pass / ⬜ Fail | |
| 17.3 | Test Error Button | ⬜ Pass / ⬜ Fail | |

**Issues Found:**
- 

**Overall Result:** ⬜ PASS / ⬜ FAIL

---

## Troubleshooting

### Issue: Trace ID not appearing in logs
**Solution:** 
- Check that trace middleware is registered in app.py
- Verify logger formatter is configured correctly
- Restart backend server

### Issue: Error not appearing in admin interface
**Solution:**
- Check backend logs for errors
- Verify database connection
- Check authentication token
- Verify admin role

### Issue: Test error button not working
**Solution:**
- Check browser console for errors
- Verify admin authentication
- Check backend is running
- Check network requests in DevTools

### Issue: Frontend build errors
**Solution:**
- Run `npm install` to ensure dependencies
- Check for syntax errors in new files
- Clear node_modules and reinstall if needed

---

## Conclusion

These integration tests verify the complete error tracking system functionality. All tests should pass before considering the feature complete and ready for production deployment.
