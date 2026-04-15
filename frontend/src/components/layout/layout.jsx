import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../header/header'
import Footer from '../footer/footer'

function Layout({ children }) {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <div className="layout-container flex flex-col min-h-screen">
        {/* Header spans full width outside the padded container */}
        <div
          className="w-full sticky top-0 z-50 px-4 sm:px-6 lg:px-8 header-bg"
        >
          <div className="mx-auto w-full">
            <Header />
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col w-full">
          <div className="mx-auto max-w-desktop flex-1 flex flex-col w-full">
            <main className="flex flex-col gap-10 py-4 lg:py-10 flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout

