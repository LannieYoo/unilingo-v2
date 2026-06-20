/**
 * Auth store using Zustand.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../_06_services';
import { TOKEN_STORAGE_KEY, ADMIN_USER } from '../_08_constants';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      error: null,
      sessionExpired: false,  // For showing session expired message
      tokenExpired: false,    // For showing token expired message
      pendingApproval: false, // User logged in but not approved by admin
      _rehydrationValidating: false, // Flag to prevent race with TokenRefreshManager

      // Actions
      setUser: (user) => {
        const isAdmin = user && ADMIN_USER && user.email === ADMIN_USER;
        set({ user, isAuthenticated: !!user, isAdmin });
      },
      
      setTokens: (tokens) => set({ tokens }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      /**
       * Handle session expired (logged in from another device).
       */
      handleSessionExpired: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isAdmin: false,
          sessionExpired: true,
          tokenExpired: false,
          error: '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.',
        });
      },

      /**
       * Handle token expired (JWT expired).
       */
      handleTokenExpired: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isAdmin: false,
          sessionExpired: false,
          tokenExpired: true,
          error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
        });
      },

      /**
       * Clear session expired flag.
       */
      clearSessionExpired: () => set({ sessionExpired: false, tokenExpired: false, pendingApproval: false }),

      /**
       * Login with Google OAuth response.
       */
      login: async (code, redirectUri) => {
        set({ isLoading: true, error: null, sessionExpired: false, pendingApproval: false });
        try {
          const response = await authService.googleCallback(code, redirectUri);
          const isAdmin = response.user && ADMIN_USER && response.user.email === ADMIN_USER;
          
          // Check if user is approved (admin is always approved)
          if (!isAdmin && !response.user?.is_approved) {
            // User is not approved — show pending approval screen
            set({
              user: response.user,
              tokens: null, // Don't store tokens for unapproved users
              isAuthenticated: false,
              isAdmin: false,
              isLoading: false,
              pendingApproval: true,
            });
            return response;
          }
          
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isAdmin,
            isLoading: false,
            pendingApproval: false,
          });
          return response;
        } catch (error) {
          set({
            error: error.response?.data?.error?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Logout.
       */
      logout: async () => {
        const { tokens } = get();
        try {
          if (tokens?.access_token) {
            await authService.logout(tokens.access_token);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isAdmin: false,
            error: null,
            sessionExpired: false,
            pendingApproval: false,
          });
        }
      },

      /**
       * Refresh access token.
       */
      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refresh_token) {
          return null;
        }

        try {
          const newTokens = await authService.refreshToken(tokens.refresh_token);
          set({ tokens: newTokens });
          return newTokens;
        } catch (error) {
          // Check if session expired (logged in from another device)
          if (error.response?.data?.error?.code === 'SESSION_EXPIRED') {
            get().handleSessionExpired();
          } else {
            get().handleTokenExpired();
          }
          throw error;
        }
      },

      /**
       * Get current user info.
       * The response interceptor handles 401 → token refresh → retry automatically.
       */
      fetchUser: async () => {
        const { tokens } = get();
        if (!tokens?.access_token) {
          // 토큰이 없으면 로그아웃 상태로 설정
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
          });
          return null;
        }

        set({ isLoading: true });
        try {
          // If token is expired, the interceptor will auto-refresh and retry
          const user = await authService.getMe(tokens.access_token);
          const isAdmin = user && ADMIN_USER && user.email === ADMIN_USER;
          
          // Check if user is approved (admin is always approved)
          if (!isAdmin && !user?.is_approved) {
            console.log('[Auth] User is not approved, showing pending approval screen');
            set({
              user,
              tokens: null,
              isAuthenticated: false,
              isAdmin: false,
              isLoading: false,
              pendingApproval: true,
            });
            return null;
          }
          
          // Re-read tokens from store — interceptor may have refreshed them during getMe()
          const currentTokens = get().tokens;
          if (!currentTokens?.access_token) {
            // Tokens were cleared while we were fetching (e.g., handleTokenExpired called)
            // Don't restore isAuthenticated — stay logged out
            console.log('[Auth] fetchUser succeeded but tokens were cleared mid-flight, staying logged out');
            set({ isLoading: false });
            return null;
          }
          set({ user, tokens: currentTokens, isAuthenticated: true, isAdmin, isLoading: false });
          return user;
        } catch (error) {
          // The interceptor already handled 401 (refresh/logout).
          // For non-401 errors (network, server), keep current auth state.
          if (error.response?.status === 401 || error.response?.status === 403) {
            // Auth-related failure — interceptor already called handleTokenExpired/handleSessionExpired
            set({ isLoading: false });
          } else {
            // Network error, 500, etc. — don't log out, just stop loading
            console.error('Failed to fetch user (non-auth error):', error.message);
            set({ isLoading: false });
          }
          return null;
        }
      },

      /**
       * Clear error.
       */
      clearError: () => set({ error: null, sessionExpired: false, tokenExpired: false, pendingApproval: false }),
    }),
    {
      name: TOKEN_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[Auth] Hydration failed:', error);
            return;
          }
          if (state?.tokens?.access_token) {
            // Tokens exist → validate with server
            console.log('[Auth] Hydrated with stored tokens, validating with server...');
            useAuthStore.setState({ _rehydrationValidating: true });
            setTimeout(async () => {
              try {
                await useAuthStore.getState().fetchUser();
              } catch (e) {
                console.error('[Auth] Rehydration fetchUser failed:', e);
              } finally {
                useAuthStore.setState({ _rehydrationValidating: false });
              }
            }, 0);
          } else if (state?.isAuthenticated || state?.user) {
            // ★ INCONSISTENT STATE: isAuthenticated/user without tokens
            // This happens when tokens expired and were cleared, but user/isAuthenticated
            // survived in localStorage. Clear everything to prevent fake login appearance.
            console.log('[Auth] Inconsistent state detected: authenticated but no tokens. Clearing auth state.');
            setTimeout(() => {
              useAuthStore.setState({
                user: null,
                tokens: null,
                isAuthenticated: false,
                isAdmin: false,
                tokenExpired: false,
                sessionExpired: false,
                error: null,
              });
            }, 0);
          } else {
            console.log('[Auth] Hydrated without tokens (not logged in)');
          }
        };
      },
    }
  )
);

export default useAuthStore;
