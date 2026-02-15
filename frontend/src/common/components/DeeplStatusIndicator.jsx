/**
 * DeeplStatusIndicator - Shows DeepL API status for dictionary translations
 */
import { useAuthStore } from '../../modules/auth/_05_stores/authStore';

export function DeeplStatusIndicator() {
  const { user } = useAuthStore();
  const deeplStatus = user?.deepl_status;

  if (!deeplStatus) {
    return null;
  }

  const { available, has_quota, usage_info } = deeplStatus;

  // DeepL not configured
  if (!available) {
    return (
      <div className="deepl-status-indicator p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="material-symbols-outlined text-base">info</span>
          <span>Using free translation service</span>
        </div>
      </div>
    );
  }

  // DeepL configured but quota exceeded
  if (!has_quota) {
    return (
      <div className="deepl-status-indicator p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
          <span className="material-symbols-outlined text-base">warning</span>
          <span>DeepL quota exceeded - using free translation service</span>
        </div>
        {usage_info && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 ml-6">
            Used: {usage_info.used.toLocaleString()} / {usage_info.limit.toLocaleString()} characters
          </div>
        )}
      </div>
    );
  }

  // DeepL available and has quota
  const usagePercent = usage_info ? (usage_info.used / usage_info.limit) * 100 : 0;
  let statusColor = 'green';
  if (usagePercent >= 90) {
    statusColor = 'red';
  } else if (usagePercent >= 70) {
    statusColor = 'yellow';
  }

  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  };

  return (
    <div className={`deepl-status-indicator p-3 border rounded-lg ${colorClasses[statusColor]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>Using DeepL (Premium Quality)</span>
        </div>
        {usage_info && (
          <div className="text-xs">
            {usage_info.remaining.toLocaleString()} / {usage_info.limit.toLocaleString()} chars left
          </div>
        )}
      </div>
      {usage_info && usagePercent >= 70 && (
        <div className="text-xs mt-1 ml-6">
          {usagePercent >= 90 ? '⚠️ Almost at limit' : '⚡ Running low'}
        </div>
      )}
    </div>
  );
}

export default DeeplStatusIndicator;
