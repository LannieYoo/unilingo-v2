/**
 * SttStreamWebSpeechPage - /stt-stream 라우트 메인 컴포넌트
 * 
 * Vosk 기반 실시간 STT 페이지
 * - 완전히 브라우저에서 실행 (서버 불필요)
 * - 실시간 partial result (단어 단위 즉시 표시)
 * - 오프라인 동작
 */

import { useState, useEffect, useRef } from 'react'
import { transcriptStore } from '../store/TranscriptStore'
import { VoskController } from '../app/VoskController'
import DebugPanel from './DebugPanel'
import './SttStreamWebSpeechPage.css'

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
]

function SttStreamWebSpeechPage() {
  const [transcript, setTranscript] = useState({ finalText: '', interimText: '', fullText: '' })
  const [status, setStatus] = useState('init') // init, loading, ready, listening, stopped, error
  const [selectedLang, setSelectedLang] = useState('en')
  const [loadProgress, setLoadProgress] = useState(0)
  const [isSupported, setIsSupported] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  
  const controllerRef = useRef(null)
  const textareaRef = useRef(null)

  // 초기화
  useEffect(() => {
    if (!VoskController.isSupported()) {
      setIsSupported(false)
      return
    }

    const unsubscribe = transcriptStore.subscribe(setTranscript)

    return () => {
      unsubscribe()
      if (controllerRef.current) {
        controllerRef.current.destroy()
      }
    }
  }, [])

  // 자동 스크롤
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [transcript])

  const handleLoadModel = async () => {
    if (controllerRef.current) {
      controllerRef.current.destroy()
    }

    controllerRef.current = new VoskController({
      lang: selectedLang,
      onStatusChange: setStatus,
      onProgress: setLoadProgress
    })

    await controllerRef.current.loadModel()
  }

  const handleToggle = async () => {
    if (!controllerRef.current) {
      controllerRef.current = new VoskController({
        lang: selectedLang,
        onStatusChange: setStatus,
        onProgress: setLoadProgress
      })
    }

    if (status === 'listening') {
      await controllerRef.current.stop()
    } else {
      await controllerRef.current.start()
    }
  }

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value
    setSelectedLang(newLang)
    
    if (controllerRef.current) {
      await controllerRef.current.setLanguage(newLang)
      setStatus('init')
      setLoadProgress(0)
    }
  }

  const handleClear = () => {
    transcriptStore.clear()
  }

  const handleDownload = () => {
    const content = transcript.finalText || transcript.fullText
    if (!content) return

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vosk-stt-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const isRecording = status === 'listening'
  const isLoading = status === 'loading'

  return (
    <div className="stt-stream-page">
      <div className="stt-stream-container">
        <div className="stt-stream-header">
          <h1>🎤 Vosk STT (실시간)</h1>
          <p className="stt-stream-subtitle">
            브라우저에서 직접 실행 - 실시간 단어 표시, 오프라인 동작
          </p>
          {!isSupported && (
            <div className="stt-stream-warning">
              ⚠️ 마이크 접근이 지원되지 않습니다.
            </div>
          )}
        </div>

        <div className="stt-stream-controls">
          <div className="stt-stream-selects">
            <div className="stt-stream-select-group">
              <label htmlFor="lang-select">언어:</label>
              <select
                id="lang-select"
                value={selectedLang}
                onChange={handleLanguageChange}
                disabled={isRecording || isLoading}
              >
                {languageOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="stt-stream-status">
            {isLoading && (
              <div className="stt-stream-loading">
                <span>모델 로딩 중... {loadProgress}%</span>
                <div className="stt-stream-progress">
                  <div 
                    className="stt-stream-progress-bar" 
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {isRecording && (
              <span className="stt-stream-status-listening">
                <span className="stt-stream-pulse"></span>
                실시간 인식 중...
              </span>
            )}
            {status === 'error' && (
              <span className="stt-stream-status-error">오류 - 마이크 확인</span>
            )}
            {status === 'ready' && (
              <span className="stt-stream-status-ready">✓ 모델 준비 완료</span>
            )}
          </div>

          <div className="stt-stream-buttons">
            {status === 'init' && (
              <button
                onClick={handleLoadModel}
                className="stt-stream-btn primary"
                disabled={!isSupported || isLoading}
              >
                📥 모델 로드
              </button>
            )}
            
            <button
              onClick={handleToggle}
              className={`stt-stream-btn ${isRecording ? 'recording' : ''}`}
              disabled={!isSupported || isLoading}
            >
              {isRecording ? '⏹ 중지' : '▶ 시작'}
            </button>
            
            <button
              onClick={handleDownload}
              className="stt-stream-btn secondary"
              disabled={isRecording || !transcript.fullText}
            >
              ⬇ 다운로드
            </button>
            
            <button
              onClick={handleClear}
              className="stt-stream-btn secondary"
              disabled={isRecording || !transcript.fullText}
            >
              🗑 지우기
            </button>
            
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`stt-stream-btn debug ${showDebug ? 'active' : ''}`}
            >
              🐛 디버그
            </button>
          </div>
        </div>

        <div className="stt-stream-output">
          <div className="stt-stream-text-display">
            <span className="stt-stream-final">{transcript.finalText}</span>
            {transcript.interimText && (
              <span className="stt-stream-interim">{transcript.interimText}</span>
            )}
          </div>
          {transcript.fullText && (
            <div className="stt-stream-info">
              {transcript.fullText.length} 글자
            </div>
          )}
        </div>

        <div className="stt-stream-notes">
          <h3>📝 참고사항</h3>
          <ul>
            <li>첫 실행 시 모델 다운로드가 필요합니다 (~50MB)</li>
            <li>모델은 브라우저에 캐시되어 다음 실행 시 빠르게 로드됩니다</li>
            <li><strong>실시간으로 단어가 표시됩니다</strong> (partial result)</li>
            <li>인터넷 연결 없이도 동작합니다 (모델 로드 후)</li>
            <li>언어 변경 시 해당 언어 모델을 새로 로드해야 합니다</li>
          </ul>
        </div>
      </div>

      <DebugPanel isOpen={showDebug} onClose={() => setShowDebug(false)} />
    </div>
  )
}

export default SttStreamWebSpeechPage
