/**
 * useAuth hook - Authentication logic.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../_05_stores';
import { GOOGLE_CLIENT_ID } from '../_08_constants';

export function useAuth() {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    fetchUser,
    clearError,
    setLoading,
  } = useAuthStore();
  
  const callbackProcessed = useRef(false);

  // Initialize auth state on mount
  useEffect(() => {
    if (tokens?.access_token && !user && !isLoading) {
      fetchUser();
    }
  }, [tokens?.access_token, user, isLoading, fetchUser]);

  // Handle OAuth callback on page load
  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing
      if (callbackProcessed.current) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && window.location.pathname === '/auth/callback') {
        callbackProcessed.current = true;
        
        try {
          setLoading(true);
          const redirectUri = `${window.location.origin}/auth/callback`;
          await login(code, redirectUri);
          // Clear URL params and redirect to home
          window.history.replaceState({}, document.title, '/');
        } catch (err) {
          console.error('OAuth callback error:', err);
          setLoading(false);
          window.history.replaceState({}, document.title, '/');
        }
      }
    };
    
    handleCallback();
  }, []); // Empty dependency - run only once on mount

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
