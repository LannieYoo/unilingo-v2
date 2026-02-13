/**
 * useApprovalStatus hook
 * Hook for checking user approval status
 */
import { useMemo } from 'react';
import { useAuthStore } from '../../modules/auth/_05_stores';

/**
 * Hook to check user approval status
 * @returns {ApprovalStatus} Approval status object
 */
export function useApprovalStatus() {
  const { user, isAuthenticated } = useAuthStore();

  const approvalStatus = useMemo(() => {
    if (!isAuthenticated || !user) {
      return {
        isApproved: false,
        isActive: false,
        isPending: false,
        canAccessFeatures: false,
      };
    }

    const isApproved = user.is_approved === true;
    const isActive = user.is_active !== false; // Default to true if not specified
    const isPending = isActive && !isApproved;
    const canAccessFeatures = isActive && isApproved;

    return {
      isApproved,
      isActive,
      isPending,
      canAccessFeatures,
    };
  }, [user, isAuthenticated]);

  return approvalStatus;
}

export default useApprovalStatus;
