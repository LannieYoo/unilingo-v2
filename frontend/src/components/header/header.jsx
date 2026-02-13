import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LogoIcon from './LogoIcon'
import { useAuthStore, GoogleLoginButton, UserProfile, SessionExpiredModal } from '../../modules/auth'
import { CompactUsageIndicator } from '../../common/components/CompactUsageIndicator'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated, tokenExpired, clearSessionExpired } = useAuthStore()

  const menuItems = [
    { path: '/', label: 'Translator', name: 'home' },
    { path: '/dictionary', label: 'Dictionary', name: 'dictionary' },
    { path: '/text-to-speech', label: 'Text to Speech', name: 'textToSpeech' },
    { path: '/stt-stream', label: 'Speech to Text', name: 'speechToText' },
    { path: '/speech-to-recording', label: 'Recording', name: 'recording' },
  ]

  // Menu items (Admin moved to user profile dropdown)
  const allMenuItems = menuItems;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Session Expired Modal */}
      <SessionExpiredModal 
        isOpen={tokenExpired} 
        onClose={clearSessionExpired}
      />
      
      <header className="relative flex items-center justify-between whitespace-nowrap py-6" style={{ minHeight: '80px' }}>
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-text-light dark:text-text-dark" onClick={closeMenu}>
          <div className="w-6 h-6 text-primary flex items-center justify-center">
            <LogoIcon />
          </div>
          <h2 className="text-xl font-bold">UniLingo</h2>
        </Link>
      </div>
      
      <div className="hidden lg:flex flex-1 items-center justify-end gap-6">
        <nav className="flex items-center gap-6">
          {allMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-base ${
                location.pathname === item.path
                  ? 'font-semibold text-primary'
                  : 'font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors'
              }`}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        {/* Usage Indicator - always reserve space */}
        <div style={{ minWidth: '120px', display: 'flex', justifyContent: 'flex-end' }}>
          {isAuthenticated && <CompactUsageIndicator />}
        </div>
        
        {/* Auth section */}
        <div className="flex items-center ml-4 pl-4 border-l border-border-light dark:border-border-dark">
          {isAuthenticated ? (
            <UserProfile compact />
          ) : (
            <GoogleLoginButton />
          )}
        </div>
      </div>
      
      <button 
        className="lg:hidden flex items-center justify-center h-14 w-14 -mt-1 text-text-light dark:text-text-dark hover:text-primary transition-colors"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className="material-symbols-outlined text-4xl font-bold">menu</span>
      </button>
      
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark shadow-lg lg:hidden">
          <div className="relative flex flex-col px-4 py-3">
            {/* Close button - absolute positioned */}
            <button
              onClick={closeMenu}
              className="absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-2xl text-text-muted-light dark:text-text-muted-dark">close</span>
            </button>
            
            {allMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-base font-medium py-3 px-2 rounded-md transition-colors ${
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10 dark:bg-primary/20'
                    : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Mobile usage indicator */}
            {isAuthenticated && (
              <div className="px-2 py-3">
                <CompactUsageIndicator />
              </div>
            )}
            
            {/* Mobile auth section */}
            <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
              {isAuthenticated ? (
                <UserProfile mobile onMenuClick={closeMenu} />
              ) : (
                <div className="px-2">
                  <GoogleLoginButton />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  )
}

export default Header

