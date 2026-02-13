/**
 * PendingApprovalMessage component
 * Informational message for pending approval users
 */
import PropTypes from 'prop-types';

/**
 * Message component explaining pending approval status
 * @param {Object} props
 * @param {'banner' | 'modal' | 'inline'} [props.variant='banner'] - Display variant
 * @param {boolean} [props.showInstructions=true] - Whether to show approval instructions
 * @param {Function} [props.onContactAdmin] - Callback for contact admin button
 * @param {Function} [props.onClose] - Callback for close button (modal variant)
 */
export function PendingApprovalMessage({ 
  variant = 'banner', 
  showInstructions = true,
  onContactAdmin,
  onClose
}) {
  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-start">
          <span className="material-symbols-outlined text-yellow-400 mr-3 mt-0.5">info</span>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Account Pending Approval
            </h3>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
              <p>
                Your account is currently pending admin approval. While you wait:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>✅ You can view and edit your profile</li>
                <li>✅ You can change your settings</li>
                <li>❌ You cannot use translation, STT, or dictionary features</li>
              </ul>
              {showInstructions && (
                <p className="mt-2">
                  <strong>How to get approved:</strong> An administrator will review your account shortly. 
                  You'll receive full access once approved.
                </p>
              )}
              {onContactAdmin && (
                <button
                  onClick={onContactAdmin}
                  className="mt-2 text-yellow-800 dark:text-yellow-200 underline hover:no-underline"
                >
                  Contact Administrator
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-yellow-500 text-3xl">pending</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Account Pending Approval
            </h3>
          </div>
          
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3 mb-6">
            <p>
              Your account is currently pending admin approval.
            </p>
            
            <div>
              <p className="font-medium mb-2">What you can do:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>✅ View and edit your profile</li>
                <li>✅ Change your settings</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium mb-2">What you cannot do:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>❌ Use translation features</li>
                <li>❌ Use speech-to-text features</li>
                <li>❌ Use dictionary features</li>
              </ul>
            </div>
            
            {showInstructions && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                  How to get approved:
                </p>
                <p className="text-blue-800 dark:text-blue-300">
                  An administrator will review your account shortly. You'll receive full access once approved.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            )}
            {onContactAdmin && (
              <button
                onClick={onContactAdmin}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                Contact Admin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-yellow-500 text-xl mt-0.5">info</span>
        <div className="flex-1 text-sm">
          <p className="text-yellow-900 dark:text-yellow-100 font-medium mb-2">
            This feature requires account approval
          </p>
          <p className="text-yellow-800 dark:text-yellow-200 mb-2">
            Your account is pending admin approval. You can view your profile and settings, 
            but cannot use core features yet.
          </p>
          {showInstructions && (
            <p className="text-yellow-700 dark:text-yellow-300 text-xs">
              An administrator will review your account shortly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

PendingApprovalMessage.propTypes = {
  variant: PropTypes.oneOf(['banner', 'modal', 'inline']),
  showInstructions: PropTypes.bool,
  onContactAdmin: PropTypes.func,
  onClose: PropTypes.func,
};

export default PendingApprovalMessage;
