/**
 * User Profile component - Shows logged in user info with dropdown menu.
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../_04_hooks';
import { useAuthStore } from '../_05_stores';
import { LoginRequiredModal } from './LoginRequiredModal';

export function UserProfile({ className = '', compact = false, mobile = false, onMenuClick = () => {} }) {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { isAdmin } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginFeatureName, setLoginFeatureName] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    setIsDropdownOpen(false);
    onMenuClick();
    logout();
  };

  const handleProtectedMenuClick = (featureName, path) => {
    if (!isAuthenticated) {
      setLoginFeatureName(featureName);
      setShowLoginModal(true);
      return;
    }
    // If authenticated, navigate normally
    onMenuClick();
  };

  // Default avatar fallback
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random&size=128`;

  // Mobile mode - inline menu items (no dropdown)
  if (mobile) {
    return (
      <>
        <div className={`user-profile-mobile ${className}`}>
          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <img
              src={user.avatar_url || defaultAvatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                {user.name}
              </p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Translation History */}
            {isAuthenticated ? (
              <Link
                to="/translator/history"
                onClick={onMenuClick}
                className="flex items-center gap-2 px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">translate</span>
                Translation History
              </Link>
            ) : (
              <button
                onClick={() => handleProtectedMenuClick('Translation History')}
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">translate</span>
                Translation History
              </button>
            )}

            {/* Dictionary History */}
            {isAuthenticated ? (
              <Link
                to="/dictionary/history"
                onClick={onMenuClick}
                className="flex items-center gap-2 px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">book</span>
                Dictionary History
              </Link>
            ) : (
              <button
                onClick={() => handleProtectedMenuClick('Dictionary History')}
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">book</span>
                Dictionary History
              </button>
            )}

            {/* Settings */}
            <Link
              to="/settings"
              onClick={onMenuClick}
              className="flex items-center gap-2 px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              Settings
            </Link>

            {/* Admin - only for admin users */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={onMenuClick}
                className="flex items-center gap-2 px-2 py-2 text-sm text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                Admin
              </Link>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              {isLoading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        {/* Login Required Modal */}
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          featureName={loginFeatureName}
        />
      </>
    );
  }

  // Compact mode for header with dropdown
  if (compact) {
    return (
      <>
        <div className={`user-profile-compact ${className} relative`} ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src={user.avatar_url || defaultAvatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
            <span className="text-sm font-medium text-text-light dark:text-text-dark hidden sm:inline">
              {user.name}
            </span>
            <span className="material-symbols-outlined text-sm text-text-muted-light dark:text-text-muted-dark">
              {isDropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50 overflow-hidden">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
                <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                  {user.name}
                </p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                  {user.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {/* Translation History */}
                {isAuthenticated ? (
                  <Link
                    to="/translator/history"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">translate</span>
                    Translation History
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleProtectedMenuClick('Translation History');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">translate</span>
                    Translation History
                  </button>
                )}

                {/* Dictionary History */}
                {isAuthenticated ? (
                  <Link
                    to="/dictionary/history"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">book</span>
                    Dictionary History
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleProtectedMenuClick('Dictionary History');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">book</span>
                    Dictionary History
                  </button>
                )}

                {/* Settings */}
                <Link
                  to="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Settings
                </Link>

                {/* Admin - only for admin users */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    Admin
                  </Link>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-border-light dark:border-border-dark py-1">
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  {isLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Login Required Modal */}
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          featureName={loginFeatureName}
        />
      </>
    );
  }

  return (
    <div
      className={`user-profile ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <img
        src={user.avatar_url || defaultAvatar}
        alt={user.name}
        referrerPolicy="no-referrer"
        onError={(e) => { e.target.src = defaultAvatar; }}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
      
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#1a1a1a',
          }}
        >
          {user.name}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#666',
          }}
        >
          {user.email}
        </span>
      </div>
      
      <button
        onClick={logout}
        disabled={isLoading}
        style={{
          padding: '6px 12px',
          backgroundColor: 'transparent',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          color: '#666',
          marginLeft: '8px',
        }}
      >
        {isLoading ? '...' : 'Logout'}
      </button>
    </div>
  );
}

export default UserProfile;
