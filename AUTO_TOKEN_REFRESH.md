# Auto Token Refresh Feature

## Overview

Automatic token refresh system that extends user login sessions when they are actively using the application.

## How It Works

### Token Expiry
- Access tokens expire after 60 minutes (1 hour) by default
- Refresh tokens expire after 7 days by default

### Activity Tracking
The system tracks user activity through:
- Mouse movements (mousedown)
- Keyboard input (keydown)
- Scrolling (scroll)
- Touch events (touchstart)

### Automatic Refresh Logic
1. **Activity Check**: Every 5 minutes, the system checks if the user is active
2. **Inactivity Timeout**: User is considered inactive after 30 minutes of no activity
3. **Proactive Refresh**: If the token expires in less than 10 minutes AND the user is active, the token is automatically refreshed
4. **Silent Operation**: Refresh happens in the background without user interaction

### Configuration

Constants in `TokenRefreshManager.jsx`:
```javascript
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;      // Check every 5 minutes
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000;   // Refresh 10 minutes before expiry
const ACTIVITY_TIMEOUT = 30 * 60 * 1000;        // Consider inactive after 30 minutes
```

## Implementation

### Component
- **File**: `frontend/src/modules/auth/_03_components/TokenRefreshManager.jsx`
- **Type**: Background component (renders nothing)
- **Location**: Mounted in `App.jsx` at root level

### Integration
```jsx
// App.jsx
import { TokenRefreshManager } from './modules/auth'

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <UsageProvider>
        <TokenRefreshManager />  {/* Auto refresh manager */}
        <AppContent />
        <SessionExpiredModal />
      </UsageProvider>
    </GoogleOAuthProvider>
  )
}
```

## User Experience

### Before
- User logged out after 60 minutes regardless of activity
- Frequent re-login required during active sessions

### After
- Active users stay logged in indefinitely
- Inactive users (30+ minutes) are logged out after token expiry
- Seamless experience with no interruptions

## Backend Configuration

Token expiry settings in `backend/src/common/enum.py`:
```python
AUTH_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours (not used, overridden by env)
AUTH_REFRESH_TOKEN_EXPIRE_DAYS = 30
```

Environment variables (`.env`):
```
ACCESS_TOKEN_EXPIRE_MINUTES=60    # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS=7       # 7 days
```

## Security Considerations

1. **Activity-Based**: Only refreshes for active users
2. **Inactivity Timeout**: Prevents indefinite sessions for abandoned browsers
3. **Token Version**: Backend enforces single-session per user via token_version
4. **Secure Refresh**: Uses refresh token (not access token) for renewal

## Troubleshooting

### Token Not Refreshing
- Check browser console for `[TokenRefresh]` logs
- Verify user is authenticated (`isAuthenticated === true`)
- Ensure activity events are firing (move mouse, type, scroll)
- Check token expiry time in JWT payload

### Still Getting Logged Out
- Verify `ACTIVITY_TIMEOUT` is appropriate for your use case
- Check if refresh token itself has expired (7 days default)
- Ensure backend refresh endpoint is working
- Check for session conflicts (logged in from another device)

## Future Enhancements

Potential improvements:
- Configurable timeouts per user level
- Activity intensity tracking (distinguish active vs passive)
- Warning before logout for inactive users
- Refresh on API calls (not just periodic checks)
