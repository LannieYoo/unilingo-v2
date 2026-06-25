/**
 * SttStreamView
 * Web Speech API 기반 실시간 STT + 번역 뷰
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranscriptStore } from '../_05_stores'
import { useAutoScroll, useTranslation, useTimer, TRANSLATION_LANGUAGES, useInlineDictionary } from '../_04_hooks'
import { LANGUAGE_OPTIONS } from '../_08_constants'
import { getVoiceCode } from '../../../config/languages'
import { useSpeechInput, getSTTLanguage } from '../../../common/hooks/useSpeechInput'
import { addPunctuation } from '../_07_utils/textFormatter'
import {
  DebugPanel,
  LanguageSelect,
  StatusIndicator,
  ActionButton,
  DictionaryTooltip,
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

import { useUsage } from '../../../common/hooks/useUsage'
import { UsageIndicator } from '../../../common/components/UsageIndicator'
import { TopLoadingBar } from '../../../common/components/TopLoadingBar'

// Latency-bounded "typewriter": animates like typing but always empties the
// whole backlog within ~TYPE_DRAIN_TICKS ticks (~160ms), so the display never
// falls behind live speech. Short chunks still reveal char-by-char; large
// chunks/backlogs burst in fast instead of lagging seconds behind the speaker.
const STREAM_TYPE_INTERVAL_MS = 16
const TYPE_DRAIN_TICKS = 10

const getStreamTypeBatchSize = (queueLength) =>
  Math.max(1, Math.ceil(queueLength / TYPE_DRAIN_TICKS))

export function SttStreamView() {
  const {
    finalText,
    interimText,
    status,
    errorMessage,
    selectedLang,
    loadProgress,
    isSupported,
    showDebug,
    setSelectedLang,
    setShowDebug,
    clear,
    getFullText,
  } = useTranscriptStore()

  // Accumulated transcript state
  const [displayFinalText, setDisplayFinalText] = useState('')
  const [displayInterimText, setDisplayInterimText] = useState('')
  const [translationSourceText, setTranslationSourceText] = useState('')
  const [displayTranslatedText, setDisplayTranslatedText] = useState('')
  const [sttMode, setSttMode] = useState('local') // 'local' | 'server'
  const [showSttModeHelp, setShowSttModeHelp] = useState(false)
  const lastFinalRef = useRef('')
  const restartCountRef = useRef(0)
  const typewriterQueueRef = useRef('')
  const typewriterTimerRef = useRef(null)
  const translationTypewriterQueueRef = useRef('')
  const translationTypewriterTimerRef = useRef(null)
  const translationVisibleSourceRef = useRef('')

  const stopTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }
  }, [])

  const flushTypewriter = useCallback(() => {
    if (!typewriterQueueRef.current) return
    const remaining = typewriterQueueRef.current
    typewriterQueueRef.current = ''
    stopTypewriter()
    setDisplayFinalText(prev => prev + remaining)
  }, [stopTypewriter])

  const pumpTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) return

    typewriterTimerRef.current = setInterval(() => {
      if (!typewriterQueueRef.current) {
        stopTypewriter()
        return
      }

      const batchSize = getStreamTypeBatchSize(typewriterQueueRef.current.length)
      const next = typewriterQueueRef.current.slice(0, batchSize)
      typewriterQueueRef.current = typewriterQueueRef.current.slice(batchSize)
      setDisplayFinalText(prev => prev + next)
    }, STREAM_TYPE_INTERVAL_MS)
  }, [stopTypewriter])

  const appendStreamingText = useCallback((text) => {
    if (!text) return
    typewriterQueueRef.current += text
    pumpTypewriter()
  }, [pumpTypewriter])

  const stopTranslationTypewriter = useCallback(() => {
    if (translationTypewriterTimerRef.current) {
      clearInterval(translationTypewriterTimerRef.current)
      translationTypewriterTimerRef.current = null
    }
  }, [])

  const pumpTranslationTypewriter = useCallback(() => {
    if (translationTypewriterTimerRef.current) return

    translationTypewriterTimerRef.current = setInterval(() => {
      if (!translationTypewriterQueueRef.current) {
        stopTranslationTypewriter()
        return
      }

      const batchSize = getStreamTypeBatchSize(translationTypewriterQueueRef.current.length)
      const next = translationTypewriterQueueRef.current.slice(0, batchSize)
      translationTypewriterQueueRef.current = translationTypewriterQueueRef.current.slice(batchSize)
      setDisplayTranslatedText(prev => prev + next)
    }, STREAM_TYPE_INTERVAL_MS)
  }, [stopTranslationTypewriter])

  const appendStreamingTranslation = useCallback((text) => {
    if (!text) return
    translationTypewriterQueueRef.current += text
    pumpTranslationTypewriter()
  }, [pumpTranslationTypewriter])

  // Unified STT hook: routes based on mode (local/server)
  const sttLanguage = getSTTLanguage(selectedLang)
  const {
    start: sttStart,
    stop: sttStop,
    isListening: isRunning,
    error: sttError,
    isAvailable: sttAvailable,
    isModelLoading,
    modelLoadProgress,
    activeEngine,
  } = useSpeechInput({
    language: sttLanguage,
    mode: sttMode,
    continuous: true,
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        if (text === lastFinalRef.current) return
        lastFinalRef.current = text
        const cleaned = text.replace(/[.。！？!?]+$/, '')
        const chunkText = `${cleaned} `
        appendStreamingText(chunkText)
        setTranslationSourceText(prev => prev + chunkText)
        setDisplayInterimText('')
      } else if (!isFinal && text.trim()) {
        setDisplayInterimText(text)
      }
    },
  })

  // Local model isn't ready until the worker reports progress 1; server/web-speech
  // report progress 1 immediately. Blocks premature Start ("Model is still loading").
  const sttLoading = isModelLoading || (modelLoadProgress ?? 1) < 1

  const stop = useCallback(() => {
    sttStop()
    flushTypewriter()
    setDisplayInterimText('')
    lastFinalRef.current = ''
  }, [flushTypewriter, sttStop])

  const toggle = useCallback(async () => {
    if (isRunning) {
      stop()
    } else {
      sttStart()
    }
  }, [isRunning, stop, sttStart])

  // Determine current engine name for badge
  const ENGINE_LABELS = {
    'server-whisper': '🖥️ Server Whisper',
    'wasm': '🔧 Local SenseVoice',
    'web-speech': '🌐 Web Speech',
  }
  const engineName = ENGINE_LABELS[activeEngine] || '🎯 Speech Recognition'

  const handleModeToggle = useCallback(() => {
    if (isRunning) return // Don't switch while recording
    setSttMode(prev => prev === 'local' ? 'server' : 'local')
  }, [isRunning])

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
    selectedWord,
    position,
    dictionaryData,
    translation,
    isFavorited,
    isLoading: isDictionaryLoading,
    handleWordClick,
    toggleFavorite,
    closeTooltip
  } = useInlineDictionary(targetLang)

  const {
    formattedTime,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer
  } = useTimer()

  const { isAuthenticated, tokens, isAdmin } = useAuthStore()
  
  const {
    isLimitReached,
    showLoginModal,
    closeLoginModal,
  } = useCharacterLimit(displayFinalText)

  const {
    usage,
    trackUsage,
    isLimitExceeded,
  } = useUsage()

  const [usageLimitExceeded, setUsageLimitExceeded] = useState(false)

  // Update limit exceeded state when usage changes
  useEffect(() => {
    if (isAuthenticated && isLimitExceeded()) {
      setUsageLimitExceeded(true)
    }
  }, [isAuthenticated, isLimitExceeded, usage])

  const { targetLanguage, isLoaded: preferencesLoaded } = useLanguagePreferences()

  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef(null)



  useEffect(() => {
    if (!preferencesLoaded) return
    const voiceCode = getVoiceCode(targetLanguage)
    const isLangSupported = LANGUAGE_OPTIONS.some(opt => opt.value === voiceCode)
    if (isLangSupported) {
      setSelectedLang(voiceCode)
    }
  }, [preferencesLoaded, targetLanguage, setSelectedLang])

  const fullText = getFullText()
  
  const { containerRef: leftRef, handleScroll: handleLeftScroll } = useAutoScroll([displayFinalText, displayInterimText])
  const { containerRef: rightRef, handleScroll: handleRightScroll } = useAutoScroll([displayTranslatedText])

  const prevFinalTextRef = useRef('')
  const sessionStartTimeRef = useRef(null)
  const sessionWordCountRef = useRef(0)

  useEffect(() => {
    return () => {
      stopTypewriter()
      stopTranslationTypewriter()
    }
  }, [stopTranslationTypewriter, stopTypewriter])

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
        const charCount = displayFinalText.length
        if (durationSeconds > 0 || wordCount > 0) {
          authService.createSttLog(tokens.access_token, {
            language: selectedLang,
            duration_seconds: durationSeconds,
            word_count: wordCount,
          }).catch(err => {
            console.error('Failed to log STT usage:', err)
          })
          
          // Track usage for limit enforcement
          if (charCount > 0) {
            trackUsage(charCount, 'stt_stream').catch(err => {
              console.error('Failed to track STT usage:', err)
            })
          }
        }
        sessionStartTimeRef.current = null
      }
    }
  }, [isRunning, startTimer, stopTimer, isAuthenticated, tokens, selectedLang, displayFinalText.length, trackUsage])

  useEffect(() => {
    if (!isAuthenticated && isRunning && displayFinalText.length >= MAX_CHARS_GUEST) {
      stop()
    }
  }, [isAuthenticated, isRunning, displayFinalText.length, stop])


  useEffect(() => {
    if (!translationSourceText || translationSourceText === prevFinalTextRef.current) return
    const newPart = translationSourceText.slice(prevFinalTextRef.current.length).trim()
    prevFinalTextRef.current = translationSourceText
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
  }, [translationSourceText, selectedLang, addSentenceToTranslate])

  useEffect(() => {
    if (!translatedText) {
      translationVisibleSourceRef.current = ''
      translationTypewriterQueueRef.current = ''
      stopTranslationTypewriter()
      setDisplayTranslatedText('')
      return
    }

    const previousText = translationVisibleSourceRef.current
    if (translatedText.startsWith(previousText)) {
      const addedText = translatedText.slice(previousText.length)
      translationVisibleSourceRef.current = translatedText
      appendStreamingTranslation(addedText)
      return
    }

    translationVisibleSourceRef.current = translatedText
    translationTypewriterQueueRef.current = ''
    stopTranslationTypewriter()
    setDisplayTranslatedText(translatedText)
  }, [appendStreamingTranslation, stopTranslationTypewriter, translatedText])

  const handleLanguageChange = (newLang) => {
    setSelectedLang(newLang)
  }

  const handleClear = () => {
    clear()
    clearTranslation()
    resetTimer()
    prevFinalTextRef.current = ''
    typewriterQueueRef.current = ''
    translationTypewriterQueueRef.current = ''
    stopTypewriter()
    stopTranslationTypewriter()
    setDisplayFinalText('')
    setDisplayInterimText('')
    setTranslationSourceText('')
    setDisplayTranslatedText('')
    translationVisibleSourceRef.current = ''
    lastFinalRef.current = ''
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
    // Check usage limit for authenticated users
    if (!isRunning && isAuthenticated && usageLimitExceeded) {
      return
    }
    toggle()
  }, [isRunning, isAuthenticated, displayFinalText.length, toggle, usageLimitExceeded])

  // 텍스트를 단어로 분리하여 클릭 가능하게 렌더링
  const renderClickableText = useCallback((text) => {
    if (!text) return null
    
    // 단어와 공백/구두점을 분리
    const tokens = text.split(/(\s+|[.,!?;:()[\]{}'"—-])/g)
    
    return tokens.map((token, index) => {
      // 공백이나 구두점은 그대로 렌더링
      if (!token || /^\s+$/.test(token) || /^[.,!?;:()[\]{}'"—-]+$/.test(token)) {
        return <span key={index}>{token}</span>
      }
      
      // 로그인하지 않은 경우 클릭 불가능
      if (!isAuthenticated) {
        return <span key={index}>{token}</span>
      }
      
      // 단어는 클릭 가능하게
      return (
        <span
          key={index}
          className={`clickable-word ${selectedWord === token ? 'selected' : ''}`}
          onClick={(e) => handleWordClick(token, e)}
        >
          {token}
        </span>
      )
    })
  }, [selectedWord, handleWordClick, isAuthenticated])

  const handleUsageLimitExceeded = useCallback(() => {
    setUsageLimitExceeded(true)
  }, [])

  return (
    <PageLayout title="Speech to Text" fullHeight>
      <TopLoadingBar isLoading={isTranslating || isRetranslating || isDictionaryLoading} />
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
            <StatusIndicator status={status} loadProgress={loadProgress} errorMessage={errorMessage} />


            {sttError && (
              <div className="stt-error-banner">
                <span className="stt-error-icon">⚠️</span>
                <div className="stt-error-content">
                  <div className="stt-error-title">
                    {sttError.message?.includes('audio-capture') ? 'Microphone Access Error' : 'Speech Recognition Error'}
                  </div>
                  <div className="stt-error-message">
                    {sttError.message?.includes('audio-capture') ? (
                      <>
                        Cannot access microphone. Please check:
                        <ul className="stt-error-list">
                          <li>Microphone is not being used by another app (Zoom, Teams, etc.)</li>
                          <li>Windows Settings → Privacy → Microphone → Allow desktop apps</li>
                          <li>Chrome Settings → Privacy → Site Settings → Microphone</li>
                          <li>Microphone is set as default recording device</li>
                        </ul>
                      </>
                    ) : sttError.message?.includes('not-allowed') ? (
                      'Microphone permission denied. Please allow microphone access.'
                    ) : (
                      sttError.message || 'Unknown error'
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="stt-buttons-group">
              <ActionButton
                variant={isRunning ? 'recording' : 'default'}
                onClick={handleToggle}
                disabled={!sttAvailable || (!isRunning && sttLoading) || (!isAuthenticated && isLimitReached && !isRunning) || (isAuthenticated && usageLimitExceeded && !isRunning)}
              >
                {isRunning ? 'Stop' : sttLoading ? 'Loading…' : 'Start'}
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
            <div className="stt-hybrid-status">
              <span className="stt-hybrid-badge">{engineName}</span>
            </div>
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

        <div 
          className={`stt-dual-panels ${!isTranslationEnabled ? 'stt-translation-disabled' : ''} ${isResizing ? 'stt-resizing' : ''}`}
          ref={containerRef}
        >
          <div 
            className="stt-panel stt-panel-left"
            style={isTranslationEnabled ? { width: `${leftPanelWidth}%` } : {}}
          >
            <div className="stt-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LanguageSelect
                  value={selectedLang}
                  onChange={handleLanguageChange}
                  disabled={isRunning}
                  label=""
                />
                <button
                  className={`stt-mode-toggle ${sttMode === 'server' ? 'server' : 'local'}`}
                  onClick={handleModeToggle}
                  disabled={isRunning}
                  title={sttMode === 'server' ? 'Server Whisper (GPU) — click for Local' : 'Local SenseVoice — click for Server'}
                >
                  <span className="stt-mode-toggle-track">
                    <span className="stt-mode-toggle-thumb" />
                  </span>
                  <span className="stt-mode-toggle-label">{sttMode === 'server' ? 'Server' : 'Local'}</span>
                </button>
                <button
                  className="stt-mode-help-btn"
                  onClick={() => setShowSttModeHelp(true)}
                  title="Local vs Server 차이점"
                >?</button>
              </div>
              <span className="stt-char-count">
                {(displayFinalText || '').length} chars • {formattedTime}
              </span>
            </div>
            <div 
              className="stt-panel-content"
              ref={leftRef}
              onScroll={handleLeftScroll}
            >
              {displayFinalText && (
                <span className="stt-final-text">
                  {renderClickableText(displayFinalText)}
                </span>
              )}
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
                    `${(displayTranslatedText || translatedText || '').length} chars`
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
                {displayTranslatedText ? (
                  <span className="stt-translated-text">{displayTranslatedText}</span>
                ) : (
                  <span className="stt-placeholder">Translation will appear here...</span>
                )}
              </div>
            </div>
          )}
        </div>

        {!sttAvailable && (
          <div className="stt-warning-box">
            ⚠️ Microphone access is not supported in this browser.
          </div>
        )}

        <div className="stt-stream-notes">
          📝 Real-time speech recognition • Chrome recommended for best results
          {!isAuthenticated && ` • Guest limit: ${MAX_CHARS_GUEST.toLocaleString()} characters`}
        </div>
      </PageBox>

      <DebugPanel isOpen={showDebug && isAdmin} onClose={() => setShowDebug(false)} />
      

      
      <LoginModal isOpen={showLoginModal || (!isAuthenticated && isLimitReached)} onClose={closeLoginModal} />
      
      {/* STT Stream Usage Indicator - 고정 높이 컨테이너로 레이아웃 점프 방지 */}
      <div className="stt-usage-indicator-container">
        <UsageIndicator usageType="stt_stream" label="STT Stream" />
      </div>
      
      <DictionaryTooltip
        word={selectedWord}
        position={position}
        dictionaryData={dictionaryData}
        translation={translation}
        isFavorited={isFavorited}
        isLoading={isDictionaryLoading}
        onClose={closeTooltip}
        onToggleFavorite={toggleFavorite}
      />

      {/* STT Mode Help Modal */}
      {showSttModeHelp && (
        <div className="stt-mode-help-overlay" onClick={() => setShowSttModeHelp(false)}>
          <div className="stt-mode-help-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>🎤 Voice Recognition Mode</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="stt-mode-help-card local">
                <div className="stt-mode-help-card-header">
                  <span className="stt-mode-help-badge local">Local</span>
                  <span style={{ fontWeight: 600 }}>SenseVoice (Browser)</span>
                </div>
                <ul className="stt-mode-help-list">
                  <li>Runs entirely in your browser (WASM)</li>
                  <li>No internet required after model download</li>
                  <li>Unlimited usage — no daily limits</li>
                  <li>Good accuracy for clear speech</li>
                  <li>First-time model download ~40MB</li>
                </ul>
              </div>

              <div className="stt-mode-help-card server">
                <div className="stt-mode-help-card-header">
                  <span className="stt-mode-help-badge server">Server</span>
                  <span style={{ fontWeight: 600 }}>Whisper large-v3 (GPU)</span>
                </div>
                <ul className="stt-mode-help-list">
                  <li>Runs on server with GPU acceleration</li>
                  <li>Higher accuracy, especially for accented speech</li>
                  <li>Better at handling background noise</li>
                  <li>Requires internet connection</li>
                  <li><strong style={{ color: '#dc2626' }}>⚠ Daily usage time is limited by member level</strong></li>
                </ul>
              </div>

              <div className="stt-mode-help-note">
                <strong>💡 Tip:</strong> Use <em>Local</em> for everyday practice. Switch to <em>Server</em> when you need maximum accuracy (e.g., scoring tests or accented speakers).
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setShowSttModeHelp(false)}
                style={{
                  width: '100%', padding: '10px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', background: '#f8fafc', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, color: '#475569'
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

export default SttStreamView
