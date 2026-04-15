/**
 * User Profile component - Shows logged in user info with dropdown menu.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated, user]);

  // Early return AFTER all hooks
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    onMenuClick();
    await logout();
    navigate('/');
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
    // Get user level display info
    const getUserLevelBadge = () => {
      if (!user.user_level) return null;
      
      const isAdmin = user.user_level === 'admin';
      const isApproved = user.is_approved;
      
      // Admin users - always show Admin badge
      if (isAdmin) {
        return (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              Admin
            </span>
          </div>
        );
      }
      
      // Guest users - show Guest badge
      if (user.user_level === 'guest') {
        return (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Guest
            </span>
          </div>
        );
      }
      
      // Pro/Pro+ users - check approval status
      if (!isApproved) {
        return (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              Pending Approval
            </span>
          </div>
        );
      }
      
      // Approved Pro/Pro+ users
      const levelConfig = {
        pro_plus: { label: 'Pro+', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        pro: { label: 'Pro', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      };
      
      const config = levelConfig[user.user_level];
      if (!config) return null;
      
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      );
    };

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
              {getUserLevelBadge()}
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

            {/* Favorite Words */}
            {isAuthenticated ? (
              <Link
                to="/dictionary/history"
                onClick={onMenuClick}
                className="flex items-center gap-2 px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">star</span>
                Favorite Words
              </Link>
            ) : (
              <button
                onClick={() => handleProtectedMenuClick('Favorite Words')}
                className="flex items-center gap-2 w-full px-2 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <span className="material-symbols-outlined text-lg">star</span>
                Favorite Words
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
    // Get user level display info
    const getUserLevelBadge = () => {
      if (!user.user_level) return null;
      
      const isAdmin = user.user_level === 'admin';
      const isApproved = user.is_approved;
      
      // Admin users - always show Admin badge
      if (isAdmin) {
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              Admin
            </span>
          </div>
        );
      }
      
      // Guest users - show Guest badge
      if (user.user_level === 'guest') {
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Guest
            </span>
          </div>
        );
      }
      
      // Pro/Pro+ users - check approval status
      if (!isApproved) {
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              Pending Approval
            </span>
          </div>
        );
      }
      
      // Approved Pro/Pro+ users
      const levelConfig = {
        pro_plus: { label: 'Pro+', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        pro: { label: 'Pro', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      };
      
      const config = levelConfig[user.user_level];
      if (!config) return null;
      
      return (
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      );
    };

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
            <div className="hidden sm:flex sm:flex-col sm:items-start sm:gap-0.5">
              <span className="text-sm font-medium text-text-light dark:text-text-dark">
                {user.name}
              </span>
              {getUserLevelBadge()}
            </div>
            <span className="material-symbols-outlined text-sm text-text-muted-light dark:text-text-muted-dark">
              {isDropdownOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50 overflow-hidden">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
                <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                  {user.name}
                </p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate mb-2">
                  {user.email}
                </p>
                {getUserLevelBadge()}
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

                {/* Favorite Words */}
                {isAuthenticated ? (
                  <Link
                    to="/dictionary/history"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">star</span>
                    Favorite Words
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleProtectedMenuClick('Favorite Words');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">star</span>
                    Favorite Words
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
