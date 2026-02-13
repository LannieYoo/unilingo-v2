/**
 * useUsage hook - Manages usage data and state.
 */
import { useState, useEffect, useCallback } from 'react';
import { usageService } from '../services/usageService';
import { useAuthStore } from '../../modules/auth/_05_stores/authStore';

export const useUsage = () => {
  const { tokens, isAuthenticated } = useAuthStore();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch current usage from API or localStorage.
   */
  const fetchUsage = useCallback(async () => {
    console.log('[useUsage] fetchUsage called, isAuthenticated:', isAuthenticated);
    
    // Guest user - use backend API (IP-based)
    if (!isAuthenticated) {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[useUsage] Fetching guest usage...');
        const data = await usageService.getGuestUsage();
        console.log('[useUsage] Guest usage data received:', data);
        // Force new object reference to trigger re-render
        const newUsage = {
          ...data,
          _timestamp: Date.now() // Add timestamp to force new reference
        };
        setUsage(newUsage);
        console.log('[useUsage] setUsage called with:', newUsage);
      } catch (err) {
        console.error('Failed to fetch guest usage:', err);
        setError('Failed to fetch usage');
        setUsage(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Authenticated user - use API
    if (!tokens?.access_token) {
      console.log('[useUsage] No access token');
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useUsage] Fetching authenticated user usage...');
      const data = await usageService.getCurrentUsage(tokens.access_token);
      console.log('[useUsage] User usage data received:', data);
      // Force new object reference to trigger re-render
      const newUsage = {
        ...data,
        _timestamp: Date.now() // Add timestamp to force new reference
      };
      setUsage(newUsage);
      console.log('[useUsage] setUsage called with:', newUsage);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to fetch usage';
      setError(errorMessage);
      // Set usage to null on error so component can handle it
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, tokens?.access_token]);

  /**
   * Track usage after processing.
   * 
   * @param {number} charCount - Number of characters processed
   * @param {string} usageType - Type of usage: 'translation' or 'stt'
   */
  const trackUsage = useCallback(async (charCount, usageType) => {
    console.log('[useUsage] trackUsage called:', { charCount, usageType, isAuthenticated });
    
    // Guest user - use backend API (IP-based)
    if (!isAuthenticated) {
      try {
        console.log('[useUsage] Tracking guest usage...');
        await usageService.trackGuestUsage(charCount, usageType);
        console.log('[useUsage] Guest usage tracked, fetching updated usage...');
        await fetchUsage(); // Refresh display
        console.log('[useUsage] Usage refreshed');
      } catch (err) {
        console.error('[useUsage] Failed to track guest usage:', err);
      }
      return;
    }

    // Authenticated user - use API
    if (!tokens?.access_token) {
      console.log('[useUsage] No access token, skipping tracking');
      return;
    }

    try {
      console.log('[useUsage] Tracking authenticated user usage...');
      await usageService.trackUsage(tokens.access_token, charCount, usageType);
      console.log('[useUsage] Usage tracked, fetching updated usage...');
      // Refresh usage data after tracking
      await fetchUsage();
      console.log('[useUsage] Usage refreshed');
    } catch (err) {
      console.error('[useUsage] Failed to track usage:', err);
      // Don't throw error - tracking failure shouldn't block user
    }
  }, [isAuthenticated, tokens?.access_token, fetchUsage]);

  /**
   * Check if request would exceed limit.
   * 
   * @param {number} charCount - Number of characters to check
   * @returns {boolean} True if within limit, false if would exceed
   */
  const checkLimit = useCallback((charCount) => {
    if (!usage) {
      return true; // Allow if no usage data yet
    }

    // Admin users have unlimited access
    if (usage.limit === null || usage.limit === undefined) {
      return true;
    }

    // Check if current + new usage would exceed limit
    const newTotal = usage.totalChars + charCount;
    return newTotal <= usage.limit;
  }, [usage]);

  /**
   * Get color based on usage percentage.
   * 
   * @returns {string} Color class: 'green', 'yellow', or 'red'
   */
  const getUsageColor = useCallback(() => {
    if (!usage || usage.percentage === null || usage.percentage === undefined) {
      return 'green'; // Default for admin or no data
    }

    if (usage.percentage < 70) {
      return 'green';
    } else if (usage.percentage < 90) {
      return 'yellow';
    } else {
      return 'red';
    }
  }, [usage]);

  /**
   * Check if usage is at warning threshold (90%).
   * 
   * @returns {boolean} True if at or above 90%
   */
  const isAtWarning = useCallback(() => {
    if (!usage || usage.percentage === null || usage.percentage === undefined) {
      return false;
    }
    return usage.percentage >= 90;
  }, [usage]);

  /**
   * Check if usage limit is exceeded (100%).
   * 
   * @returns {boolean} True if at or above 100%
   */
  const isLimitExceeded = useCallback(() => {
    if (!usage || usage.percentage === null || usage.percentage === undefined) {
      return false;
    }
    return usage.percentage >= 100;
  }, [usage]);

  // Fetch usage on mount and when authentication changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    loading,
    error,
    fetchUsage,
    trackUsage,
    checkLimit,
    getUsageColor,
    isAtWarning,
    isLimitExceeded,
  };
};

export default useUsage;
