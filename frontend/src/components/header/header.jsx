import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LogoIcon from './LogoIcon'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const menuItems = [
    { path: '/', label: 'Translator', name: 'home' },
    { path: '/dictionary', label: 'Dictionary', name: 'dictionary' },
    { path: '/text-to-speech', label: 'Text to Speech', name: 'textToSpeech' },
    { path: '/speech-to-text-translate', label: 'Speech to Text', name: 'speechToText' },
    { path: '/speech-to-recording', label: 'Recording', name: 'recording' },
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="relative flex items-center justify-between whitespace-nowrap py-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-text-light dark:text-text-dark" onClick={closeMenu}>
          <div className="w-6 h-6 text-primary flex items-center justify-center">
            <LogoIcon />
          </div>
          <h2 className="text-xl font-bold">UniLingo</h2>
        </Link>
      </div>
      
      <div className="hidden md:flex flex-1 items-center justify-end gap-6">
        <nav className="flex items-center gap-6">
          {menuItems.map((item) => (
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
      </div>
      
      <button 
        className="md:hidden flex items-center justify-center h-14 w-14 -mt-1 text-text-light dark:text-text-dark hover:text-primary transition-colors"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className="material-symbols-outlined text-4xl font-bold">menu</span>
      </button>
      
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark shadow-lg md:hidden">
          <div className="flex flex-col px-4 py-3">
            {menuItems.map((item) => (
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
          </div>
        </div>
      )}
    </header>
  )
}

export default Header

