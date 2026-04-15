import { useState, useEffect, useRef, Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LogoIcon from './LogoIcon'
import { useAuthStore, GoogleLoginButton, UserProfile, SessionExpiredModal } from '../../modules/auth'
import { CompactUsageIndicator } from '../../common/components/CompactUsageIndicator'

function Header() {
  const headerRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })
  const location = useLocation()
  const { isAuthenticated, isAdmin, tokenExpired, clearSessionExpired } = useAuthStore()

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const menuItems = [
    { path: '/', label: 'Translator', name: 'home' },
    { path: '/dictionary', label: 'Dictionary', name: 'dictionary' },
    { path: '/text-to-speech', label: 'Text to Speech', name: 'textToSpeech' },
    { path: '/stt-stream', label: 'Speech to Text', name: 'speechToText' },
    { path: '/speech-to-recording', label: 'Recording', name: 'recording' },
  ]

  // Add Admin menu item for admin users
  const allMenuItems = isAdmin
    ? [...menuItems, { path: '/admin', label: '⚙️ Admin', name: 'admin' }]
    : menuItems;

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
      
      <header ref={headerRef} className="relative flex items-center justify-between py-4 gap-2" style={{ minHeight: '70px' }}>
      {/* Left: Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 text-text-light dark:text-text-dark" onClick={closeMenu}>
          <div className="w-6 h-6 text-primary flex items-center justify-center">
            <LogoIcon />
          </div>
          <h2 className="text-xl font-bold whitespace-nowrap">UniLingo</h2>
        </Link>
      </div>
      
      {/* Center: Nav menu - truly centered */}
      <div className="hidden lg:flex flex-1 items-center justify-center min-w-0">
        <nav className="flex items-center flex-wrap justify-center">
          {allMenuItems.map((item, idx) => (
            <Fragment key={item.path}>
              {idx > 0 && <span className="text-slate-400 dark:text-slate-500 mx-1.5 select-none">|</span>}
              <Link
                to={item.path}
                className={`text-base whitespace-nowrap py-1 transition-all ${
                  location.pathname === item.path
                    ? item.name === 'admin'
                      ? 'font-bold text-orange-600'
                      : 'font-bold text-primary'
                    : item.name === 'admin'
                      ? 'font-medium text-orange-500 hover:text-orange-600'
                      : 'font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            </Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Usage + Dark mode + Auth */}
      <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
        {isAuthenticated && <CompactUsageIndicator />}
        <button
          onClick={() => setIsDark(prev => !prev)}
          className="dark-mode-toggle"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        {isAuthenticated ? (
          <UserProfile compact />
        ) : (
          <GoogleLoginButton />
        )}
      </div>
      
      <div className="lg:hidden flex items-center gap-1">
        <button
          onClick={() => setIsDark(prev => !prev)}
          className="dark-mode-toggle"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button 
          className="flex items-center justify-center h-14 w-14 -mt-1 text-text-light dark:text-text-dark hover:text-primary transition-colors"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-4xl font-bold">menu</span>
        </button>
      </div>
      
      {isMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-[999] lg:hidden"
            onClick={closeMenu}
          />
          {/* Mobile menu dropdown - fixed to avoid overflow clipping */}
          <div
            className="fixed left-0 right-0 z-[1000] bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark shadow-lg lg:hidden max-h-[80vh] overflow-y-auto"
            style={{ top: headerRef.current ? headerRef.current.getBoundingClientRect().bottom + 'px' : '80px' }}
          >
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
                      ? item.name === 'admin'
                        ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                        : 'text-primary bg-primary/10 dark:bg-primary/20'
                      : item.name === 'admin'
                        ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
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
        </>
      )}
    </header>
    </>
  )
}

export default Header

