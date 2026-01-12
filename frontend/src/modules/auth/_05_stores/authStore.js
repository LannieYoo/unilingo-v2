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
          error: '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.',
        });
      },

      /**
       * Clear session expired flag.
       */
      clearSessionExpired: () => set({ sessionExpired: false }),

      /**
       * Login with Google OAuth response.
       */
      login: async (code, redirectUri) => {
        set({ isLoading: true, error: null, sessionExpired: false });
        try {
          const response = await authService.googleCallback(code, redirectUri);
          const isAdmin = response.user && ADMIN_USER && response.user.email === ADMIN_USER;
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isAdmin,
            isLoading: false,
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
            // If refresh fails, logout
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isAdmin: false,
            });
          }
          throw error;
        }
      },

      /**
       * Get current user info.
       */
      fetchUser: async () => {
        const { tokens } = get();
        if (!tokens?.access_token) {
          return null;
        }

        set({ isLoading: true });
        try {
          const user = await authService.getMe(tokens.access_token);
          const isAdmin = user && ADMIN_USER && user.email === ADMIN_USER;
          set({ user, isAuthenticated: true, isAdmin, isLoading: false });
          return user;
        } catch (error) {
          // Check if session expired (logged in from another device)
          if (error.response?.data?.error?.code === 'SESSION_EXPIRED') {
            get().handleSessionExpired();
            set({ isLoading: false });
            return null;
          }
          
          // If token is invalid, try to refresh
          if (error.response?.status === 401) {
            try {
              await get().refreshToken();
              const newTokens = get().tokens;
              if (newTokens?.access_token) {
                const user = await authService.getMe(newTokens.access_token);
                const isAdmin = user && ADMIN_USER && user.email === ADMIN_USER;
                set({ user, isAuthenticated: true, isAdmin, isLoading: false });
                return user;
              }
            } catch (refreshError) {
              // Check if session expired during refresh
              if (refreshError.response?.data?.error?.code === 'SESSION_EXPIRED') {
                get().handleSessionExpired();
              } else {
                set({
                  user: null,
                  tokens: null,
                  isAuthenticated: false,
                  isAdmin: false,
                  isLoading: false,
                });
              }
            }
          }
          set({ isLoading: false });
          return null;
        }
      },

      /**
       * Clear error.
       */
      clearError: () => set({ error: null, sessionExpired: false }),
    }),
    {
      name: TOKEN_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

export default useAuthStore;
