/**
 * Session Expired Modal - Shows when user is logged out due to login from another device or token expiration.
 */
import { useAuthStore } from '../_05_stores';

export function SessionExpiredModal() {
  const { sessionExpired, tokenExpired, clearSessionExpired } = useAuthStore();

  // Show modal for either session expired or token expired
  const isVisible = sessionExpired || tokenExpired;

  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    clearSessionExpired();
  };

  // Different messages for different expiration types
  const isSessionExpired = sessionExpired;
  const title = isSessionExpired ? 'Session Expired' : 'Login Expired';
  const message = isSessionExpired
    ? 'You have been logged out because your account was signed in from another device or browser.'
    : 'Your login session has expired. Please log in again to continue.';
  const subMessage = isSessionExpired
    ? 'For security reasons, only one active session is allowed per account.'
    : 'For security reasons, sessions expire after a period of inactivity.';
  const iconColor = isSessionExpired ? 'bg-orange-500' : 'bg-blue-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-card-dark rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className={`${iconColor} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-2xl">
              {isSessionExpired ? 'warning' : 'schedule'}
            </span>
            <h2 className="text-lg font-semibold text-white">
              {title}
            </h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-text-light dark:text-text-dark text-base leading-relaxed">
            {message}
          </p>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-3">
            {subMessage}
          </p>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredModal;
