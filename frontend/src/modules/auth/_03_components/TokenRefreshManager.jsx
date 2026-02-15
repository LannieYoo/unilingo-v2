// Token refresh manager - automatically refreshes token on user activity
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../_05_stores/authStore';

const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000; // Refresh 10 minutes before expiry
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // Consider inactive after 30 minutes

export function TokenRefreshManager() {
  const { tokens, isAuthenticated, refreshToken } = useAuthStore();
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef(null);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated]);

  // Periodic token check and refresh
  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) return;

    const checkAndRefreshToken = async () => {
      const now = Date.now();
      const lastActivity = lastActivityRef.current;
      const timeSinceActivity = now - lastActivity;

      // Skip if user is inactive
      if (timeSinceActivity > ACTIVITY_TIMEOUT) {
        return;
      }

      // Decode token to get expiry time
      try {
        const tokenParts = tokens.access_token.split('.');
        if (tokenParts.length !== 3) return;

        const payload = JSON.parse(atob(tokenParts[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const timeUntilExpiry = expiryTime - now;

        // Refresh if token expires soon
        if (timeUntilExpiry < REFRESH_BEFORE_EXPIRY && timeUntilExpiry > 0) {
          console.log('[TokenRefresh] Refreshing token proactively');
          await refreshToken();
        }
      } catch (error) {
        console.error('[TokenRefresh] Error checking token:', error);
      }
    };

    // Initial check
    checkAndRefreshToken();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, tokens, refreshToken]);

  return null; // This component doesn't render anything
}

export default TokenRefreshManager;
