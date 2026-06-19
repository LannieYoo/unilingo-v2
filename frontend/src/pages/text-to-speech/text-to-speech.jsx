import { useState, useRef, useEffect, useCallback } from 'react'
import { PageLayout, PageBox } from '../../components/layout/PageLayout'
import { LANGUAGES, getTranslateCode, getVoiceCode, detectLanguage, getLanguageByCode } from '../../config/languages'
import './text-to-speech.css'
import { useUsage } from '../../common/hooks/useUsage'
import { UsageIndicator } from '../../common/components/UsageIndicator'
import { useLanguagePreferences, useAuthStore } from '../../modules/auth'
import { createWorker } from 'tesseract.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// TTS 전용 언어 목록 — 영어 통합
const TTS_LANGUAGES = [
  { code: 'en', name: 'English', voice: 'en-US', translateCode: 'en' },
  { code: 'ko', name: 'Korean', voice: 'ko-KR', translateCode: 'ko' },
  { code: 'zh', name: 'Chinese', voice: 'zh-CN', translateCode: 'zh' },
]

const TRANSLATION_MODELS = [
  { id: 'madlad', name: 'MADLAD-400', emoji: '🤖', desc: 'Self-hosted AI' },
  { id: 'deepl', name: 'DeepL', emoji: '💎', desc: 'Premium API' },
  { id: 'google_direct', name: 'Google', emoji: '🌐', desc: 'Free API' },
]

const MAX_IMAGES_GUEST = 2
const MAX_IMAGES_LOGGED_IN = 10

