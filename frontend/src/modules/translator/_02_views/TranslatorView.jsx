/**
 * TranslatorView
 * 번역 페이지 뷰
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSpeechInput, getSTTLanguage } from '../../../common/hooks/useSpeechInput'
import { useNavigate } from 'react-router-dom'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranslator, useOCR, useTTS } from '../_04_hooks'
import { SOURCE_LANGUAGES, TARGET_LANGUAGES, LANG_MAP } from '../_08_constants'
import { getVoiceCode } from '../../../config/languages'
import { useAuthStore, authService, MAX_CHARS_GUEST, LoginModal } from '../../auth'
import { useUsage } from '../../../common/hooks/useUsage'
import { UsageIndicator } from '../../../common/components/UsageIndicator'
import { TopLoadingBar } from '../../../common/components/TopLoadingBar'
import { AILoadingBar } from '../../../common/components/AILoadingBar'
import { useAI } from '../../../common/hooks/useAI'
import '../_10_styles/translator.css'

export function TranslatorView() {
  const {
    inputText,
    outputText,
    sourceLang,
    targetLang,
    isTranslating,
    setInputText,
    setInputTextRaw,
    setSourceLang,
    setTargetLang,
    translate,
  } = useTranslator()

  const { isAuthenticated, tokens } = useAuthStore()
  const navigate = useNavigate()
  const { trackUsage, isLimitExceeded: checkUsageLimit } = useUsage()
  const { extractText, isProcessing: isOCRProcessing, progress: ocrProgress, error: ocrError } = useOCR()
  const { speak, stop, isSpeaking, currentLang, isSupported: isTTSSupported } = useTTS()
  const fileInputRef = useRef(null)
  const inputTextareaRef = useRef(null)
  const outputTextareaRef = useRef(null)
  const [recentHistory, setRecentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, text }
  const [deletingId, setDeletingId] = useState(null)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedText, setLastSavedText] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [guestCharCount, setGuestCharCount] = useState(0)
  const [conversationMode, setConversationMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  // AI grammar correction
  const { checkGrammar, modelStates } = useAI()
  const [grammarSuggestion, setGrammarSuggestion] = useState(null)
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)
  const grammarTimeoutRef = useRef(null)

  // Shared STT hook: auto-branches between WASM (browser), native (mobile), Electron
  const sttLanguage = getSTTLanguage(sourceLang)
  const sttBaseTextRef = useRef('')  // Text before current interim result
  const hasInterimRef = useRef(false)
  const {
    start: startListening,
    stop: stopListening,
    isListening,
    isAvailable: isSpeechSupported,
    isModelLoading: isSttModelLoading,
    modelLoadProgress: sttModelProgress,
    modelLoadStage: sttModelStage,
    activeEngine: sttEngine,
  } = useSpeechInput({
    language: sttLanguage,
    continuous: true,
    onResult: (text, isFinal) => {
      console.log('[STT-DEBUG] onResult called:', { text, isFinal, baseText: sttBaseTextRef.current })
      if (isFinal && text.trim()) {
        // Final result: set base text to include this final result
        const newText = sttBaseTextRef.current + (sttBaseTextRef.current ? '\n' : '') + text
        sttBaseTextRef.current = newText
        hasInterimRef.current = false
        setInputTextRaw(newText)
        // Immediately trigger translation for the final result
        // (don't wait for the 500ms debounce — improves responsiveness)
        translate(newText)
        console.log('[STT-DEBUG] Final result set:', newText)
      } else if (!isFinal && text.trim()) {
        // Interim result: replace previous interim (don't accumulate)
        const display = sttBaseTextRef.current + (sttBaseTextRef.current ? '\n' : '') + text
        hasInterimRef.current = true
        setInputTextRaw(display)
        console.log('[STT-DEBUG] Interim result set:', display)
      }
    },
  })

  // Voice input handler using shared STT hook
  const handleVoiceInput = () => {
    console.log('[STT-DEBUG] handleVoiceInput called, isSpeechSupported:', isSpeechSupported, 'isListening:', isListening)
    if (isSttModelLoading) {
      // Model still downloading, show feedback
      return
    }
    if (!isSpeechSupported) {
      alert('Speech recognition is not available.')
      return
    }
    if (isListening) {
      stopListening()
    } else {
      // Snapshot current text as the base for STT results
      sttBaseTextRef.current = inputText || ''
      hasInterimRef.current = false
      console.log('[STT-DEBUG] Starting listening, base text:', sttBaseTextRef.current)
      startListening()
    }
  }

  // Auto-scroll input textarea to bottom when text changes
  useEffect(() => {
    if (inputTextareaRef.current) {
      inputTextareaRef.current.scrollTop = inputTextareaRef.current.scrollHeight
    }
  }, [inputText])

  // Auto-scroll output textarea to bottom when text changes
  useEffect(() => {
    if (outputTextareaRef.current) {
      outputTextareaRef.current.scrollTop = outputTextareaRef.current.scrollHeight
    }
  }, [outputText])

  // Stop voice recognition when sourceLang changes (handled by useSpeechInput internally)

  // Check if user has exceeded their usage limit
  const isLimitExceeded = isAuthenticated && checkUsageLimit()

  // Load recent history on mount
  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadRecentHistory()
    }
  }, [isAuthenticated, tokens?.access_token])

  // Grammar correction: debounce check when English text is typed
  useEffect(() => {
    if (grammarTimeoutRef.current) clearTimeout(grammarTimeoutRef.current)
    setGrammarSuggestion(null)

    // Only check English text that's long enough
    const isEnglish = sourceLang === 'en' || /^[a-zA-Z\s.,!?;:'"()-]+$/.test(inputText?.trim() || '')
    if (!isEnglish || !inputText?.trim() || inputText.trim().length < 8) return

    grammarTimeoutRef.current = setTimeout(async () => {
      setIsCheckingGrammar(true)
      try {
        const corrected = await checkGrammar(inputText.trim())
        if (corrected && corrected !== inputText.trim()) {
          setGrammarSuggestion(corrected)
        }
      } catch (err) {
        console.error('[Grammar] Check failed:', err)
      } finally {
        setIsCheckingGrammar(false)
      }
    }, 1500)

    return () => {
      if (grammarTimeoutRef.current) clearTimeout(grammarTimeoutRef.current)
    }
  }, [inputText, sourceLang, checkGrammar])

  const loadRecentHistory = async () => {
    if (!tokens?.access_token) return
    
    setLoadingHistory(true)
    try {
      const data = await authService.getRecentTranslationLogs(tokens.access_token, 5)
      setRecentHistory(data.logs || [])
    } catch (err) {
      // 401 에러는 무시 (비로그인 상태)
      if (err.response?.status !== 401) {
        console.error('Failed to load translation history:', err)
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSaveToHistory = async () => {
    if (!isAuthenticated || !tokens?.access_token) {
      return
    }
    
    if (!inputText?.trim() || !outputText?.trim()) {
      return
    }
    
    setIsSaving(true)
    try {
      await authService.createTranslationLog(tokens.access_token, {
        source_text: inputText,
        translated_text: outputText,
        source_lang: LANG_MAP[sourceLang] || 'en',
        target_lang: LANG_MAP[targetLang] || 'ko',
        provider: 'google',
      })
      setLastSavedText(outputText)
      // Reload history
      await loadRecentHistory()
    } catch (err) {
      console.error('Failed to save translation:', err)
      if (err.response?.status === 500) {
        alert('Failed to save translation. Please check your internet connection and try again.')
      } else {
        alert('Failed to save translation. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Save individual sentence pair
  const [savingSentenceIdx, setSavingSentenceIdx] = useState(null)
  const [savedSentences, setSavedSentences] = useState(new Set())

  const handleSaveSentence = async (srcLine, tgtLine, idx) => {
    if (!isAuthenticated || !tokens?.access_token) return
    if (!srcLine?.trim() || !tgtLine?.trim()) return

    setSavingSentenceIdx(idx)
    try {
      await authService.createTranslationLog(tokens.access_token, {
        source_text: srcLine.trim(),
        translated_text: tgtLine.trim(),
        source_lang: LANG_MAP[sourceLang] || 'en',
        target_lang: LANG_MAP[targetLang] || 'ko',
        provider: 'google',
      })
      setSavedSentences(prev => new Set([...prev, idx]))
      await loadRecentHistory()
    } catch (err) {
      console.error('Failed to save sentence:', err)
      alert('Failed to save. Please try again.')
    } finally {
      setSavingSentenceIdx(null)
    }
  }

  const handleHistoryClick = useCallback((item) => {
    setInputText(item.source_text)
  }, [setInputText])

  const handleDeleteClick = (e, item) => {
    e.stopPropagation() // Prevent triggering handleHistoryClick
    setDeleteConfirm({ id: item.id, text: item.source_text })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !tokens?.access_token) return
    
    setDeletingId(deleteConfirm.id)
    try {
      await authService.deleteTranslationLog(tokens.access_token, deleteConfirm.id)
      setRecentHistory(recentHistory.filter(h => h.id !== deleteConfirm.id))
    } catch (err) {
      console.error('Failed to delete translation:', err)
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  const handleToggleFavorite = async (e, item) => {
    e.stopPropagation()
    if (!tokens?.access_token || togglingFavoriteId) return
    
    setTogglingFavoriteId(item.id)
    try {
      const result = await authService.toggleTranslationFavorite(tokens.access_token, item.id)
      setRecentHistory(recentHistory.map(h => 
        h.id === item.id ? { ...h, is_favorite: result.log.is_favorite } : h
      ))
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString('en-US')
  }

  const getLangName = (code) => {
    const langMap = {
      'en': 'EN',
      'ko': 'KO',
      'zh': 'ZH',
    }
    return langMap[code] || code?.toUpperCase()
  }

  const handleSwapLanguages = () => {
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
  }

  // Track guest user character count
  useEffect(() => {
    if (!isAuthenticated) {
      setGuestCharCount(inputText.length)
    }
  }, [inputText, isAuthenticated])

  // Check if guest user exceeded limit
  const isGuestLimitExceeded = !isAuthenticated && guestCharCount >= MAX_CHARS_GUEST

  const handleTranslate = async () => {
    // Check guest limit before translation
    if (!isAuthenticated && inputText.length > MAX_CHARS_GUEST) {
      setShowLoginModal(true)
      return
    }

    await translate()
    
    // Track usage after translation for authenticated users
    if (outputText && isAuthenticated) {
      const charCount = inputText.length
      await trackUsage(charCount, 'translator')
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      return
    }

    try {
      // Determine OCR language based on source language
      let ocrLang = 'eng'
      if (sourceLang === 'ko') ocrLang = 'kor'
      else if (sourceLang === 'zh') ocrLang = 'chi_sim'
      else if (sourceLang === 'ja') ocrLang = 'jpn'
      else if (sourceLang === 'es') ocrLang = 'spa'
      else if (sourceLang === 'fr') ocrLang = 'fra'
      else if (sourceLang === 'de') ocrLang = 'deu'
      else if (sourceLang === 'ar') ocrLang = 'ara'
      else if (sourceLang === 'hi') ocrLang = 'hin'
      
      // Always include English for better accuracy
      if (ocrLang !== 'eng') {
        ocrLang = `${ocrLang}+eng`
      }

      const text = await extractText(file, ocrLang)
      
      if (text) {
        setInputText(text)
      } else {
        alert('No text found in the image')
      }
    } catch (err) {
      console.error('OCR failed:', err)
      alert('Failed to extract text from image. Please try another image.')
    } finally {
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSpeakSource = () => {
    if (!inputText?.trim()) return
    
    const ttsLang = getVoiceCode(sourceLang)
    
    if (isSpeaking && currentLang === ttsLang) {
      stop()
    } else {
      speak(inputText, ttsLang)
    }
  }

  const handleSpeakTarget = () => {
    if (!outputText?.trim()) return
    
    const ttsLang = getVoiceCode(targetLang)
    
    if (isSpeaking && currentLang === ttsLang) {
      stop()
    } else {
      speak(outputText, ttsLang)
    }
  }

  const handlePaste = async (event) => {
    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        
        const file = item.getAsFile()
        if (!file) continue

        try {
          // Determine OCR language based on source language
          let ocrLang = 'eng'
          if (sourceLang === 'ko') ocrLang = 'kor'
          else if (sourceLang === 'zh') ocrLang = 'chi_sim'
          else if (sourceLang === 'ja') ocrLang = 'jpn'
          else if (sourceLang === 'es') ocrLang = 'spa'
          else if (sourceLang === 'fr') ocrLang = 'fra'
          else if (sourceLang === 'de') ocrLang = 'deu'
          else if (sourceLang === 'ar') ocrLang = 'ara'
          else if (sourceLang === 'hi') ocrLang = 'hin'
          
          if (ocrLang !== 'eng') {
            ocrLang = `${ocrLang}+eng`
          }

          const text = await extractText(file, ocrLang)
          
          if (text) {
            setInputText(text)
          } else {
            alert('No text found in the image')
          }
        } catch (err) {
          console.error('OCR failed:', err)
          alert('Failed to extract text from image. Please try another image.')
        }
        
        break
      }
    }
  }

  // Focus mode: hide navbar, fullscreen translator
  useEffect(() => {
    if (focusMode) {
      document.body.classList.add('translator-focus-active')
    } else {
      document.body.classList.remove('translator-focus-active')
    }
    return () => document.body.classList.remove('translator-focus-active')
  }, [focusMode])

  return (
    <PageLayout title="Translator">
      <TopLoadingBar isLoading={isTranslating || isOCRProcessing} />
      <AILoadingBar modelStates={modelStates} />
      <PageBox className={focusMode ? 'translator-focus-mode' : ''}>
        {/* 언어 선택 */}
        <div className="translator-lang-selectors">
          <div className="translator-lang-group">
            <label>Source Language</label>
            <div className="translator-source-row">
              <select
                value={sourceLang}
                onChange={(e) => {
                  setSourceLang(e.target.value)
                }}
                className="translator-lang-select"
              >
                {SOURCE_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              {/* Mobile compact buttons */}
              <div className="translator-mobile-actions">
                <button
                  onClick={handleUploadClick}
                  disabled={isOCRProcessing}
                  className="translator-mobile-action-btn"
                  title="Upload image"
                >
                  <span className="material-symbols-outlined">image</span>
                </button>
                {isSpeechSupported && (
                  <button
                    onClick={handleVoiceInput}
                    className={`translator-mobile-action-btn ${isListening ? 'listening' : ''}`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    <span className="material-symbols-outlined">
                      {isListening ? 'mic_off' : 'mic'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleSwapLanguages}
            className="translator-swap-btn"
            title="Swap languages"
          >
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>
          
          <div className="translator-lang-group translator-target-lang-group">
            <label>Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="translator-lang-select"
            >
              {TARGET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 입력 */}
        <div className="translator-section translator-input-wrapper">
          {/* Image Upload Button */}
          <div className="translator-image-upload-container">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleUploadClick}
              disabled={isOCRProcessing}
              className="translator-image-upload-btn"
              title="Upload image to extract text (not saved on server)"
            >
              <span className="material-symbols-outlined">image</span>
              <span className="translator-image-upload-text">
                {isOCRProcessing ? `Processing... ${ocrProgress}%` : 'Upload Image'}
              </span>
            </button>
            {(isSpeechSupported || isSttModelLoading) && (
              <button
                onClick={handleVoiceInput}
                className={`translator-voice-btn ${isListening ? 'listening' : ''} ${isSttModelLoading ? 'loading' : ''}`}
                title={isSttModelLoading ? `Loading STT model: ${sttModelStage || '...'}` : isListening ? 'Stop listening' : 'Voice input'}
                disabled={isSttModelLoading}
              >
                <span className="material-symbols-outlined">
                  {isSttModelLoading ? 'downloading' : isListening ? 'mic_off' : 'mic'}
                </span>
                <span className="translator-voice-btn-text">
                  {isSttModelLoading
                    ? `Loading... ${Math.round((sttModelProgress || 0) * 100)}%`
                    : isListening ? 'Listening...' : 'Voice Input'}
                </span>
                {isSttModelLoading && (
                  <span
                    className="translator-voice-progress"
                    style={{ width: `${(sttModelProgress || 0) * 100}%` }}
                  />
                )}
              </button>
            )}
            <span className="translator-image-upload-hint">
              📷 Image is processed locally • 🎤 {sttEngine === 'wasm' ? 'WASM Local STT' : sttEngine === 'web-speech' ? 'Web Speech' : sttEngine === 'server' ? 'Server STT' : 'Voice input'}
            </span>
            {/* Right-aligned button group in toolbar */}
            <div className="translator-toolbar-right">
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !inputText?.trim() || (isAuthenticated && isLimitExceeded) || isGuestLimitExceeded}
                className="translator-btn translator-btn--toolbar"
                title={isLimitExceeded ? 'Usage limit exceeded' : isGuestLimitExceeded ? 'Guest limit reached - Please login' : ''}
              >
                {isTranslating ? 'Translating...' : 
                 isLimitExceeded ? 'Limit Exceeded' : 
                 isGuestLimitExceeded ? 'Login Required' : 
                 'Translate'}
              </button>
              <button
                onClick={() => setConversationMode(prev => !prev)}
                className={`translator-conv-btn ${conversationMode ? 'active' : ''}`}
                title={conversationMode ? 'Exit conversation mode' : 'Flip output for the person across'}
              >
                <span className="material-symbols-outlined">
                  {conversationMode ? 'screen_rotation_alt' : 'screen_rotation'}
                </span>
              </button>
              <button
                onClick={() => setFocusMode(prev => !prev)}
                className={`translator-conv-btn translator-focus-btn ${focusMode ? 'active' : ''}`}
                title={focusMode ? 'Exit focus mode' : 'Focus mode'}
              >
                <span className="material-symbols-outlined">
                  {focusMode ? 'close_fullscreen' : 'open_in_full'}
                </span>
              </button>
              {/* Save to History */}
              {isAuthenticated && outputText && (
                <button
                  onClick={handleSaveToHistory}
                  disabled={isSaving || !outputText?.trim() || outputText === lastSavedText}
                  className="translator-save-btn"
                  title={outputText === lastSavedText ? 'Already saved' : 'Save to History'}
                >
                  <span className="material-symbols-outlined">
                    {outputText === lastSavedText ? 'bookmark' : 'bookmark_add'}
                  </span>
                </button>
              )}
            </div>
          </div>
          
          <div className="translator-textarea-container">
            <textarea
              ref={inputTextareaRef}
              value={inputText}
              onChange={(e) => {
                const newText = e.target.value
                // Limit guest users to MAX_CHARS_GUEST
                if (!isAuthenticated && newText.length > MAX_CHARS_GUEST) {
                  setInputText(newText.slice(0, MAX_CHARS_GUEST))
                  setShowLoginModal(true)
                } else {
                  setInputText(newText)
                }
              }}
              onPaste={handlePaste}
              placeholder="Enter text to translate... (Auto-translates as you type) or paste image (Ctrl+V)"
              className="translator-textarea"
              style={{ height: '25vh' }}
              disabled={isOCRProcessing}
            />
            {inputText && (
              <>
                <button
                  onClick={() => {
                    stop()
                    setInputText('')
                  }}
                  className="translator-clear-btn"
                  title="Clear text"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                {isTTSSupported && (
                  <button
                    onClick={handleSpeakSource}
                    className={`translator-speak-btn ${isSpeaking && currentLang === getVoiceCode(sourceLang) ? 'speaking' : ''}`}
                    title={isSpeaking && currentLang === getVoiceCode(sourceLang) ? 'Stop' : 'Listen'}
                  >
                    <span className="material-symbols-outlined">
                      {isSpeaking && currentLang === getVoiceCode(sourceLang) ? 'stop_circle' : 'volume_up'}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
          <div
            className="translator-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault()
              const textarea = inputTextareaRef.current
              const startY = e.clientY
              const startH = textarea.offsetHeight
              const onMove = (ev) => { textarea.style.height = Math.max(60, startH + ev.clientY - startY) + 'px' }
              const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
            onTouchStart={(e) => {
              const textarea = inputTextareaRef.current
              const startY = e.touches[0].clientY
              const startH = textarea.offsetHeight
              const onMove = (ev) => { ev.preventDefault(); textarea.style.height = Math.max(60, startH + ev.touches[0].clientY - startY) + 'px' }
              const onUp = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp) }
              document.addEventListener('touchmove', onMove, { passive: false })
              document.addEventListener('touchend', onUp)
            }}
          >
          <div className="translator-resize-handle-bar" />
          </div>

          {/* Grammar correction suggestion */}
          {grammarSuggestion && (
            <div className="translator-grammar-suggestion">
              <div className="translator-grammar-header">
                <span className="translator-grammar-icon">✨</span>
                <span className="translator-grammar-label">Grammar Suggestion</span>
                <button
                  className="translator-grammar-dismiss"
                  onClick={() => setGrammarSuggestion(null)}
                  title="Dismiss"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
              <div className="translator-grammar-text">{grammarSuggestion}</div>
              <button
                className="translator-grammar-apply"
                onClick={() => {
                  setInputText(grammarSuggestion)
                  setGrammarSuggestion(null)
                }}
              >
                Apply Correction
              </button>
            </div>
          )}
          {isCheckingGrammar && (
            <div className="translator-grammar-checking">
              <span className="translator-grammar-spinner">⏳</span>
              Checking grammar...
            </div>
          )}
        </div>

        {/* Focus mode btn-group */}
        {focusMode && (
          <div className="translator-btn-group">
            <button
              onClick={handleUploadClick}
              disabled={isOCRProcessing}
              className="translator-conv-btn"
              title="Upload image"
            >
              <span className="material-symbols-outlined">image</span>
            </button>
            {isSpeechSupported && (
              <button
                onClick={handleVoiceInput}
                className={`translator-conv-btn voice-focus-btn ${isListening ? 'active' : ''}`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                <span className="material-symbols-outlined">
                  {isListening ? 'mic_off' : 'mic'}
                </span>
              </button>
            )}
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !inputText?.trim() || (isAuthenticated && isLimitExceeded) || isGuestLimitExceeded}
              className="translator-btn"
              title={isLimitExceeded ? 'Usage limit exceeded' : isGuestLimitExceeded ? 'Guest limit reached - Please login' : ''}
            >
              {isTranslating ? 'Translating...' : 
               isLimitExceeded ? 'Limit Exceeded' : 
               isGuestLimitExceeded ? 'Login Required' : 
               'Translate'}
            </button>
            <button
              onClick={() => setConversationMode(prev => !prev)}
              className={`translator-conv-btn ${conversationMode ? 'active' : ''}`}
              title={conversationMode ? 'Exit conversation mode' : 'Flip output'}
            >
              <span className="material-symbols-outlined">
                {conversationMode ? 'screen_rotation_alt' : 'screen_rotation'}
              </span>
            </button>
            <button
              onClick={() => setFocusMode(false)}
              className="translator-conv-btn translator-focus-btn active"
              title="Exit focus mode"
            >
              <span className="material-symbols-outlined">close_fullscreen</span>
            </button>
          </div>
        )}

        {/* Target Language (모바일에서만 표시) */}
        <div className="translator-target-lang-mobile">
          <label>Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="translator-lang-select"
          >
            {TARGET_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* 출력 - line-by-line with inline save */}
        <div className="translator-section translator-output-wrapper">
          <div
            ref={outputTextareaRef}
            className={`translator-textarea translator-textarea--output translator-output-lines ${conversationMode ? 'conversation-mode' : ''}`}
          >
            {outputText ? (() => {
              const outLines = outputText.split('\n')
              const inLines = inputText ? inputText.split('\n') : []
              return outLines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="translator-output-empty-line">&nbsp;</div>
                const srcLine = inLines[i] || ''
                return (
                  <div key={i} className="translator-output-line">
                    <span className="translator-output-line-text">{line}</span>
                    {isAuthenticated && srcLine.trim() && (
                      <button
                        className={`translator-line-save-btn ${savedSentences.has(i) ? 'saved' : ''}`}
                        onClick={() => handleSaveSentence(srcLine, line, i)}
                        disabled={savingSentenceIdx === i || savedSentences.has(i)}
                        title={savedSentences.has(i) ? 'Saved' : 'Save this sentence'}
                      >
                        <span className="material-symbols-outlined">
                          {savedSentences.has(i) ? 'bookmark' : 'bookmark_add'}
                        </span>
                      </button>
                    )}
                  </div>
                )
              })
            })() : (
              <span className="translator-output-placeholder">Translation result will appear here...</span>
            )}
          </div>
          <div
            className="translator-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault()
              const el = outputTextareaRef.current
              const startY = e.clientY
              const startH = el.offsetHeight
              const onMove = (ev) => { el.style.maxHeight = 'none'; el.style.height = Math.max(60, startH + ev.clientY - startY) + 'px' }
              const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
            onTouchStart={(e) => {
              const el = outputTextareaRef.current
              const startY = e.touches[0].clientY
              const startH = el.offsetHeight
              const onMove = (ev) => { ev.preventDefault(); el.style.maxHeight = 'none'; el.style.height = Math.max(60, startH + ev.touches[0].clientY - startY) + 'px' }
              const onUp = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp) }
              document.addEventListener('touchmove', onMove, { passive: false })
              document.addEventListener('touchend', onUp)
            }}
          >
            <div className="translator-resize-handle-bar" />
          </div>
          {outputText && isTTSSupported && (
            <button
              onClick={handleSpeakTarget}
              className={`translator-speak-btn translator-speak-btn--output ${isSpeaking && currentLang === getVoiceCode(targetLang) ? 'speaking' : ''}`}
              title={isSpeaking && currentLang === getVoiceCode(targetLang) ? 'Stop' : 'Listen'}
            >
              <span className="material-symbols-outlined">
                {isSpeaking && currentLang === getVoiceCode(targetLang) ? 'stop_circle' : 'volume_up'}
              </span>
            </button>
          )}
        </div>

        {/* Guest character counter - below output section */}
        {!isAuthenticated && (
          <div className="translator-char-counter" style={{
            textAlign: 'right',
            fontSize: '11px',
            color: guestCharCount >= MAX_CHARS_GUEST * 0.9 ? '#ef4444' : '#a0aec0',
            padding: '4px 4px 0',
            fontWeight: '500'
          }}>
            {guestCharCount} / {MAX_CHARS_GUEST}
          </div>
        )}

        {/* Translation Usage Indicator */}
        <div className="mt-4">
          <UsageIndicator usageType="translator" label="Translator" />
        </div>

        {/* 최근 번역 히스토리 */}
        {isAuthenticated && (
          <div className="translator-history">
            <div className="translator-history-header">
              <h3 className="translator-history-title">
                <span className="material-symbols-outlined">history</span>
                Recent Translations
              </h3>
              <button
                onClick={() => navigate('/translator/history')}
                className="translator-history-view-all"
              >
                View All
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="translator-history-loading">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : recentHistory.length === 0 ? (
              <p className="translator-history-empty">No translation history.</p>
            ) : (
              <div className="translator-history-list">
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="translator-history-item"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="translator-history-item-header">
                      <span className="translator-history-lang">
                        {getLangName(item.source_lang)} → {getLangName(item.target_lang)}
                      </span>
                      <div className="translator-history-actions">
                        <span className="translator-history-time">
                          {formatDate(item.created_at)}
                        </span>
                        <button
                          onClick={(e) => handleToggleFavorite(e, item)}
                          className={`translator-history-favorite ${item.is_favorite ? 'active' : ''}`}
                          title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          disabled={togglingFavoriteId === item.id}
                        >
                          <span className="material-symbols-outlined">
                            {item.is_favorite ? 'star' : 'star_outline'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, item)}
                          className="translator-history-delete"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    </div>
                    <div className="translator-history-text">
                      <span className="translator-history-source">{item.source_text}</span>
                      <span className="translator-history-arrow">→</span>
                      <span className="translator-history-target">{item.translated_text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="translator-modal-overlay" onClick={handleDeleteCancel}>
            <div className="translator-modal" onClick={(e) => e.stopPropagation()}>
              <h4>Delete Translation</h4>
              <p>Are you sure you want to delete this translation?</p>
              <p className="translator-modal-preview">"{deleteConfirm.text?.substring(0, 50)}{deleteConfirm.text?.length > 50 ? '...' : ''}"</p>
              <div className="translator-modal-actions">
                <button onClick={handleDeleteCancel} className="translator-modal-btn translator-modal-btn--cancel">
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm} 
                  className="translator-modal-btn translator-modal-btn--delete"
                  disabled={deletingId === deleteConfirm.id}
                >
                  {deletingId === deleteConfirm.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Modal for Guest Users */}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </PageBox>
    </PageLayout>
  )
}

export default TranslatorView
