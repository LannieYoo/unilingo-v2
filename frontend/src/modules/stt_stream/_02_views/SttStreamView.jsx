/**
 * SttStreamView
 * Web Speech API 기반 실시간 STT + 번역 뷰
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranscriptStore } from '../_05_stores'
import { useHybridSTT, useAutoScroll, useTranslation, useTimer, TRANSLATION_LANGUAGES, useInlineDictionary } from '../_04_hooks'
import { LANGUAGE_OPTIONS } from '../_08_constants'
import { getVoiceCode } from '../../../config/languages'
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

  // Web Speech API
  const hybridHook = useHybridSTT(selectedLang)

  const {
    stop: hybridStop,
    toggle: hybridToggle,
    isRunning: hybridIsRunning,
    isRestarting: hybridIsRestarting,
    transcript: hybridTranscript,
    interimTranscript: hybridInterimTranscript,
    error: hybridError,
    stats: hybridStats,
  } = hybridHook

  // All languages use Web Speech API
  const isRunning = hybridIsRunning
  const stop = hybridStop
  const toggle = hybridToggle
  const displayFinalText = hybridTranscript
  const displayInterimText = hybridInterimTranscript

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
    // Map translateCode (en, ko, zh) to voice code (en-US, ko-KR, zh-CN) for Web Speech API
    const voiceCode = getVoiceCode(targetLanguage)
    // Check if voiceCode matches any supported LANGUAGE_OPTIONS value
    const isSupported = LANGUAGE_OPTIONS.some(opt => opt.value === voiceCode)
    if (isSupported) {
      setSelectedLang(voiceCode)
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

  const handleLanguageChange = (newLang) => {
    setSelectedLang(newLang)
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
            
            <div className="stt-hybrid-status">
              <span className="stt-hybrid-badge">🎯 Web Speech API (Real-time)</span>
              {hybridIsRestarting && <span className="stt-processing">Reconnecting...</span>}
              <span className="stt-stats">Restarts: {hybridStats.restartCount}</span>
            </div>

            {hybridError && (
              <div className="stt-error-banner">
                <span className="stt-error-icon">⚠️</span>
                <div className="stt-error-content">
                  <div className="stt-error-title">
                    {hybridError.message.includes('audio-capture') ? 'Microphone Access Error' : 'Speech Recognition Error'}
                  </div>
                  <div className="stt-error-message">
                    {hybridError.message.includes('audio-capture') ? (
                      <>
                        Cannot access microphone. Please check:
                        <ul className="stt-error-list">
                          <li>Microphone is not being used by another app (Zoom, Teams, etc.)</li>
                          <li>Windows Settings → Privacy → Microphone → Allow desktop apps</li>
                          <li>Chrome Settings → Privacy → Site Settings → Microphone</li>
                          <li>Microphone is set as default recording device</li>
                        </ul>
                      </>
                    ) : hybridError.message.includes('not-allowed') ? (
                      'Microphone permission denied. Please allow microphone access in your browser.'
                    ) : (
                      hybridError.message
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="stt-buttons-group">
              <ActionButton
                variant={isRunning ? 'recording' : 'default'}
                onClick={handleToggle}
                disabled={!isSupported || (!isAuthenticated && isLimitReached && !isRunning) || (isAuthenticated && usageLimitExceeded && !isRunning)}
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

        {!isSupported && (
          <div className="stt-warning-box">
            ⚠️ Microphone access is not supported in this browser.
          </div>
        )}

        <div className="stt-stream-notes">
          📝 All languages use Web Speech API (real-time, requires internet, Chrome recommended)
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
    </PageLayout>
  )
}

export default SttStreamView
