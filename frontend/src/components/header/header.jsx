import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import LogoIcon from './LogoIcon'
import { useAuthStore, GoogleLoginButton, UserProfile, SessionExpiredModal } from '../../modules/auth'
import { CompactUsageIndicator } from '../../common/components/CompactUsageIndicator'

function Header() {
  const headerRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openMobileGroup, setOpenMobileGroup] = useState(null)
  const [hoveredGroupId, setHoveredGroupId] = useState(null)

  const handleGroupHoverEnter = (groupId) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setHoveredGroupId(groupId)
  }

  const handleGroupHoverLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setHoveredGroupId(null), 140)
  }
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

  const groupedMenu = [
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { path: '/translator', label: 'Translator', name: 'home' },
        { path: '/dictionary', label: 'Dictionary', name: 'dictionary' },
        { path: '/text-to-speech', label: 'Text to Speech', name: 'textToSpeech' },
        { path: '/stt-stream', label: 'Speech to Text', name: 'speechToText' },
        { path: '/speech-to-recording', label: 'Recording', name: 'recording' },
      ],
    },
    {
      id: 'studyLab',
      label: 'Study Lab',
      items: [
        { path: '/study-lab?tab=sentence-listening', label: 'Sentence Practice', name: 'studySentence', studyTab: 'sentence-listening' },
        { path: '/study-lab?tab=celpip-words', label: 'CELPIP Vocabulary', name: 'studyCelpipWords', studyTab: 'celpip-words' },
        { path: '/study-lab?tab=pte-core-words', label: 'PTE Vocabulary', name: 'studyPteWords', studyTab: 'pte-core-words' },
        { path: '/study-lab?tab=phrasal-verbs', label: 'Phrasal Verbs', name: 'studyPhrasalVerbs', studyTab: 'phrasal-verbs' },
        { path: '/study-lab?tab=news-reading', label: 'News Reading', name: 'studyNews', studyTab: 'news-reading' },
        { path: '/study-lab?tab=describing-pictures', label: 'Describing Pictures', name: 'studyDescribingPictures', studyTab: 'describing-pictures' },
      ],
    },
    {
      id: 'pteCore',
      label: 'PTE Core',
      items: [
        { path: '/pte-core', label: 'PTE Core', name: 'pteCore' },
      ],
    },
    {
      id: 'celpip',
      label: 'CELPIP',
      items: [
        { path: '/celpip', label: 'CELPIP', name: 'celpip' },
      ],
    },
  ]

  const getItemPathname = (path) => path.split('?')[0]
  const getItemSearch = (path) => {
    const queryIndex = path.indexOf('?')
    return queryIndex >= 0 ? path.slice(queryIndex) : ''
  }

  const getMenuLinkClass = (item, extraClass = '') => {
    const itemPathname = getItemPathname(item.path)
    const itemSearch = getItemSearch(item.path)
    const isActive = location.pathname === itemPathname && (!itemSearch || location.search === itemSearch)
    return `${isActive ? 'font-bold text-primary' : 'font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'} ${extraClass}`
  }

  const getActiveGroupId = () => {
    if (location.pathname === '/study-lab') return 'studyLab'
    if (location.pathname === '/pte-core') return 'pteCore'
    if (location.pathname === '/celpip') return 'celpip'
    return 'tools'
  }

  const isGroupActive = (group) => {
    return group.items.some((item) => location.pathname === getItemPathname(item.path))
  }

  const getGroupButtonClass = (group, extraClass = '') => {
    const isActive = isGroupActive(group)
    return `${isActive ? 'font-bold text-primary bg-primary/10 dark:bg-primary/15 dark:text-white' : 'font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-slate-100 dark:hover:bg-slate-800'} ${extraClass}`
  }

  const getTopNavClass = (group) => {
    const isActive = isGroupActive(group)
    return [
      'relative text-[15px] whitespace-nowrap px-3.5 py-2 transition-colors',
      isActive
        ? 'font-semibold text-primary after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-primary'
        : 'font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark',
    ].join(' ')
  }

  const activeGroupId = getActiveGroupId()
  const activeGroup = groupedMenu.find((group) => group.id === activeGroupId) ?? groupedMenu[0]
  const hoveredGroup = hoveredGroupId ? groupedMenu.find((group) => group.id === hoveredGroupId) : null
  const displaySubtabGroup = (hoveredGroup && hoveredGroup.items.length > 1) ? hoveredGroup : activeGroup

  const getSubtabClass = (item) => {
    const itemPathname = getItemPathname(item.path)
    const itemSearch = getItemSearch(item.path)
    const isActive = location.pathname === itemPathname && (!itemSearch || location.search === itemSearch)

    return [
      'inline-flex items-center justify-center whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-all',
      isActive
        ? 'border-transparent bg-primary text-white shadow-sm'
        : 'border-border-light bg-white/70 text-text-muted-light hover:border-primary/30 hover:text-primary dark:border-border-dark dark:bg-card-dark/60 dark:text-text-muted-dark dark:hover:text-text-dark',
    ].join(' ')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setOpenMobileGroup(null)
    setOpenDesktopGroup(null)
  }

  const handleMenuClick = (item) => {
    if (item.name === 'celpip') {
      sessionStorage.setItem('unilingo.celpip.forceListening', '1')
      window.dispatchEvent(new CustomEvent('unilingo:exam-prep-nav', { detail: { target: 'celpip' } }))
    }
    if (item.name === 'pteCore') {
      sessionStorage.setItem('unilingo.pte.forceDefaultTab', '1')
      window.dispatchEvent(new CustomEvent('unilingo:exam-prep-nav', { detail: { target: 'pteCore' } }))
    }
    if (item.studyTab) {
      localStorage.setItem('unilingo.studyLab.activeTab', item.studyTab)
    }
    closeMenu()
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
        <nav className="flex items-center justify-center gap-2 min-w-0">
          {groupedMenu.map((group) => (
            <div
              key={group.id}
              className="relative"
              onMouseEnter={() => handleGroupHoverEnter(group.id)}
              onMouseLeave={handleGroupHoverLeave}
            >
              <Link
                to={group.items[0].path}
                className={getTopNavClass(group)}
                onClick={() => handleMenuClick(group.items[0])}
              >
                {group.label}
              </Link>
            </div>
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
              
              {groupedMenu.map((group) => (
                <div key={group.id} className="border-b border-border-light/70 pb-2 last:border-b-0 dark:border-border-dark/70">
                  {group.items.length === 1 ? (
                    <Link
                      to={group.items[0].path}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-base transition-colors ${getGroupButtonClass(group, '')}`}
                      onClick={() => handleMenuClick(group.items[0])}
                    >
                      <span>{group.label}</span>
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-base transition-colors ${getGroupButtonClass(group, '')}`}
                        onClick={() => setOpenMobileGroup((current) => (current === group.id ? null : group.id))}
                      >
                        <span>{group.label}</span>
                        <span className="material-symbols-outlined text-[20px]">
                          {openMobileGroup === group.id ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {openMobileGroup === group.id && (
                        <div className="mt-1 space-y-1 pl-3">
                          {group.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`${getMenuLinkClass(item, 'block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800')}`}
                              onClick={() => handleMenuClick(item)}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
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

      {displaySubtabGroup.items.length > 1 && (
        <div
          className="border-t border-border-light/70 bg-transparent dark:border-border-dark/70"
          onMouseEnter={() => handleGroupHoverEnter(displaySubtabGroup.id)}
          onMouseLeave={handleGroupHoverLeave}
        >
          <div className="mx-auto w-full max-w-[1500px] px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="flex justify-center">
              <nav className="inline-flex max-w-full items-center justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {displaySubtabGroup.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={getSubtabClass(item)}
                  onClick={() => handleMenuClick(item)}
                >
                  {item.label}
                </Link>
              ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header

