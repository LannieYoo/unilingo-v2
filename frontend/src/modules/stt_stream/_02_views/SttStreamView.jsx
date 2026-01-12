/**
 * SttStreamView
 * Vosk 기반 실시간 STT + 번역 뷰
 */

import { useEffect, useRef, useCallback } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranscriptStore } from '../_05_stores'
import { useVoskRecognition, useAutoScroll, useTranslation, useTimer, TRANSLATION_LANGUAGES } from '../_04_hooks'
import {
  DebugPanel,
  LanguageSelect,
  StatusIndicator,
  ActionButton,
} from '../_03_components'
import { downloadAsFile, generateFileName } from '../_07_utils'
import { STATUS } from '../_08_constants'
import '../_10_styles/stt-stream.css'

// Auth module
import {
  useAuthStore,
  useCharacterLimit,
  GoogleLoginButton,
  UserProfile,
  LoginModal,
  CharacterCounter,
  MAX_CHARS_GUEST,
  authService,
} from '../../auth'

export function SttStreamView() {
  const {
    finalText,
    interimText,
    status,
    selectedLang,
    loadProgress,
    isSupported,
    showDebug,
    setSelectedLang,
    setShowDebug,
    clear,
    getFullText,
  } = useTranscriptStore()

  const {
    loadModel,
    toggle,
    setLanguage,
    isRunning,
    isLoading,
    stop,
  } = useVoskRecognition()

  const {
    translatedText,
    targetLang,
    isTranslating,
    isRetranslating,
    retranslateProgress,
    setTargetLang,
    addSentenceToTranslate,
    retranslateAll,
    clearTranslation,
  } = useTranslation()

  const {
    formattedTime,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer
  } = useTimer()

  // Auth state
  const { isAuthenticated, tokens } = useAuthStore()
  
  // Character limit hook
  const {
    isLimitReached,
    showLoginModal,
    closeLoginModal,
  } = useCharacterLimit(finalText)

  const fullText = getFullText()
  
  const { containerRef: leftRef, handleScroll: handleLeftScroll } = useAutoScroll([finalText, interimText])
  const { containerRef: rightRef, handleScroll: handleRightScroll } = useAutoScroll([translatedText])

  const prevFinalTextRef = useRef('')
  const sessionStartTimeRef = useRef(null)
  const sessionWordCountRef = useRef(0)

  // STT 상태에 따라 타이머 제어 및 세션 추적
  useEffect(() => {
    if (isRunning) {
      startTimer()
      sessionStartTimeRef.current = Date.now()
      sessionWordCountRef.current = 0
    } else {
      stopTimer()
      // Log STT usage when stopping (only for authenticated users)
      if (sessionStartTimeRef.current && isAuthenticated && tokens?.access_token) {
        const durationSeconds = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
        const wordCount = sessionWordCountRef.current
        
        if (durationSeconds > 0 || wordCount > 0) {
          authService.createSttLog(tokens.access_token, {
            language: selectedLang,
            duration_seconds: durationSeconds,
            word_count: wordCount,
          }).catch(err => {
            console.error('Failed to log STT usage:', err)
          })
        }
        sessionStartTimeRef.current = null
      }
    }
  }, [isRunning, startTimer, stopTimer, isAuthenticated, tokens, selectedLang])

  // Character limit check - auto stop when limit reached
  useEffect(() => {
    if (!isAuthenticated && isRunning && finalText.length >= MAX_CHARS_GUEST) {
      // Stop recording when limit is reached
      stop()
    }
  }, [isAuthenticated, isRunning, finalText.length, stop])

  useEffect(() => {
    if (!finalText || finalText === prevFinalTextRef.current) return
    
    const newPart = finalText.slice(prevFinalTextRef.current.length).trim()
    prevFinalTextRef.current = finalText
    
    if (newPart) {
      // Count words in new part
      const newWords = newPart.split(/\s+/).filter(w => w.trim()).length
      sessionWordCountRef.current += newWords
      
      const sentences = newPart.split(/(?<=[.!?。！？])\s*/).filter(s => s.trim())
      // STT 모델의 선택된 언어를 원본 언어로 사용 (더 정확함)
      const sourceLang = selectedLang
      
      sentences.forEach(sentence => {
        if (sentence.trim()) {
          addSentenceToTranslate(sentence.trim(), sourceLang)
        }
      })
    }
  }, [finalText, selectedLang, addSentenceToTranslate])

  const handleLanguageChange = async (newLang) => {
    setSelectedLang(newLang)
    await setLanguage(newLang)
  }

  const handleClear = () => {
    clear()
    clearTranslation()
    resetTimer()
    prevFinalTextRef.current = ''
  }

  const handleDownload = () => {
    const content = `=== Original ===\n${finalText || fullText}\n\n=== Translation (${targetLang}) ===\n${translatedText}`
    if (!content) return
    downloadAsFile(content, generateFileName('stt-translated'))
  }

  // Handle toggle with character limit check
  const handleToggle = useCallback(() => {
    if (!isRunning && !isAuthenticated && finalText.length >= MAX_CHARS_GUEST) {
      // Show login modal if trying to start when limit is reached
      return
    }
    toggle()
  }, [isRunning, isAuthenticated, finalText.length, toggle])

  return (
    <PageLayout title="Speech to Text" fullHeight>
      <PageBox noPadding flex>
        {/* Auth header */}
        <div className="stt-auth-bar">
          {isAuthenticated ? (
            <UserProfile />
          ) : (
            <div className="stt-auth-guest">
              <span className="stt-guest-notice">
                Guest mode: {MAX_CHARS_GUEST.toLocaleString()} character limit
              </span>
              <GoogleLoginButton />
            </div>
          )}
        </div>

        {/* 컨트롤 버튼 (상단) */}
        <div className="stt-controls-bar">
          <StatusIndicator status={status} loadProgress={loadProgress} />
          
          <div className="stt-buttons-group">
            {status === STATUS.INIT && (
              <ActionButton
                variant="primary"
                onClick={loadModel}
                disabled={!isSupported || isLoading}
              >
                Load Model
              </ActionButton>
            )}
            
            <ActionButton
              variant={isRunning ? 'recording' : 'default'}
              onClick={handleToggle}
              disabled={!isSupported || isLoading || (!isAuthenticated && isLimitReached && !isRunning)}
            >
              {isRunning ? 'Stop' : 'Start'}
            </ActionButton>
            
            <ActionButton
              variant="secondary"
              onClick={handleDownload}
              disabled={isRunning || !fullText}
            >
              Download
            </ActionButton>
            
            <ActionButton
              variant="secondary"
              onClick={handleClear}
              disabled={isRunning || !fullText}
            >
              Clear
            </ActionButton>
            
            <ActionButton
              variant="debug"
              className={showDebug ? 'active' : ''}
              onClick={() => setShowDebug(!showDebug)}
            >
              Debug
            </ActionButton>
          </div>
        </div>

        {/* 양쪽 패널 */}
        <div className="stt-dual-panels">
          {/* 좌측: 원문 */}
          <div className="stt-panel stt-panel-left">
            <div className="stt-panel-header">
              <LanguageSelect
                value={selectedLang}
                onChange={handleLanguageChange}
                disabled={isRunning || isLoading}
                label=""
              />
              <span className="stt-char-count">
                {(finalText || '').length} chars • {formattedTime}
              </span>
            </div>
            <div 
              className="stt-panel-content"
              ref={leftRef}
              onScroll={handleLeftScroll}
            >
              {finalText && <span className="stt-final-text">{finalText}</span>}
              {interimText && <span className="stt-interim-text">{interimText}</span>}
              {!finalText && !interimText && (
                <span className="stt-placeholder">Speech recognition results will appear here...</span>
              )}
            </div>
            
            {/* Character counter for guests */}
            {!isAuthenticated && (
              <div className="stt-char-limit-bar">
                <CharacterCounter charCount={finalText.length} />
              </div>
            )}
          </div>

          {/* 스왑 버튼 */}
          <div className="stt-swap-button">
            <span>↔</span>
          </div>

          {/* 우측: 번역 */}
          <div className="stt-panel stt-panel-right">
            <div className="stt-panel-header">
              <div className="stt-target-lang-controls">
                <select
                  className="stt-target-lang-select"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  disabled={isRetranslating}
                >
                  {TRANSLATION_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <button
                  className="stt-retranslate-btn"
                  onClick={retranslateAll}
                  disabled={isRunning || isRetranslating || !translatedText}
                  title="Retranslate all text to selected language"
                >
                  {isRetranslating ? 'Retranslating...' : 'Retranslate All'}
                </button>
              </div>
              <span className="stt-char-count">
                {isTranslating ? (
                  <span className="stt-translating-badge">Translating...</span>
                ) : (
                  `${(translatedText || '').length} chars`
                )}
              </span>
            </div>
            
            {/* Progress bar for retranslation */}
            {isRetranslating && (
              <div className="stt-retranslate-progress">
                <div 
                  className="stt-retranslate-progress-bar"
                  style={{ width: `${retranslateProgress}%` }}
                />
                <span className="stt-retranslate-progress-text">{retranslateProgress}%</span>
              </div>
            )}
            
            <div 
              className="stt-panel-content"
              ref={rightRef}
              onScroll={handleRightScroll}
            >
              {translatedText ? (
                <span className="stt-translated-text">{translatedText}</span>
              ) : (
                <span className="stt-placeholder">Translation will appear here...</span>
              )}
            </div>
          </div>
        </div>
      </PageBox>

      {!isSupported && (
        <div className="stt-warning-box">
          ⚠️ Microphone access is not supported in this browser.
        </div>
      )}

      <div className="stt-stream-notes">
        📝 First run requires model download (~50MB) • Offline speech recognition • Auto translation
        {!isAuthenticated && ` • Guest limit: ${MAX_CHARS_GUEST.toLocaleString()} characters`}
      </div>

      <DebugPanel isOpen={showDebug} onClose={() => setShowDebug(false)} />
      
      {/* Login modal when limit is reached */}
      <LoginModal isOpen={showLoginModal || (!isAuthenticated && isLimitReached)} onClose={closeLoginModal} />
    </PageLayout>
  )
}

export default SttStreamView
