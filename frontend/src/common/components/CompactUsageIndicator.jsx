/**
 * CompactUsageIndicator - Compact usage display for header
 */
import { useUsage } from '../contexts/UsageContext';
import { useAuthStore } from '../../modules/auth/_05_stores/authStore';

export function CompactUsageIndicator() {
  const { isAuthenticated } = useAuthStore();
  const {
    usage,
    loading,
    error,
    getUsageColor,
    fetchUsage,
  } = useUsage();

  // Debug logging - log the actual usage object
  console.log('CompactUsageIndicator render:', { 
    isAuthenticated, 
    loading, 
    error, 
    usage,
    usageStringified: JSON.stringify(usage)
  });

  // Don't show loading state to prevent layout shift
  if (loading) {
    return null;
  }

  // Show error state - but don't show error for admin users
  if (error && !error.includes('admin')) {
    console.error('Usage indicator error:', error);
    return null; // Silently hide on error instead of showing error message
  }

  // Don't render if no usage data
  if (!usage || !usage.totalChars === undefined) {
    console.log('No usage data available');
    return null;
  }

  const color = getUsageColor();
  const isAdmin = usage.limit === null || usage.limit === undefined;

  // Color classes for badge
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  // Don't show for admin users (unlimited)
  if (isAdmin) {
    console.log('Admin user - not showing usage indicator');
    return null;
  }

  console.log('Rendering usage indicator:', { color, totalChars: usage.totalChars, limit: usage.limit });

  return (
    <div 
      className={`compact-usage-indicator flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${colorClasses[color]}`}
      title={`${usage.totalChars.toLocaleString()} / ${usage.limit.toLocaleString()} characters used (${usage.percentage.toFixed(1)}%)`}
      onClick={() => {
        console.log('Manual refresh clicked');
        fetchUsage();
      }}
      style={{ cursor: 'pointer' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
        {color === 'red' ? 'warning' : color === 'yellow' ? 'info' : 'check_circle'}
      </span>
      <span className="hidden sm:inline">
        {usage.totalChars.toLocaleString()} / {usage.limit.toLocaleString()}
      </span>
      <span className="sm:hidden">
        {usage.percentage.toFixed(0)}%
      </span>
    </div>
  );
}

export default CompactUsageIndicator;
