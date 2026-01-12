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
import { DictionaryView } from './modules/dictionary'
import { AdminView } from './modules/admin'

// Auth module
import { useAuthStore, useAuth, SessionExpiredModal } from './modules/auth'

// Legacy imports (for backward compatibility during migration)
import SpeechToTextTest from './pages/speech-to-text/speech-to-text-test'

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Auth callback component
function AuthCallback() {
  const { isLoading, isAuthenticated, error } = useAuth();
  
  // Show error if any
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p style={{ color: 'red' }}>로그인 실패: {error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }
  
  if (isLoading) {
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
        <p>로그인 처리 중...</p>
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
      <AppContent />
      <SessionExpiredModal />
    </GoogleOAuthProvider>
  )
}

export default App
