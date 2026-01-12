/**
 * Session Expired Modal - Shows when user is logged out due to login from another device.
 */
import { useAuthStore } from '../_05_stores';

export function SessionExpiredModal() {
  const { sessionExpired, clearSessionExpired } = useAuthStore();

  if (!sessionExpired) {
    return null;
  }

  const handleClose = () => {
    clearSessionExpired();
  };

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
        <div className="bg-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-2xl">
              warning
            </span>
            <h2 className="text-lg font-semibold text-white">
              Session Expired
            </h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-text-light dark:text-text-dark text-base leading-relaxed">
            You have been logged out because your account was signed in from another device or browser.
          </p>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-3">
            For security reasons, only one active session is allowed per account.
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
