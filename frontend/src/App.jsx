import { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Layout from './components/layout/layout'
import Home from './pages/home/home'
import TextToSpeech from './pages/text-to-speech/text-to-speech'
import Logs from './pages/logs/logs'

// New modular pages (following frontend module layering standard)
import { SttStreamView } from './modules/stt_stream'
import { TranslatorView, TranslationHistoryView } from './modules/translator'
import { RecordingView } from './modules/recording'
import { DictionaryView, DictionaryHistoryView } from './modules/dictionary'
import { AdminView } from './modules/admin'

// Auth module
import { useAuthStore, useAuth, SessionExpiredModal, SettingsView, TokenRefreshManager } from './modules/auth'

// Usage Context
import { UsageProvider } from './common/contexts/UsageContext'

// Legacy imports (for backward compatibility during migration)
import SpeechToTextTest from './pages/speech-to-text/speech-to-text-test'

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Auth callback component
function AuthCallback() {
  const { isLoading, isAuthenticated, error } = useAuth();
  const hasCode = new URLSearchParams(window.location.search).has('code');
  
  // Show error if any
  if (error) {
    const isDeactivated = error.toLowerCase().includes('deactivat') || 
                          error.toLowerCase().includes('inactive') ||
                          error.toLowerCase().includes('불가');
    const adminEmail = 'laniyoo613@gmail.com';
    
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
      }}>
        <div style={{
          backgroundColor: 'var(--bg-primary, #ffffff)',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '420px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'modalFadeIn 0.3s ease-out',
        }}>
          {/* Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isDeactivated ? '#fef2f2' : '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <span style={{ fontSize: '32px' }}>
              {isDeactivated ? '🔒' : '⚠️'}
            </span>
          </div>
          
          {/* Title */}
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--text-primary, #1a1a1a)',
            marginBottom: '0.75rem',
          }}>
            {isDeactivated ? 'Access Denied' : 'Login Failed'}
          </h2>
          
          {/* Message */}
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary, #6b7280)',
            lineHeight: '1.6',
            marginBottom: '1.5rem',
          }}>
            {isDeactivated 
              ? 'Your account is currently inactive. Please contact the administrator to request access.'
              : error
            }
          </p>
          
          {/* Admin Email Link */}
          {isDeactivated && (
            <a 
              href={`mailto:${adminEmail}?subject=[UniLingo] Account Activation Request&body=Hello, I would like to request account activation for UniLingo.%0A%0AEmail: %0AName: `}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '1rem',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              ✉️ Contact Administrator
            </a>
          )}
          
          {/* Admin email display */}
          {isDeactivated && (
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-tertiary, #9ca3af)',
              marginBottom: '1.25rem',
            }}>
              {adminEmail}
            </p>
          )}
          
          {/* Home button */}
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              color: 'var(--text-primary, #374151)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary, #e5e7eb)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'var(--bg-secondary, #f3f4f6)'}
          >
            Go to Home
          </button>
        </div>
        
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }
  
  // Show loading while processing OAuth callback or if code is present
  if (isLoading || hasCode) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="animate-spin" style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Signing in...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // Redirect to home after auth is processed
  return <Navigate to="/" replace />;
}

function AppContent() {
  const { tokens, fetchUser } = useAuthStore();

  // Initialize auth state on app load
  useEffect(() => {
    if (tokens?.access_token) {
      fetchUser();
    }
  }, []);

  return (
    <Router>
      <Layout>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/translator" replace />} />
            <Route path="/dictionary" element={<DictionaryView />} />
            <Route path="/dictionary/history" element={<DictionaryHistoryView />} />
            <Route path="/text-to-speech" element={<TextToSpeech />} />
            
            {/* Auth callback route */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Legacy route (for testing) */}
            <Route path="/speech-to-text-test" element={<SpeechToTextTest />} />
            
            {/* New modular pages */}
            <Route path="/speech-to-recording" element={<RecordingView />} />
            <Route path="/translator" element={<TranslatorView />} />
            <Route path="/translator/history" element={<TranslationHistoryView />} />
            <Route path="/stt-stream" element={<SttStreamView />} />
            
            {/* Admin page */}
            <Route path="/admin" element={<AdminView />} />
            
            {/* Settings page */}
            <Route path="/settings" element={<SettingsView />} />
            
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <UsageProvider>
        <TokenRefreshManager />
        <AppContent />
        <SessionExpiredModal />
      </UsageProvider>
    </GoogleOAuthProvider>
  )
}

export default App
