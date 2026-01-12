/**
 * Auth routes.
 */
import { lazy } from 'react';

// Auth callback page (if needed)
// const AuthCallback = lazy(() => import('../_02_views/AuthCallbackView'));

/**
 * Get auth routes.
 */
export function getAuthRoutes(options = {}) {
  const {
    basePath = 'auth',
    LazyWrapper = ({ children }) => children,
  } = options;

  return {
    path: basePath,
    children: [
      // Add auth-specific routes here if needed
      // {
      //   path: 'callback',
      //   element: (
      //     <LazyWrapper>
      //       <AuthCallback />
      //     </LazyWrapper>
      //   ),
      // },
    ],
  };
}

export const routes = getAuthRoutes();
export default routes;