function TextToSpeech() {
  const [text, setText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [isTranslating, setIsTranslating] = useState(false)
  const [highlightStart, setHighlightStart] = useState(-1)
  const [highlightEnd, setHighlightEnd] = useState(-1)
  const [isRepeatMode, setIsRepeatMode] = useState(false)
  const [voiceWarning, setVoiceWarning] = useState(null)
  const [pastedImages, setPastedImages] = useState([])
  const [ocrProgress, setOcrProgress] = useState({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [imageLimitWarning, setImageLimitWarning] = useState(false)
  const [translationModel, setTranslationModel] = useState('google_direct')
  const [usedProvider, setUsedProvider] = useState(null)
  const utteranceRef = useRef(null)
  const isRepeatModeRef = useRef(false)
  const fileInputRef = useRef(null)
  const abortRef = useRef(false)
  const speechRateRef = useRef(1.0)
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
      const lang = TTS_LANGUAGES.find(l => l.translateCode === translateCode)
      return lang?.code || 'en'
    }
    
    setSelectedLanguage(findTTSCode(settingsTargetLang))
    setTargetLanguage(findTTSCode(nativeLanguage))
  }, [preferencesLoaded, nativeLanguage, settingsTargetLang])

  // 번역 함수 — 백엔드 API 경유, 선택된 모델 사용
  const translateText = async (text, sourceLang, targetLang) => {
    if (!text.trim()) return text
    
    const sourceCode = TTS_LANGUAGES.find(l => l.code === sourceLang)?.translateCode || sourceLang
    const targetCode = TTS_LANGUAGES.find(l => l.code === targetLang)?.translateCode || targetLang
    
    if (sourceCode === targetCode) return text

    setIsTranslating(true)
    
    try {
      const response = await fetch(`${API_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source_lang: sourceCode,
          target_lang: targetCode,
          provider: translationModel,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.translated_text && data.translated_text.trim()) {
          setUsedProvider(data.provider || translationModel)
          setIsTranslating(false)
          return data.translated_text.trim()
        }
      }
      
      // Fallback: direct Google Translate
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
      const gResponse = await fetch(googleUrl)
      if (gResponse.ok) {
        const data = await gResponse.json()
        if (data?.[0] && Array.isArray(data[0])) {
          const translated = data[0]
            .filter(item => item && Array.isArray(item) && item[0] && typeof item[0] === 'string')
            .map(item => item[0])
            .join('')
            .trim()
          if (translated && translated.length > 0) {
            setUsedProvider('google_direct')
            setIsTranslating(false)
            return translated
          }
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
      let detectedLang = detectLanguage(newText)
      // TTS_LANGUAGES 코드로 변환 (en-US -> en)
      if (detectedLang === 'en-US') detectedLang = 'en'
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
          let detectedLang = detectLanguage(newText)
          if (detectedLang === 'en-US') detectedLang = 'en'
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

  // 문장 분리 함수
  const splitSentences = (txt) => {
    // 문장 단위로 분리 (., !, ? 뒤 공백 또는 줄바꾼)
    const results = []
    const regex = /[^.!?\n]+[.!?]*[\s]*/g
    let match
    while ((match = regex.exec(txt)) !== null) {
      const s = match[0]
      if (s.trim()) {
        results.push({
          text: s.trim(),
          start: match.index,
          end: match.index + s.trimEnd().length,
        })
      }
    }
    // 문장이 하나도 없으면 전체 텍스트를 하나의 문장으로
    if (results.length === 0 && txt.trim()) {
      results.push({ text: txt.trim(), start: 0, end: txt.trim().length })
    }
    return results
  }

  // 한 문장 TTS 재생 (Promise)
  const speakSentence = (translatedText, rate, langCode) => {
    return new Promise((resolve, reject) => {
      if (!translatedText.trim()) { resolve(); return }

      const utterance = new SpeechSynthesisUtterance(translatedText)
      const voiceCode = TTS_LANGUAGES.find(l => l.code === langCode)?.voice || getVoiceCode(langCode)
      utterance.lang = voiceCode

      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find(v => v.lang === voiceCode)
      if (matchingVoice) {
        utterance.voice = matchingVoice
        setVoiceWarning(null)
      } else {
        const lang = TTS_LANGUAGES.find(l => l.code === langCode) || getLanguageByCode(langCode)
        setVoiceWarning({ language: lang?.name || langCode, code: voiceCode })
      }

      utterance.rate = rate
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => {
        utteranceRef.current = utterance
      }
      utterance.onend = () => {
        utteranceRef.current = null
        resolve()
      }
      utterance.onerror = (e) => {
        utteranceRef.current = null
        if (e.error === 'canceled' || e.error === 'interrupted') {
          reject(new Error('canceled'))
        } else {
          resolve()
        }
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  // 문장별 번역 + TTS 실행 — 선행 번역(prefetch) 파이프라인
  const speakSentenceBysentence = async (sentences, langCode) => {
    const sourceCode = TTS_LANGUAGES.find(l => l.code === selectedLanguage)?.translateCode || selectedLanguage
    const targetCode = TTS_LANGUAGES.find(l => l.code === langCode)?.translateCode || langCode
    const needsTranslation = sourceCode !== targetCode

    // ── 1. 번역 prefetch: 모든 문장의 번역을 즉시 순차 시작 ──
    //    각 문장에 대해 Promise를 미리 생성하고, 체이닝으로 순차 실행
    //    TTS가 현재 문장을 읽는 동안 다음 문장들이 백그라운드에서 번역됨
    const translationPromises = []

    if (needsTranslation) {
      let chain = Promise.resolve()
      for (let i = 0; i < sentences.length; i++) {
        const idx = i
        const promise = (chain = chain.then(async () => {
          if (abortRef.current) return sentences[idx].text
          setIsTranslating(true)
          const result = await translateText(sentences[idx].text, selectedLanguage, langCode)
          return result
        }))
        translationPromises.push(promise)
      }
    }

    // ── 2. 재생 루프: 번역이 준비된 문장부터 즉시 읽기 ──
    for (let i = 0; i < sentences.length; i++) {
      if (abortRef.current) break

      const sentence = sentences[i]
      // 현재 문장 형광펜
      setHighlightStart(sentence.start)
      setHighlightEnd(sentence.end)

      // 번역 결과 가져오기 (이미 완료되었으면 즉시 반환)
      let textToSpeak = sentence.text
      if (needsTranslation) {
        textToSpeak = await translationPromises[i]
        setIsTranslating(false)
        if (abortRef.current) break
      }

      // TTS 사용량 추적
      if (textToSpeak.length > 0) {
        trackUsage(textToSpeak.length, 'tts').catch(() => {})
      }

      try {
        await speakSentence(textToSpeak, speechRateRef.current, langCode)
      } catch {
        break // canceled
      }
    }

    // 완료
    setIsTranslating(false)
    if (!abortRef.current) {
      setHighlightStart(-1)
      setHighlightEnd(-1)
      setIsSpeaking(false)

      if (isRepeatModeRef.current) {
        setTimeout(() => handleSpeak(), 500)
      }
    }
  }

  const handleSpeak = async () => {
    if (!text.trim()) return

    if ('speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
        setIsSpeaking(true)
        return
      }

      if (window.speechSynthesis.getVoices().length === 0) {
        await new Promise(resolve => {
          window.speechSynthesis.onvoiceschanged = resolve
        })
      }

      window.speechSynthesis.cancel()
      abortRef.current = false
      setIsSpeaking(true)

      const sentences = splitSentences(text)
      await speakSentenceBysentence(sentences, targetLanguage)
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
      abortRef.current = true
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
      setHighlightStart(-1)
      setHighlightEnd(-1)
      setIsTranslating(false)
    }
  }

  // 속도 변경 — ref에 즉시 반영, 다음 문장부터 적용됨
  const handleSpeedChange = (newRate) => {
    setSpeechRate(newRate)
    // speechRateRef는 useEffect에서 자동 동기화
  }

  // Target Language 변경 — 재생 중이면 중단 후 재시작
  const handleTargetLanguageChange = (newTargetLang) => {
    setTargetLanguage(newTargetLang)
    if (isSpeaking) {
      handleStop()
    }
  }

  // 하이라이트된 텍스트 렌더링 (문장 단위)
  const renderHighlightedText = () => {
    if (highlightStart < 0 || highlightEnd < 0) {
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

  // speedRate ref 동기화
  useEffect(() => {
    speechRateRef.current = speechRate
  }, [speechRate])


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
                {TTS_LANGUAGES.map(lang => (
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
                {TTS_LANGUAGES.map(lang => (
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

          <div className="tts-action-row">
            <button
              className="attach-image-btn-top"
              onClick={() => fileInputRef.current?.click()}
              title="Attach images for OCR"
            >
              📷 Attach Images
            </button>
            <div className="model-pills model-pills--action">
              {TRANSLATION_MODELS.map(model => (
                <button
                  key={model.id}
                  className={`model-pill${translationModel === model.id ? ' active' : ''}${model.id === 'madlad' ? ' model-pill--madlad' : model.id === 'deepl' ? ' model-pill--deepl' : ' model-pill--google'}`}
                  onClick={() => setTranslationModel(model.id)}
                  title={model.desc}
                >
                  <span className="model-pill-emoji">{model.emoji}</span>
                  <span className="model-pill-name">{model.name}</span>
                </button>
              ))}
              {usedProvider && (
                <span className={`tts-provider-badge tts-provider-badge--${usedProvider === 'madlad' ? 'madlad' : usedProvider === 'deepl' ? 'deepl' : 'google'}`}>
                  {usedProvider === 'madlad' ? '✓ Lannie Server' : usedProvider === 'deepl' ? '✓ DeepL' : '✓ Google'}
                </span>
              )}
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
            style={{ flex: 1, minHeight: 0 }}
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

            <div className="text-display-wrapper" style={{ flex: 1, minHeight: 0 }}>
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
                />
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

