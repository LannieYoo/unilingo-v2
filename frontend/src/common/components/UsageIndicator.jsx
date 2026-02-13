/**
 * UsageIndicator component - Displays current usage and limits with color-coded visual feedback.
 */
import { useState, useEffect } from 'react';
import { useUsage } from '../contexts/UsageContext';

export function UsageIndicator({ usageType = 'total', label, onLimitExceeded }) {
  const {
    usage,
    loading,
    error,
    getUsageColor,
    isAtWarning,
    isLimitExceeded: limitExceeded,
  } = useUsage();

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [showPlanInfoModal, setShowPlanInfoModal] = useState(false);

  console.log('[UsageIndicator] Render:', { loading, error, usage, usageType, dictionarySearches: usage?.dictionarySearches });

  // Check for warning and blocking conditions
  useEffect(() => {
    if (!usage) return;

    // Show warning modal at 90%
    if (isAtWarning() && !limitExceeded()) {
      setShowWarningModal(true);
    }

    // Show blocking modal at 100%
    if (limitExceeded()) {
      setShowBlockingModal(true);
      if (onLimitExceeded) {
        onLimitExceeded();
      }
    }
  }, [usage, isAtWarning, limitExceeded, onLimitExceeded]);

  // Show loading state - return placeholder with same height to prevent layout shift
  if (loading) {
    console.log('[UsageIndicator] Showing loading state');
    return (
      <div className="usage-indicator p-4 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg" style={{ minHeight: '140px' }}>
        <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
          Loading usage data...
        </div>
      </div>
    );
  }

  // Show error state - return placeholder with same height to prevent layout shift
  if (error) {
    console.log('[UsageIndicator] Showing error state:', error);
    return (
      <div className="usage-indicator p-4 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg" style={{ minHeight: '140px' }}>
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load usage data: {error}
        </div>
      </div>
    );
  }

  // Don't render if no usage data
  if (!usage) {
    console.log('[UsageIndicator] No usage data, returning null');
    return null;
  }

  console.log('[UsageIndicator] Rendering usage data:', usage);

  // Get usage data based on type
  const getUsageData = () => {
    if (usageType === 'translator') {
      return {
        used: usage.translatorChars || 0,
        label: label || 'Translator',
        unit: 'characters',
        limit: usage.translatorLimit,
        percentage: usage.translatorPercentage
      };
    } else if (usageType === 'tts') {
      return {
        used: usage.ttsChars || 0,
        label: label || 'Text to Speech',
        unit: 'characters',
        limit: usage.ttsLimit,
        percentage: usage.ttsPercentage
      };
    } else if (usageType === 'stt_stream') {
      return {
        used: usage.sttStreamChars || 0,
        label: label || 'STT Stream',
        unit: 'characters',
        limit: usage.sttStreamLimit,
        percentage: usage.sttStreamPercentage
      };
    } else if (usageType === 'dictionary') {
      return {
        used: usage.dictionarySearches || 0,
        label: label || 'Dictionary',
        unit: 'searches',
        limit: usage.dictionaryLimit,
        percentage: usage.dictionaryPercentage
      };
    } else {
      // Default: show translator
      return {
        used: usage.translatorChars || 0,
        label: label || 'Translator',
        unit: 'characters',
        limit: usage.translatorLimit,
        percentage: usage.translatorPercentage
      };
    }
  };

  const usageData = getUsageData();
  const isAdmin = usageData.limit === null || usageData.limit === undefined;
  
  // Use feature-specific percentage
  const currentPercentage = usageData.percentage || 0;
  
  // Determine color based on percentage
  let color = 'green';
  if (currentPercentage >= 90) {
    color = 'red';
  } else if (currentPercentage >= 70) {
    color = 'yellow';
  }

  // Color classes
  const colorClasses = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const progressColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  // Get plan limits for info modal
  const getPlanLimits = () => {
    const limits = {
      guest: {
        translator: '5,000',
        tts: '8,000',
        stt_stream: '1,000',
        dictionary: '100'
      },
      pro: {
        translator: '50,000',
        tts: '80,000',
        stt_stream: '70,000',
        dictionary: '5,000'
      },
      pro_plus: {
        translator: '100,000',
        tts: '160,000',
        stt_stream: '140,000',
        dictionary: '10,000'
      }
    };
    return limits;
  };

  const planLimits = getPlanLimits();

  return (
    <>
      <div className="usage-indicator p-4 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg" style={{ minHeight: '140px' }}>
        {/* Usage Text */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-light dark:text-text-dark">
              {usageData.label} Usage
            </span>
            <button
              onClick={() => setShowPlanInfoModal(true)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="View plan limits"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </button>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${colorClasses[color]}`}>
            {usage.userLevel.toUpperCase()}
          </span>
        </div>

        {/* Usage Display */}
        {isAdmin ? (
          <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
            Used: <span className="font-semibold">{usageData.used.toLocaleString()}</span> {usageData.unit} (Unlimited)
          </div>
        ) : (
          <>
            <div className="text-sm text-text-muted-light dark:text-text-muted-dark mb-2">
              Used: <span className="font-semibold">{usageData.used.toLocaleString()}</span> / {usageData.limit.toLocaleString()} {usageData.unit} ({currentPercentage.toFixed(1)}%)
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${progressColorClasses[color]}`}
                style={{ width: `${Math.min(currentPercentage, 100)}%` }}
              />
            </div>
          </>
        )}

        {/* Month Display */}
        <div className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">
          Period: {usage.month}
        </div>
      </div>

      {/* Warning Modal (90%) */}
      {showWarningModal && !showBlockingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card-dark p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-yellow-500 text-3xl">warning</span>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Usage Warning
              </h3>
            </div>
            
            <p className="text-text-muted-light dark:text-text-muted-dark mb-4">
              You've used {usage.percentage.toFixed(1)}% of your monthly limit ({usage.totalChars.toLocaleString()} / {usage.limit.toLocaleString()} characters).
            </p>

            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
              Current plan: <span className="font-semibold">{usage.userLevel.toUpperCase()}</span>
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  // TODO: Navigate to upgrade page
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocking Modal (100%) */}
      {showBlockingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card-dark p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-red-500 text-3xl">block</span>
              <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Usage Limit Reached
              </h3>
            </div>
            
            <p className="text-text-muted-light dark:text-text-muted-dark mb-4">
              You've reached your monthly limit of {usage.limit.toLocaleString()} characters.
            </p>

            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
              Current plan: <span className="font-semibold">{usage.userLevel.toUpperCase()}</span>
            </p>

            {usage.userLevel === 'guest' && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                💡 Create an account to get 50,000 characters per month!
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowBlockingModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-light dark:text-text-dark rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowBlockingModal(false);
                  // TODO: Navigate to upgrade/signup page
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                {usage.userLevel === 'guest' ? 'Sign Up' : 'Upgrade Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Info Modal */}
      {showPlanInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPlanInfoModal(false)}>
          <div className="bg-white dark:bg-card-dark p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-text-light dark:text-text-dark">
                Monthly Usage Limits
              </h3>
              <button
                onClick={() => setShowPlanInfoModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Guest Plan */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-lg font-semibold text-text-light dark:text-text-dark">Guest / Pending</h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    FREE
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Translator:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.guest.translator} chars</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Text to Speech:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.guest.tts} chars</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">STT Stream:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.guest.stt_stream} chars</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Dictionary:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.guest.dictionary} searches</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="border-2 border-blue-500 dark:border-blue-400 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold text-text-light dark:text-text-dark">Pro (Approved)</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white">
                      RECOMMENDED
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    $5/month
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Translator:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro.translator} chars</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">(10x)</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Text to Speech:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro.tts} chars</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">(10x)</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">STT Stream:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro.stt_stream} chars</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">(70x)</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Dictionary:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro.dictionary} searches</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">(50x)</span>
                  </div>
                </div>
              </div>

              {/* Pro Plus Plan */}
              <div className="border border-purple-500 dark:border-purple-400 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold text-text-light dark:text-text-dark">Pro Plus</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500 text-white">
                      PREMIUM
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    $7/month
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Translator:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro_plus.translator} chars</span>
                    <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">(2x Pro)</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Text to Speech:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro_plus.tts} chars</span>
                    <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">(2x Pro)</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">STT Stream:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro_plus.stt_stream} chars</span>
                    <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">(2x Pro)</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Dictionary:</span>
                    <span className="ml-2 font-semibold text-text-light dark:text-text-dark">{planLimits.pro_plus.dictionary} searches</span>
                    <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">(2x Pro)</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="text-xs text-text-muted-light dark:text-text-muted-dark bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <p className="mb-1">📌 <strong>Note:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>All limits reset monthly</li>
                  <li>Each feature has independent usage tracking</li>
                  <li>Admin users have unlimited access</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPlanInfoModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UsageIndicator;
