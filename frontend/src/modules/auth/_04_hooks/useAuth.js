/**
 * useAuth hook - Authentication logic.
 */
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../_05_stores';
import { GOOGLE_CLIENT_ID } from '../_08_constants';

// Global flag to prevent double processing across all hook instances
let callbackProcessing = false;

export function useAuth() {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    logout,
    fetchUser,
    clearError,
    setLoading,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    if (tokens?.access_token && !user && !isLoading) {
      fetchUser();
    }
  }, [tokens?.access_token, user, isLoading, fetchUser]);

  // Handle OAuth callback on page load
  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing globally
      if (callbackProcessing) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && window.location.pathname === '/auth/callback') {
        // Set global flag immediately and clear URL to prevent re-processing
        callbackProcessing = true;
        window.history.replaceState({}, document.title, '/auth/callback');
        setLoading(true);
        
        try {
          const redirectUri = `${window.location.origin}/auth/callback`;
          await storeLogin(code, redirectUri);
        } catch (err) {
          console.error('OAuth callback error:', err);
        } finally {
          setLoading(false);
          callbackProcessing = false;
        }
      }
    };
    
    handleCallback();
  }, [storeLogin, setLoading]);

  // Google login handler - redirect method (no popup)
  const googleLogin = useCallback(() => {
    const clientId = GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'openid email profile';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    
    // Redirect to Google OAuth
    window.location.href = authUrl.toString();
  }, []);

  // Logout handler
  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login: googleLogin,
    logout: handleLogout,
    clearError,
  };
}

export default useAuth;
