import { Suspense } from 'react'
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
import { PtePrepView } from './modules/pte'
import { CelpipPrepView } from './modules/celpip'
import { StudyLabView } from './modules/study_lab'
import { DictionaryView, DictionaryHistoryView } from './modules/dictionary'
import { AdminView } from './modules/admin'

// Auth module
import { useAuth, SessionExpiredModal, SettingsView, TokenRefreshManager } from './modules/auth'
import { useAuthStore } from './modules/auth'

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
            backgroundColor: isDeactivated ? '#f0f9ff' : '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <span style={{ fontSize: '32px' }}>
              {isDeactivated ? '⏳' : '⚠️'}
            </span>
          </div>
          
          {/* Title */}
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--text-primary, #1a1a1a)',
            marginBottom: '0.75rem',
          }}>
            {isDeactivated ? 'Approval Pending' : 'Login Failed'}
          </h2>
          
          {/* Message */}
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary, #6b7280)',
            lineHeight: '1.6',
            marginBottom: '1.5rem',
          }}>
            {isDeactivated 
              ? 'Your account is awaiting administrator approval. You will be able to use the service once approved.'
              : error
            }
          </p>
          
          {/* Home button - Primary */}
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
              marginBottom: '1rem',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Go to Home
          </button>
          
          {/* Contact link - small and subtle at bottom */}
          {isDeactivated && (
            <a 
              href={`mailto:${adminEmail}?subject=[UniLingo] Account Activation Request&body=Hello, I would like to request account activation for UniLingo.%0A%0AEmail: %0AName: `}
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary, #9ca3af)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.color = '#6b7280'}
              onMouseOut={(e) => e.target.style.color = '#9ca3af'}
            >
              Contact: {adminEmail}
            </a>
          )}
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

// Pending Approval Modal - shown when user is authenticated via Google but not approved by admin
function PendingApprovalModal() {
  const { pendingApproval, user, clearError } = useAuthStore();
  const adminEmail = 'laniyoo613@gmail.com';

  if (!pendingApproval) return null;

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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#f0f9ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <span style={{ fontSize: '36px' }}>⏳</span>
        </div>
        
        {/* Title */}
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: 'var(--text-primary, #1a1a1a)',
          marginBottom: '0.5rem',
        }}>
          Approval Pending
        </h2>
        
        {/* User info */}
        {user && (
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-tertiary, #9ca3af)',
            marginBottom: '1rem',
          }}>
            {user.name} ({user.email})
          </p>
        )}
        
        {/* Message */}
        <p style={{
          fontSize: '0.95rem',
          color: 'var(--text-secondary, #6b7280)',
          lineHeight: '1.6',
          marginBottom: '1.5rem',
        }}>
          Your account has been registered but requires administrator approval before you can use the service.
        </p>
        
        {/* OK button */}
        <button 
          onClick={() => {
            clearError();
            window.location.href = '/';
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'background-color 0.2s',
            marginBottom: '0.75rem',
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          OK
        </button>
        
        {/* Contact link */}
        <a 
          href={`mailto:${adminEmail}?subject=[UniLingo] Account Approval Request&body=Hello,%0A%0AI would like to request account approval for UniLingo.%0A%0AName: ${user?.name || ''}%0AEmail: ${user?.email || ''}`}
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary, #9ca3af)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => e.target.style.color = '#6b7280'}
          onMouseOut={(e) => e.target.style.color = '#9ca3af'}
        >
          Contact administrator: {adminEmail}
        </a>
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

function AppContent() {
  // Token validation on app load is handled by authStore's onRehydrateStorage callback.
  // Zustand v5 persist does async rehydration, so useEffect with [] would capture
  // tokens as null before rehydration completes.

  return (
    <Router>
      <Layout>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dictionary" element={<DictionaryView />} />
            <Route path="/dictionary/history" element={<DictionaryHistoryView />} />
            <Route path="/text-to-speech" element={<TextToSpeech />} />
            
            {/* Auth callback route */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Legacy route (for testing) */}
            <Route path="/speech-to-text-test" element={<SpeechToTextTest />} />
            
            {/* New modular pages */}
            <Route path="/speech-to-recording" element={<RecordingView />} />
            <Route path="/pte-core" element={<PtePrepView />} />
            <Route path="/celpip" element={<CelpipPrepView />} />
            <Route path="/study-lab" element={<StudyLabView />} />
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
        <PendingApprovalModal />
      </UsageProvider>
    </GoogleOAuthProvider>
  )
}

export default App

