/**
 * SttStreamView
 * Web Speech API (Main) + Vosk lgraph (Gap Filling) 하이브리드 STT + 번역 뷰
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranscriptStore } from '../_05_stores'
import { useVoskRecognition, useHybridSTT, useAutoScroll, useTranslation, useTimer, TRANSLATION_LANGUAGES, useModelCache } from '../_04_hooks'
import {
  DebugPanel,
  LanguageSelect,
  StatusIndicator,
  ActionButton,
  ModelDownloadManager,
  DownloadOverlay,
} from '../_03_components'
import { downloadAsFile, generateFileName } from '../_07_utils'
import '../_10_styles/stt-stream.css'

import {
  useAuthStore,
  useCharacterLimit,
  useLanguagePreferences,
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

  const isHybridMode = selectedLang === 'en-us'

  const voskHook = useVoskRecognition()
  const hybridHook = useHybridSTT()

  const {
    setLanguage,
    isRunning: voskIsRunning,
    isLoading,
    stop: voskStop,
  } = voskHook

  const {
    stop: hybridStop,
    toggle: hybridToggle,
    isRunning: hybridIsRunning,
    isRestarting,
    transcript: hybridTranscript,
    interimTranscript: hybridInterimTranscript,
    voskStatus,
    voskProgress,
    stats: hybridStats,
  } = hybridHook

  const isRunning = isHybridMode ? hybridIsRunning : voskIsRunning
  const stop = isHybridMode ? hybridStop : voskStop
  const toggle = isHybridMode ? hybridToggle : voskHook.toggle
  const displayFinalText = isHybridMode ? hybridTranscript : finalText
  const displayInterimText = isHybridMode ? hybridInterimTranscript : interimText

  const {
    translatedText,
    targetLang,
    isTranslating,
    isRetranslating,
    retranslateProgress,
    isTranslationEnabled,
    setTargetLang,
    setIsTranslationEnabled,
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

  const { isModelCached, downloadingModel, downloadProgress } = useModelCache()
  const { isAuthenticated, tokens, isAdmin } = useAuthStore()
  
  const {
    isLimitReached,
    showLoginModal,
    closeLoginModal,
  } = useCharacterLimit(displayFinalText)

  const { targetLanguage, isLoaded: preferencesLoaded } = useLanguagePreferences()

  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef(null)


  useEffect(() => {
    if (!preferencesLoaded) return
    let sttLangCode = targetLanguage
    if (targetLanguage === 'en') {
      sttLangCode = 'en-us'
    }
    const supportedLangs = ['en-us', 'en-in', 'ko', 'zh', 'ja', 'es', 'fr', 'de', 'hi']
    if (supportedLangs.includes(sttLangCode)) {
      setSelectedLang(sttLangCode)
    }
  }, [preferencesLoaded, targetLanguage, setSelectedLang])

  const fullText = getFullText()
  
  const { containerRef: leftRef, handleScroll: handleLeftScroll } = useAutoScroll([displayFinalText, displayInterimText])
  const { containerRef: rightRef, handleScroll: handleRightScroll } = useAutoScroll([translatedText])

  const prevFinalTextRef = useRef('')
  const sessionStartTimeRef = useRef(null)
  const sessionWordCountRef = useRef(0)

  const handleMouseDown = useCallback((e) => {
    if (!isTranslationEnabled) return
    setIsResizing(true)
    e.preventDefault()
  }, [isTranslationEnabled])

  const handleMouseMove = useCallback((e) => {
    if (!isResizing || !containerRef.current) return
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const offsetX = e.clientX - containerRect.left
    const percentage = (offsetX / containerRect.width) * 100
    const minRightPanelWidth = 300
    const maxLeftPercentage = ((containerRect.width - minRightPanelWidth - 8) / containerRect.width) * 100
    const minLeftPanelWidth = 300
    const minLeftPercentage = (minLeftPanelWidth / containerRect.width) * 100
    const clampedPercentage = Math.min(Math.max(percentage, minLeftPercentage), maxLeftPercentage)
    setLeftPanelWidth(clampedPercentage)
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (isRunning) {
      startTimer()
      sessionStartTimeRef.current = Date.now()
      sessionWordCountRef.current = 0
    } else {
      stopTimer()
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

  useEffect(() => {
    if (!isAuthenticated && isRunning && displayFinalText.length >= MAX_CHARS_GUEST) {
      stop()
    }
  }, [isAuthenticated, isRunning, displayFinalText.length, stop])


  useEffect(() => {
    if (!displayFinalText || displayFinalText === prevFinalTextRef.current) return
    const newPart = displayFinalText.slice(prevFinalTextRef.current.length).trim()
    prevFinalTextRef.current = displayFinalText
    if (newPart) {
      const newWords = newPart.split(/\s+/).filter(w => w.trim()).length
      sessionWordCountRef.current += newWords
      const sentences = newPart.split(/(?<=[.!?。！？])\s*/).filter(s => s.trim())
      const sourceLang = selectedLang
      sentences.forEach(sentence => {
        if (sentence.trim()) {
          addSentenceToTranslate(sentence.trim(), sourceLang)
        }
      })
    }
  }, [displayFinalText, selectedLang, addSentenceToTranslate])

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
    const originalText = displayFinalText || fullText
    const content = `=== Original ===\n${originalText}\n\n=== Translation (${targetLang}) ===\n${translatedText}`
    if (!originalText) return
    downloadAsFile(content, generateFileName('stt-translated'))
  }

  const handleToggle = useCallback(() => {
    if (!isRunning && !isAuthenticated && displayFinalText.length >= MAX_CHARS_GUEST) {
      return
    }
    toggle()
  }, [isRunning, isAuthenticated, displayFinalText.length, toggle])

  return (
    <PageLayout title="Speech to Text" fullHeight>
      <PageBox noPadding flex>
        {!isAuthenticated && (
          <div className="stt-auth-bar">
            <div className="stt-auth-guest">
              <span className="stt-guest-notice">
                Guest mode: {MAX_CHARS_GUEST.toLocaleString()} character limit • Unlimited usage available after login
              </span>
            </div>
          </div>
        )}

        <div className="stt-controls-bar">
          <div className="stt-controls-left">
            <StatusIndicator status={status} loadProgress={loadProgress} />
            
            {isHybridMode && isRunning && (
              <div className="stt-hybrid-status">
                <span className="stt-hybrid-badge">🎯 Web Speech API</span>
                <span className={`stt-restart-indicator ${isRestarting ? 'active' : ''}`}>🔄</span>
                {voskStatus === 'loading' && <span className="stt-vosk-loading">Vosk: {voskProgress}%</span>}
                {voskStatus === 'ready' && <span className="stt-vosk-ready">Vosk ✓</span>}
              </div>
            )}
            
            <div className="stt-buttons-group">
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
                disabled={isRunning || (!displayFinalText && !fullText)}
              >
                Download
              </ActionButton>
              
              <ActionButton
                variant="secondary"
                onClick={handleClear}
                disabled={isRunning || (!displayFinalText && !fullText)}
              >
                Clear
              </ActionButton>
              
              {isAdmin && (
                <ActionButton
                  variant="debug"
                  className={showDebug ? 'active' : ''}
                  onClick={() => setShowDebug(!showDebug)}
                >
                  Debug
                </ActionButton>
              )}
            </div>
          </div>
          
          <div className="stt-controls-right">
            <label className="stt-translation-toggle">
              <input
                type="checkbox"
                checked={isTranslationEnabled}
                onChange={(e) => setIsTranslationEnabled(e.target.checked)}
                className="stt-translation-checkbox"
              />
              <span className="stt-translation-label">Enable Translation</span>
            </label>
          </div>
        </div>


        {!isHybridMode && !isModelCached(selectedLang) && !isRunning && (
          <ModelDownloadManager selectedLang={selectedLang} />
        )}

        <div 
          className={`stt-dual-panels ${!isTranslationEnabled ? 'stt-translation-disabled' : ''} ${isResizing ? 'stt-resizing' : ''}`}
          ref={containerRef}
        >
          <div 
            className="stt-panel stt-panel-left"
            style={isTranslationEnabled ? { width: `${leftPanelWidth}%` } : {}}
          >
            <div className="stt-panel-header">
              <LanguageSelect
                value={selectedLang}
                onChange={handleLanguageChange}
                disabled={isRunning || isLoading}
                label=""
              />
              <span className="stt-char-count">
                {(displayFinalText || '').length} chars • {formattedTime}
              </span>
            </div>
            <div 
              className="stt-panel-content"
              ref={leftRef}
              onScroll={handleLeftScroll}
            >
              {displayFinalText && <span className="stt-final-text">{displayFinalText}</span>}
              {displayInterimText && <span className="stt-interim-text">{displayInterimText}</span>}
              {!displayFinalText && !displayInterimText && (
                <span className="stt-placeholder">Speech recognition results will appear here...</span>
              )}
            </div>
            
            {!isAuthenticated && (
              <div className="stt-char-limit-bar">
                <CharacterCounter charCount={displayFinalText.length} />
              </div>
            )}
          </div>

          {isTranslationEnabled && (
            <div 
              className="stt-resizer"
              onMouseDown={handleMouseDown}
            >
              <div className="stt-resizer-handle">
                <span className="stt-resizer-icon">⋮</span>
              </div>
            </div>
          )}

          {isTranslationEnabled && (
            <div 
              className="stt-panel stt-panel-right"
              style={{ width: `${100 - leftPanelWidth}%` }}
            >
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
          )}
        </div>
      </PageBox>

      {!isSupported && (
        <div className="stt-warning-box">
          ⚠️ Microphone access is not supported in this browser.
        </div>
      )}

      <div className="stt-stream-notes">
        📝 English uses Web Speech API (real-time) + Vosk lgraph (gap filling) • Other languages use Vosk offline
        {!isAuthenticated && ` • Guest limit: ${MAX_CHARS_GUEST.toLocaleString()} characters`}
      </div>

      <DebugPanel isOpen={showDebug && isAdmin} onClose={() => setShowDebug(false)} />
      
      <DownloadOverlay 
        isVisible={!!downloadingModel || isLoading} 
        modelLang={downloadingModel || selectedLang} 
        progress={downloadingModel ? downloadProgress : loadProgress}
      />
      
      <LoginModal isOpen={showLoginModal || (!isAuthenticated && isLimitReached)} onClose={closeLoginModal} />
    </PageLayout>
  )
}

export default SttStreamView
