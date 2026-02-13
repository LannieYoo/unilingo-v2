/**
 * ApprovalStatusBadge component
 * Visual indicator for user approval status
 */
import PropTypes from 'prop-types';

/**
 * Badge component showing user approval status
 * @param {Object} props
 * @param {boolean} props.isApproved - Whether user is approved
 * @param {boolean} props.isActive - Whether user account is active
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Badge size
 * @param {boolean} [props.showTooltip=false] - Whether to show tooltip
 */
export function ApprovalStatusBadge({ 
  isApproved, 
  isActive, 
  size = 'md', 
  showTooltip = false 
}) {
  // Determine badge content and style
  let badgeText = '';
  let badgeClass = '';
  let tooltipText = '';

  if (!isActive) {
    badgeText = 'Inactive';
    badgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    tooltipText = 'Your account is inactive. Please contact an administrator.';
  } else if (!isApproved) {
    badgeText = 'Pending Approval';
    badgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    tooltipText = 'Your account is pending admin approval. You can view your profile but cannot use features yet.';
  } else {
    badgeText = 'Approved';
    badgeClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    tooltipText = 'Your account is approved and you have full access to all features.';
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="relative inline-block group">
      <span 
        className={`rounded-full font-medium ${badgeClass} ${sizeClasses[size]}`}
        title={showTooltip ? tooltipText : undefined}
      >
        {badgeText}
      </span>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltipText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

ApprovalStatusBadge.propTypes = {
  isApproved: PropTypes.bool.isRequired,
  isActive: PropTypes.bool.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showTooltip: PropTypes.bool,
};

export default ApprovalStatusBadge;
