import { useState, useRef, useEffect, useCallback } from 'react'
import { PageLayout, PageBox } from '../../components/layout/PageLayout'
import { LANGUAGES, getTranslateCode, getVoiceCode, detectLanguage, getLanguageByCode } from '../../config/languages'
import './text-to-speech.css'
import { useUsage } from '../../common/hooks/useUsage'
import { UsageIndicator } from '../../common/components/UsageIndicator'
import { useLanguagePreferences, useAuthStore } from '../../modules/auth'
import { createWorker } from 'tesseract.js'

const MAX_IMAGES_GUEST = 2
const MAX_IMAGES_LOGGED_IN = 10

function TextToSpeech() {
  const [text, setText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [targetLanguage, setTargetLanguage] = useState('en-US')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)
  const [currentTranslatedText, setCurrentTranslatedText] = useState('')
  const [textareaHeight, setTextareaHeight] = useState(250)
  const [isResizing, setIsResizing] = useState(false)
  const [highlightStart, setHighlightStart] = useState(0)
  const [highlightEnd, setHighlightEnd] = useState(0)
  const [isRepeatMode, setIsRepeatMode] = useState(false)
  const [voiceWarning, setVoiceWarning] = useState(null)
  const [pastedImages, setPastedImages] = useState([])
  const [ocrProgress, setOcrProgress] = useState({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [imageLimitWarning, setImageLimitWarning] = useState(false)
  const utteranceRef = useRef(null)
  const resizeStartY = useRef(0)
  const resizeStartHeight = useRef(0)
  const isRepeatModeRef = useRef(false)
  const fileInputRef = useRef(null)
  const nextImageId = useRef(0)

  const { trackUsage, isLimitExceeded } = useUsage()
  const { isAuthenticated } = useAuthStore()
  const maxImages = isAuthenticated ? MAX_IMAGES_LOGGED_IN : MAX_IMAGES_GUEST

  // Settings 언어 설정 적용
  const { nativeLanguage, targetLanguage: settingsTargetLang, isLoaded: preferencesLoaded } = useLanguagePreferences()

  useEffect(() => {
    if (!preferencesLoaded) return
    
    // Settings targetLanguage(학습 언어) → TTS Source (입력)
    // Settings nativeLanguage(모국어) → TTS Target (출력)
    const findTTSCode = (translateCode) => {
      const lang = LANGUAGES.find(l => l.translateCode === translateCode)
      return lang?.code || 'en-US'
    }
    
    setSelectedLanguage(findTTSCode(settingsTargetLang))
    setTargetLanguage(findTTSCode(nativeLanguage))
  }, [preferencesLoaded, nativeLanguage, settingsTargetLang])

  // 번역 함수
  const translateText = async (text, sourceLang, targetLang) => {
    if (!text.trim()) return text
    
    // translateCode로 비교 (en-US, en-GB 등은 모두 'en'으로 변환됨)
    const sourceCode = getTranslateCode(sourceLang)
    const targetCode = getTranslateCode(targetLang)
    
    if (sourceCode === targetCode) return text

    setIsTranslating(true)
    
    try {
      // Google Translate API 사용
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
      const response = await fetch(googleUrl)
      
      if (response.ok) {
        const data = await response.json()
        if (data?.[0] && Array.isArray(data[0])) {
          const translated = data[0]
            .filter(item => item && Array.isArray(item) && item[0] && typeof item[0] === 'string')
            .map(item => item[0])
            .join('')
            .trim()
          if (translated && translated.length > 0) {
            setIsTranslating(false)
            return translated
          }
        }
      }
      
      // Fallback: MyMemory API
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`
      const fallbackResponse = await fetch(myMemoryUrl)
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json()
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText.trim()
          setIsTranslating(false)
          return translated
        }
      }
      
      setIsTranslating(false)
      return text
    } catch (error) {
      console.error('Translation error:', error)
      setIsTranslating(false)
      return text
    }
  }

  // 텍스트 변경 핸들러
  const handleTextChange = (e) => {
    const newText = e.target.value
    setText(newText)
    
    // 텍스트가 있으면 언어 자동 감지
    if (newText.trim()) {
      const detectedLang = detectLanguage(newText)
      setSelectedLanguage(detectedLang)
      // target language도 source language와 같게 설정
      setTargetLanguage(detectedLang)
    }
  }

  // === 이미지 붙여넣기 / 드래그앤드롭 / 업로드 ===
  const addImages = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    setPastedImages(prev => {
      const remaining = maxImages - prev.length
      if (remaining <= 0) {
        if (!isAuthenticated) {
          setImageLimitWarning(true)
        }
        return prev
      }

      const toAdd = imageFiles.slice(0, remaining)
      if (toAdd.length < imageFiles.length && !isAuthenticated) {
        setImageLimitWarning(true)
      }

      const newImages = toAdd.map(file => {
        const id = nextImageId.current++
        return {
          id,
          file,
          url: URL.createObjectURL(file),
          status: 'ready',
          extractedText: '',
        }
      })
      return [...prev, ...newImages]
    })
  }, [maxImages, isAuthenticated])

  // 클립보드 붙여넣기 핸들러
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      addImages(imageFiles)
    }
  }, [addImages])

  // 드래그앤드롭 핸들러
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer?.files) {
      addImages(e.dataTransfer.files)
    }
  }, [addImages])

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e) => {
    if (e.target.files) {
      addImages(e.target.files)
    }
    e.target.value = '' // reset for re-upload of same file
  }, [addImages])

  // 이미지 제거
  const removeImage = useCallback((id) => {
    setPastedImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter(i => i.id !== id)
    })
    setOcrProgress(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // 모든 이미지 제거
  const removeAllImages = useCallback(() => {
    pastedImages.forEach(img => URL.revokeObjectURL(img.url))
    setPastedImages([])
    setOcrProgress({})
  }, [pastedImages])

  // 단일 이미지 OCR
  const ocrSingleImage = useCallback(async (imageItem) => {
    setPastedImages(prev =>
      prev.map(img => img.id === imageItem.id ? { ...img, status: 'processing' } : img)
    )
    setOcrProgress(prev => ({ ...prev, [imageItem.id]: 0 }))

    try {
      const worker = await createWorker('eng+kor', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(prev => ({ ...prev, [imageItem.id]: Math.round(m.progress * 100) }))
          }
        },
      })

      const { data: { text: extractedText } } = await worker.recognize(imageItem.file)
      await worker.terminate()

      const trimmed = extractedText.trim()
      setPastedImages(prev =>
        prev.map(img => img.id === imageItem.id ? { ...img, status: 'done', extractedText: trimmed } : img)
      )
      setOcrProgress(prev => ({ ...prev, [imageItem.id]: 100 }))

      // 추출된 텍스트를 textarea에 추가
      if (trimmed) {
        setText(prev => {
          const separator = prev.trim() ? '\n' : ''
          const newText = prev + separator + trimmed
          // 언어 감지
          const detectedLang = detectLanguage(newText)
          setSelectedLanguage(detectedLang)
          setTargetLanguage(detectedLang)
          return newText
        })
      }
    } catch (err) {
      console.error('OCR Error:', err)
      setPastedImages(prev =>
        prev.map(img => img.id === imageItem.id ? { ...img, status: 'error' } : img)
      )
    }
  }, [])

  // 모든 이미지 OCR 실행
  const ocrAllImages = useCallback(async () => {
    const readyImages = pastedImages.filter(img => img.status === 'ready')
    for (const img of readyImages) {
      await ocrSingleImage(img)
    }
  }, [pastedImages, ocrSingleImage])

  // 컴포넌트 언마운트 시 objectURL 정리
  useEffect(() => {
    return () => {
      pastedImages.forEach(img => URL.revokeObjectURL(img.url))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 속도 변경 핸들러
  const handleSpeedChange = (newRate) => {
    setSpeechRate(newRate)
    
    // 재생 중이면 현재 위치부터 새로운 속도로 재시작
    if (isSpeaking && window.speechSynthesis.speaking) {
      const remainingText = currentTranslatedText.substring(currentCharIndex)
      
      if (remainingText.trim()) {
        // 현재 재생 중단
        window.speechSynthesis.cancel()
        
        // 남은 텍스트를 새로운 속도로 재생
        speakText(remainingText, newRate, currentCharIndex)
      }
    }
  }

  // Target Language 변경 핸들러
  const handleTargetLanguageChange = async (newTargetLang) => {
    setTargetLanguage(newTargetLang)
    
    // 재생 중이면 현재 위치부터 새로운 언어로 재시작
    if (isSpeaking && window.speechSynthesis.speaking) {
      const remainingOriginalText = text.substring(currentCharIndex)
      
      if (remainingOriginalText.trim()) {
        // 현재 재생 중단
        window.speechSynthesis.cancel()
        
        // 남은 텍스트를 번역 (필요한 경우) - translateCode로 비교
        let textToSpeak = remainingOriginalText
        const sourceCode = getTranslateCode(selectedLanguage)
        const targetCode = getTranslateCode(newTargetLang)
        
        if (sourceCode !== targetCode) {
          textToSpeak = await translateText(remainingOriginalText, selectedLanguage, newTargetLang)
        }
        
        // 번역된 텍스트를 현재 속도와 새로운 언어로 재생
        speakText(textToSpeak, speechRate, 0, newTargetLang)
      }
    }
  }

  // 텍스트 읽기 함수
  const speakText = (textToSpeak, rate, startIndex = 0, langCode = targetLanguage) => {
    if (!textToSpeak.trim()) return

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    const voiceCode = getVoiceCode(langCode)
    utterance.lang = voiceCode
    
    // 브라우저에서 지원하는 음성 중 해당 언어에 맞는 음성 선택
    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find(voice => voice.lang === voiceCode)
    
    if (matchingVoice) {
      utterance.voice = matchingVoice
      console.log('[TTS] Using voice:', matchingVoice.name, 'for lang:', voiceCode)
      setVoiceWarning(null)
    } else {
      console.warn('[TTS] No matching voice found for:', voiceCode)
      
      // 언어 이름 가져오기
      const lang = getLanguageByCode(langCode)
      const langName = lang?.name || langCode
      
      // 경고 메시지 설정
      setVoiceWarning({
        language: langName,
        code: voiceCode
      })
    }
    
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // 단어 경계 이벤트로 현재 위치 추적 및 하이라이트
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const currentIndex = startIndex + event.charIndex
        setCurrentCharIndex(currentIndex)
        
        // 현재 단어의 끝 위치 계산 (다음 공백까지)
        const remainingText = textToSpeak.substring(event.charIndex)
        const wordMatch = remainingText.match(/^\S+/)
        const wordLength = wordMatch ? wordMatch[0].length : 0
        
        setHighlightStart(currentIndex)
        setHighlightEnd(currentIndex + wordLength)
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      utteranceRef.current = utterance
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setCurrentCharIndex(0)
      setHighlightStart(0)
      setHighlightEnd(0)
      utteranceRef.current = null
      
      // 반복 모드가 켜져 있으면 다시 재생 (ref 사용하여 최신 값 참조)
      if (isRepeatModeRef.current) {
        setTimeout(() => {
          handleSpeak()
        }, 500) // 0.5초 대기 후 재시작
      }
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setCurrentCharIndex(0)
      setHighlightStart(0)
      setHighlightEnd(0)
      utteranceRef.current = null
    }

    window.speechSynthesis.speak(utterance)
  }

  const handleSpeak = async () => {
    if (!text.trim()) return

    if ('speechSynthesis' in window) {
      // Pause 상태에서 Resume
      if (isPaused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
        setIsSpeaking(true)
        return
      }

      // 음성 목록 로드 대기 (브라우저에 따라 비동기로 로드됨)
      if (window.speechSynthesis.getVoices().length === 0) {
        await new Promise(resolve => {
          window.speechSynthesis.onvoiceschanged = resolve
        })
      }

      window.speechSynthesis.cancel()
      setCurrentCharIndex(0)
      
      // 번역이 필요한 경우 (translateCode로 비교)
      let textToSpeak = text
      const sourceCode = getTranslateCode(selectedLanguage)
      const targetCode = getTranslateCode(targetLanguage)
      
      if (sourceCode !== targetCode) {
        textToSpeak = await translateText(text, selectedLanguage, targetLanguage)
      }
      
      // 번역된 텍스트 저장
      setCurrentTranslatedText(textToSpeak)
      
      // Track usage for TTS
      const charCount = textToSpeak.length
      if (charCount > 0) {
        trackUsage(charCount, 'tts').catch(err => {
          console.error('Failed to track TTS usage:', err)
        })
      }
      
      speakText(textToSpeak, speechRate, 0, targetLanguage)
    } else {
      alert('This browser does not support speech synthesis.')
    }
  }

  const handlePause = () => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsSpeaking(false)
    }
  }

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
      setCurrentCharIndex(0)
      setHighlightStart(0)
      setHighlightEnd(0)
    }
  }

  // 하이라이트된 텍스트 렌더링
  const renderHighlightedText = () => {
    if (!isSpeaking || highlightStart === 0 || highlightEnd === 0) {
      return text
    }

    const before = text.substring(0, highlightStart)
    const highlight = text.substring(highlightStart, highlightEnd)
    const after = text.substring(highlightEnd)

    return (
      <>
        {before}
        <span className="highlight-text">{highlight}</span>
        {after}
      </>
    )
  }

  // Resize 핸들러
  const handleResizeStart = (e) => {
    e.preventDefault()
    resizeStartY.current = e.clientY
    resizeStartHeight.current = textareaHeight
    setIsResizing(true)
  }

  // isRepeatMode 변경 시 ref 업데이트
  useEffect(() => {
    isRepeatModeRef.current = isRepeatMode
  }, [isRepeatMode])

  // 음성 목록 미리 로드
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // 음성 목록 로드 트리거
      window.speechSynthesis.getVoices()
      
      // 음성 목록 변경 이벤트 리스너
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('[TTS] Available voices loaded:', voices.length)
        voices.forEach(voice => {
          console.log(`  - ${voice.name} (${voice.lang})`)
        })
      }
      
      window.speechSynthesis.onvoiceschanged = loadVoices
      loadVoices() // 즉시 한 번 실행
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleResizeMove = (e) => {
      const deltaY = e.clientY - resizeStartY.current
      const newHeight = Math.min(Math.max(resizeStartHeight.current + deltaY, 200), 800)
      setTextareaHeight(newHeight)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing])

  return (
    <PageLayout title="Text to Speech">
      <PageBox flex>
          <div className="tts-controls-wrapper">
            <div className="language-select-wrapper">
              <label htmlFor="tts-source-language" className="control-label">Source Language</label>
              <select
                id="tts-source-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="language-select"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="language-select-wrapper">
              <label htmlFor="tts-target-language" className="control-label">Target Language</label>
              <select
                id="tts-target-language"
                value={targetLanguage}
                onChange={(e) => handleTargetLanguageChange(e.target.value)}
                className="language-select"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="speed-control-wrapper">
              <div className="speed-header">
                <label htmlFor="speech-rate" className="control-label">
                  Speed: {speechRate.toFixed(1)}x
                </label>
                <label className="repeat-checkbox-label" title="Repeat">
                  <input
                    type="checkbox"
                    checked={isRepeatMode}
                    onChange={(e) => setIsRepeatMode(e.target.checked)}
                    className="repeat-checkbox"
                  />
                  <span className="repeat-label-text">🔁</span>
                </label>
              </div>
              <input
                id="speech-rate"
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={speechRate}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="speed-slider"
              />
              <div className="speed-marks">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>1.5x</span>
                <span>2.0x</span>
                <span>2.5x</span>
              </div>
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={handleSpeak}
              disabled={(isSpeaking && !isPaused) || !text.trim() || isTranslating}
              className="speak-btn"
            >
              {isTranslating ? '🔄 Translating...' : isPaused ? '▶ Resume' : isSpeaking ? '🔊 Playing...' : '▶ Play'}
            </button>
            <button
              onClick={handlePause}
              disabled={!isSpeaking || isPaused}
              className="pause-btn"
            >
              ⏸ Pause
            </button>
            <button
              onClick={handleStop}
              disabled={!isSpeaking && !isPaused}
              className="stop-btn"
            >
              ⏹ Stop
            </button>
          </div>

          {voiceWarning && (
            <div className="voice-warning">
              <div className="voice-warning-icon">⚠️</div>
              <div className="voice-warning-content">
                <div className="voice-warning-title">Voice Not Available</div>
                <div className="voice-warning-message">
                  The <strong>{voiceWarning.language}</strong> voice ({voiceWarning.code}) is not installed on your system.
                  The system will use a default voice instead.
                </div>
                <div className="voice-warning-instructions">
                  <strong>To install this voice:</strong>
                  <ul>
                    <li>
                      <strong>Windows:</strong>
                      <ol className="voice-warning-steps">
                        <li>Open Settings → Time & Language → <strong>Language & region</strong></li>
                        <li>Click <strong>"Add a language"</strong></li>
                        <li>Search and select your language (e.g., "English (India)")</li>
                        <li>Check <strong>"Text-to-speech"</strong> option</li>
                        <li>Click <strong>"Install"</strong> and wait for download to complete</li>
                        <li>Restart your browser</li>
                      </ol>
                    </li>
                    <li><strong>macOS:</strong> System Preferences → Accessibility → Spoken Content → System voice → Customize</li>
                    <li><strong>Linux:</strong> Install speech-dispatcher and language packs</li>
                  </ul>
                  {navigator.platform.toLowerCase().includes('win') && (
                    <button 
                      className="voice-warning-settings-btn"
                      onClick={() => window.open('ms-settings:regionlanguage', '_blank')}
                    >
                      🔧 Open Windows Language Settings
                    </button>
                  )}
                </div>
                <button 
                  className="voice-warning-close"
                  onClick={() => setVoiceWarning(null)}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div
            className={`input-section${isDragOver ? ' drag-over' : ''}`}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 이미지 썸네일 영역 */}
            {pastedImages.length > 0 && (
              <div className="pasted-images-area">
                <div className="pasted-images-header">
                  <span className="pasted-images-title">
                    📷 Images ({pastedImages.length})
                  </span>
                  <div className="pasted-images-actions">
                    {pastedImages.some(img => img.status === 'ready') && (
                      <button
                        className="ocr-extract-all-btn"
                        onClick={ocrAllImages}
                        title="Extract text from all images"
                      >
                        🔍 Extract All Text
                      </button>
                    )}
                    <button
                      className="images-clear-btn"
                      onClick={removeAllImages}
                      title="Remove all images"
                    >
                      ✕ Clear All
                    </button>
                  </div>
                </div>
                <div className="pasted-images-grid">
                  {pastedImages.map(img => (
                    <div key={img.id} className={`pasted-image-card ${img.status}`}>
                      <div className="pasted-image-thumb-wrapper">
                        <img src={img.url} alt="Pasted" className="pasted-image-thumb" />
                        {img.status === 'processing' && (
                          <div className="ocr-overlay">
                            <div className="ocr-spinner"></div>
                            <span className="ocr-progress-text">
                              {ocrProgress[img.id] ?? 0}%
                            </span>
                          </div>
                        )}
                        {img.status === 'done' && (
                          <div className="ocr-done-badge">✓</div>
                        )}
                        {img.status === 'error' && (
                          <div className="ocr-error-badge">✗</div>
                        )}
                      </div>
                      <div className="pasted-image-actions">
                        {img.status === 'ready' && (
                          <button
                            className="ocr-btn"
                            onClick={() => ocrSingleImage(img)}
                            title="Extract text (OCR)"
                          >
                            🔍
                          </button>
                        )}
                        <button
                          className="remove-image-btn"
                          onClick={() => removeImage(img.id)}
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* 이미지 추가 버튼 (제한에 안 걸릴 때만 표시) */}
                  {pastedImages.length < maxImages && (
                    <button
                      className="add-image-card"
                      onClick={() => fileInputRef.current?.click()}
                      title="Add images"
                    >
                      <span className="add-image-icon">+</span>
                      <span className="add-image-label">Add</span>
                    </button>
                  )}
                </div>
                {/* 비로그인 이미지 제한 안내 */}
                {imageLimitWarning && !isAuthenticated && (
                  <div className="image-limit-warning">
                    <span className="image-limit-warning-icon">🔒</span>
                    <span className="image-limit-warning-text">
                      You can attach up to {MAX_IMAGES_GUEST} images as a guest. Please sign in to attach up to {MAX_IMAGES_LOGGED_IN} images.
                    </span>
                    <button
                      className="image-limit-warning-close"
                      onClick={() => setImageLimitWarning(false)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="text-display-wrapper" style={{ height: `${textareaHeight}px` }}>
              {isSpeaking ? (
                <div className="text-display">
                  {renderHighlightedText()}
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder={pastedImages.length > 0
                    ? 'Images attached. Click 🔍 to extract text, or type here...'
                    : 'Enter text to convert to speech... (Paste images with Ctrl+V)'
                  }
                  className="input-textarea"
                  style={{ height: `${textareaHeight}px` }}
                />
              )}
            </div>
            <div className="resize-handle-row">
              <div 
                className="resize-handle"
                onMouseDown={handleResizeStart}
              >
                <div className="resize-handle-bar"></div>
              </div>
              {pastedImages.length === 0 && (
                <button
                  className="attach-image-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach images"
                >
                  📷 Attach Images
                </button>
              )}
            </div>
            {/* 드래그 오버레이 */}
            {isDragOver && (
              <div className="drag-overlay">
                <div className="drag-overlay-content">
                  <span className="drag-overlay-icon">📷</span>
                  <span className="drag-overlay-text">Drop images here</span>
                </div>
              </div>
            )}
            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </PageBox>
        
        {/* TTS Usage Indicator */}
        <div className="mt-4">
          <UsageIndicator usageType="tts" label="Text to Speech" />
        </div>
    </PageLayout>
  )
}

export default TextToSpeech

