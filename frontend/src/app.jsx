import { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/layout'
import Home from './pages/home/home'
import TextToSpeech from './pages/text-to-speech/text-to-speech'
import Logs from './pages/logs/logs'

// New modular pages (following frontend module layering standard)
import { SttStreamView } from './modules/stt_stream'
import { TranslatorView } from './modules/translator'
import { RecordingView } from './modules/recording'
import { DictionaryView } from './modules/dictionary'

// Legacy imports (for backward compatibility during migration)
import SpeechToTextTest from './pages/speech-to-text/speech-to-text-test'

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dictionary" element={<DictionaryView />} />
            <Route path="/text-to-speech" element={<TextToSpeech />} />
            
            {/* Legacy route (for testing) */}
            <Route path="/speech-to-text-test" element={<SpeechToTextTest />} />
            
            {/* New modular pages */}
            <Route path="/speech-to-recording" element={<RecordingView />} />
            <Route path="/translator" element={<TranslatorView />} />
            <Route path="/stt-stream" element={<SttStreamView />} />
            
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  )
}

export default App
