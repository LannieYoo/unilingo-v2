import { useState, useRef, useEffect, useCallback } from 'react'
import { PageLayout, PageBox } from '../../components/layout/PageLayout'
import { LANGUAGES, getTranslateCode, getVoiceCode, detectLanguage, getLanguageByCode } from '../../config/languages'
import { tokenizeWithDifficulty } from './commonWords'
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
  { id: 'deepl', name: 'DeepL', emoji: '💎', desc: 'Premium API' },
  { id: 'google_direct', name: 'Google', emoji: '🌐', desc: 'Free API' },
]

const MAX_IMAGES_GUEST = 2
const MAX_IMAGES_LOGGED_IN = 10

function TextToSpeech() {
  const [text, setText] = useState(() => sessionStorage.getItem('tts_text') || '')
  const [selectedLanguage, setSelectedLanguage] = useState(() => sessionStorage.getItem('tts_source_lang') || 'en')
  const [targetLanguage, setTargetLanguage] = useState(() => sessionStorage.getItem('tts_target_lang') || 'en')
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
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1)
  const [translatedTooltip, setTranslatedTooltip] = useState('')
  const [translationViewMode, setTranslationViewMode] = useState('highlight')
  const [sentenceTranslations, setSentenceTranslations] = useState({})
  const utteranceRef = useRef(null)
  const isRepeatModeRef = useRef(false)
  const fileInputRef = useRef(null)
  const abortRef = useRef(false)
  const speechRateRef = useRef(1.0)
  const translationModelRef = useRef('google_direct')
  const sentencesRef = useRef([])
  const sentenceIdxRef = useRef(-1)
  const skipToIdxRef = useRef(-1)
  const nextImageId = useRef(0)
  const [wordPopup, setWordPopup] = useState(null) // { word, x, y, translation, usPhonetic, ukPhonetic, usAudio, ukAudio, loading }
  const [isEditing, setIsEditing] = useState(true) // true = textarea, false = read-only display
  const [compactLines, setCompactLines] = useState(false)
  const originalTextRef = useRef(null) // stores text before compact-lines transformation
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [cleanFeedback, setCleanFeedback] = useState(false)
  const [summaryModal, setSummaryModal] = useState({ open: false, loading: false, content: '', error: '' })
  const [summaryCopied, setSummaryCopied] = useState(false)

  // Display settings — font size, line height, translation font size
  const DEFAULT_FONT_SIZE = 16
  const DEFAULT_LINE_HEIGHT = 1.6
  const DEFAULT_TRANSLATION_FONT_SIZE = 13
  const [fontSize, setFontSize] = useState(() => {
    const saved = sessionStorage.getItem('tts_font_size')
    return saved ? parseFloat(saved) : DEFAULT_FONT_SIZE
  })
  const [lineHeight, setLineHeight] = useState(() => {
    const saved = sessionStorage.getItem('tts_line_height')
    return saved ? parseFloat(saved) : DEFAULT_LINE_HEIGHT
  })
  const [translationFontSize, setTranslationFontSize] = useState(() => {
    const saved = sessionStorage.getItem('tts_trans_font_size')
    return saved ? parseFloat(saved) : DEFAULT_TRANSLATION_FONT_SIZE
  })

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
          provider: translationModelRef.current,
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
    sessionStorage.setItem('tts_text', newText)
    
    // 텍스트가 있으면 언어 자동 감지
    if (newText.trim()) {
      let detectedLang = detectLanguage(newText)
      if (detectedLang === 'en-US') detectedLang = 'en'
      setSelectedLanguage(detectedLang)
      sessionStorage.setItem('tts_source_lang', detectedLang)
      setTargetLanguage(detectedLang)
      sessionStorage.setItem('tts_target_lang', detectedLang)
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
    const results = []
    // Known abbreviations that should NOT trigger sentence splits
    const abbreviations = new Set([
      'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
      'gen', 'gov', 'sgt', 'cpl', 'pvt', 'capt', 'lt', 'col', 'maj',
      'dept', 'univ', 'assn', 'bros', 'inc', 'ltd', 'co', 'corp',
      'vs', 'etc', 'approx', 'appt', 'apt', 'est', 'min', 'max',
      'misc', 'tech', 'temp', 'vol', 'no',
      'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
      'fig', 'eq', 'ref', 'sec', 'ch', 'pt',
    ])

    let i = 0
    let sentenceStart = 0

    while (i < txt.length) {
      const ch = txt[i]

      if (ch === '\n') {
        // Newline always splits
        const segment = txt.substring(sentenceStart, i).trim()
        if (segment) {
          results.push({ text: segment, start: sentenceStart, end: sentenceStart + segment.length })
        }
        sentenceStart = i + 1
        i++
        continue
      }

      if (ch === '.' || ch === '!' || ch === '?') {
        // Check if this period is part of an abbreviation

        // 1) Single-letter abbreviation pattern: "U.S." or "U.S.A."
        if (ch === '.') {
          // Look ahead: is next char a single uppercase letter followed by a period? (e.g., "U.S.")
          if (i + 2 < txt.length && /[A-Z]/.test(txt[i + 1]) && txt[i + 2] === '.') {
            i++
            continue
          }
          // Look behind: is prev char a single uppercase letter preceded by space/start? (e.g., the final "." in "U.S.")
          if (i > 0 && /[A-Z]/.test(txt[i - 1])) {
            const behindTwo = i >= 2 ? txt[i - 2] : ' '
            if (behindTwo === '.' || behindTwo === ' ' || i - 1 === sentenceStart) {
              // Check what follows: if it's a space + lowercase or another letter+period, don't split
              const afterDot = txt.substring(i + 1).match(/^(\s*)(\S)/)
              if (afterDot && /[A-Z]/.test(afterDot[2]) && txt[i + afterDot[0].length] === '.') {
                i++
                continue
              }
              // If followed by space + uppercase, it IS likely a sentence boundary (e.g., "U.S. President")
              // But "U.S." at end of abbreviation before a name is tricky. 
              // Heuristic: if the single letter before "." has another "." before it (like "U.S."), don't split
              if (behindTwo === '.') {
                // Part of multi-letter abbreviation like "U.S." — check next char
                const rest = txt.substring(i + 1).trimStart()
                if (rest.length > 0) {
                  i++
                  continue
                }
              }
            }
          }

          // 2) Known abbreviation: word before "." is in abbreviations set
          let wordStart = i - 1
          while (wordStart >= sentenceStart && /[a-zA-Z]/.test(txt[wordStart])) {
            wordStart--
          }
          wordStart++
          const wordBefore = txt.substring(wordStart, i).toLowerCase()
          if (abbreviations.has(wordBefore)) {
            i++
            continue
          }

          // 3) Decimal number: "3.14"
          if (i > 0 && /[0-9]/.test(txt[i - 1]) && i + 1 < txt.length && /[0-9]/.test(txt[i + 1])) {
            i++
            continue
          }
        }

        // Consume trailing punctuation (e.g., "..." or "?!")
        while (i + 1 < txt.length && (txt[i + 1] === '.' || txt[i + 1] === '!' || txt[i + 1] === '?')) {
          i++
        }

        const endIdx = i + 1
        const segment = txt.substring(sentenceStart, endIdx).trim()
        if (segment) {
          results.push({ text: segment, start: sentenceStart, end: sentenceStart + segment.length })
        }
        // Skip trailing whitespace
        i++
        while (i < txt.length && txt[i] === ' ') i++
        sentenceStart = i
        continue
      }

      i++
    }

    // Remaining text
    const remaining = txt.substring(sentenceStart).trim()
    if (remaining) {
      results.push({ text: remaining, start: sentenceStart, end: sentenceStart + remaining.length })
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

  // 문장별 번역 + TTS 실행 — 1-ahead prefetch (모델 변경 즉시 반영)
  const speakSentenceBysentence = async (sentences, langCode) => {
    const sourceCode = TTS_LANGUAGES.find(l => l.code === selectedLanguage)?.translateCode || selectedLanguage
    const targetCode = TTS_LANGUAGES.find(l => l.code === langCode)?.translateCode || langCode
    const needsTranslation = sourceCode !== targetCode

    // 번역 캐시: index → translated text (1문장 앞서 번역)
    const translationCache = new Map()
    let prefetchIdx = 0

    // 다음 미번역 문장 1개를 백그라운드 번역
    const prefetchNext = () => {
      if (!needsTranslation || prefetchIdx >= sentences.length || abortRef.current) return null
      const idx = prefetchIdx++
      const promise = translateText(sentences[idx].text, selectedLanguage, langCode)
        .then(result => { translationCache.set(idx, result); return result })
      translationCache.set(idx, promise)
      return promise
    }

    // 첫 문장 + 두 번째 문장 미리 번역 시작
    if (needsTranslation) {
      prefetchNext()
      prefetchNext()
    }

    // 재생 루프
    let i = 0
    while (i < sentences.length) {
      if (abortRef.current) break

      // skip 요청 처리 (prev/next)
      if (skipToIdxRef.current >= 0) {
        const skipTo = skipToIdxRef.current
        skipToIdxRef.current = -1
        i = Math.max(0, Math.min(skipTo, sentences.length - 1))
        window.speechSynthesis.cancel()
      }

      const sentence = sentences[i]
      setHighlightStart(sentence.start)
      setHighlightEnd(sentence.end)
      setCurrentSentenceIdx(i)
      sentenceIdxRef.current = i

      let textToSpeak = sentence.text
      if (needsTranslation) {
        setIsTranslating(true)
        const cached = translationCache.get(i)
        textToSpeak = cached instanceof Promise ? await cached : (cached || sentence.text)
        setIsTranslating(false)
        setTranslatedTooltip(textToSpeak)
        // 번역 결과 저장 (All 모드용)
        setSentenceTranslations(prev => ({ ...prev, [i]: textToSpeak }))
        if (abortRef.current) break

        prefetchNext()
      } else {
        setTranslatedTooltip('')
      }

      if (textToSpeak.length > 0) {
        trackUsage(textToSpeak.length, 'tts').catch(() => {})
      }

      try {
        await speakSentence(textToSpeak, speechRateRef.current, langCode)
      } catch {
        // canceled — check if it was a skip or a real stop
        if (skipToIdxRef.current >= 0) continue
        break
      }
      i++
    }

    // 완료
    setIsTranslating(false)
    setTranslatedTooltip('')
    if (!abortRef.current) {
      setHighlightStart(-1)
      setHighlightEnd(-1)
      setIsSpeaking(false)
      setCurrentSentenceIdx(-1)
      sentenceIdxRef.current = -1
      // sentenceTranslations는 유지 (재생 완료 후에도 All 모드에서 볼 수 있도록)

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
      skipToIdxRef.current = -1
      setIsSpeaking(true)
      setSentenceTranslations({})

      const sentences = splitSentences(text)
      sentencesRef.current = sentences
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
      skipToIdxRef.current = -1
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
      setHighlightStart(-1)
      setHighlightEnd(-1)
      setIsTranslating(false)
      setCurrentSentenceIdx(-1)
      setTranslatedTooltip('')
      setSentenceTranslations({})
      sentenceIdxRef.current = -1
    }
  }

  // 이전/다음 문장 이동
  const handlePrevSentence = () => {
    if (!isSpeaking || sentenceIdxRef.current <= 0) return
    skipToIdxRef.current = sentenceIdxRef.current - 1
    window.speechSynthesis.cancel()
  }

  const handleNextSentence = () => {
    if (!isSpeaking || sentenceIdxRef.current >= sentencesRef.current.length - 1) return
    skipToIdxRef.current = sentenceIdxRef.current + 1
    window.speechSynthesis.cancel()
  }

  // 속도 변경 — ref에 즉시 반영, 다음 문장부터 적용됨
  const handleSpeedChange = (newRate) => {
    setSpeechRate(newRate)
    // speechRateRef는 useEffect에서 자동 동기화
  }

  // Target Language 변경 — 재생/일시정지 중이면 중단
  const handleTargetLanguageChange = (newTargetLang) => {
    setTargetLanguage(newTargetLang)
    sessionStorage.setItem('tts_target_lang', newTargetLang)
    if (isSpeaking || isPaused) {
      handleStop()
    }
  }

  // 단어 발음 재생 (오디오 URL 또는 SpeechSynthesis 폴백)
  const speakWord = (word, audioUrl) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play().catch(() => {
        // 오디오 재생 실패 시 SpeechSynthesis 폴백
        const utterance = new SpeechSynthesisUtterance(word)
        utterance.lang = 'en-US'
        utterance.rate = 0.9
        window.speechSynthesis.speak(utterance)
      })
    } else {
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  // 단어 클릭 — 번역 + 발음 팝업
  const handleWordClick = async (word, event) => {
    event.stopPropagation()
    const rect = event.target.getBoundingClientRect()
    const container = event.target.closest('.text-display, .text-display-wrapper')
    const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 }

    setWordPopup({
      word,
      x: rect.left - containerRect.left,
      y: rect.bottom - containerRect.top + 4,
      translation: null,
      usPhonetic: null,
      ukPhonetic: null,
      usAudio: null,
      ukAudio: null,
      loading: true,
    })

    // Fetch translation + pronunciation in parallel
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    const [transResult, dictResult] = await Promise.allSettled([
      translateText(cleanWord, selectedLanguage, targetLanguage),
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ])

    const translation = transResult.status === 'fulfilled' ? transResult.value : cleanWord
    let usPhonetic = null, ukPhonetic = null, usAudio = null, ukAudio = null
    if (dictResult.status === 'fulfilled' && dictResult.value?.[0]?.phonetics) {
      for (const p of dictResult.value[0].phonetics) {
        const audioUrl = p.audio || ''
        const audioLower = audioUrl.toLowerCase()
        if (audioLower.includes('-us') || audioLower.includes('us.mp3')) {
          if (!usPhonetic && p.text) usPhonetic = p.text
          if (!usAudio && audioUrl) usAudio = audioUrl
        } else if (audioLower.includes('-uk') || audioLower.includes('uk.mp3')) {
          if (!ukPhonetic && p.text) ukPhonetic = p.text
          if (!ukAudio && audioUrl) ukAudio = audioUrl
        } else {
          if (!usPhonetic && p.text) usPhonetic = p.text
          if (!usAudio && audioUrl) usAudio = audioUrl
        }
      }
      if (!ukPhonetic && dictResult.value[0].phonetic) {
        ukPhonetic = dictResult.value[0].phonetic
      }
    }

    setWordPopup(prev => prev?.word === word ? {
      ...prev, translation, usPhonetic, ukPhonetic, usAudio, ukAudio, loading: false
    } : prev)
  }

  // Display settings 핸들러
  const handleFontSizeChange = (delta) => {
    setFontSize(prev => {
      const next = Math.min(28, Math.max(12, prev + delta))
      sessionStorage.setItem('tts_font_size', next)
      return next
    })
  }

  const handleLineHeightChange = (delta) => {
    setLineHeight(prev => {
      const next = Math.min(3.0, Math.max(1.0, parseFloat((prev + delta).toFixed(1))))
      sessionStorage.setItem('tts_line_height', next)
      return next
    })
  }

  const handleTranslationFontSizeChange = (delta) => {
    setTranslationFontSize(prev => {
      const next = Math.min(22, Math.max(10, prev + delta))
      sessionStorage.setItem('tts_trans_font_size', next)
      return next
    })
  }

  const handleResetDisplaySettings = () => {
    setFontSize(DEFAULT_FONT_SIZE)
    setLineHeight(DEFAULT_LINE_HEIGHT)
    setTranslationFontSize(DEFAULT_TRANSLATION_FONT_SIZE)
    sessionStorage.removeItem('tts_font_size')
    sessionStorage.removeItem('tts_line_height')
    sessionStorage.removeItem('tts_trans_font_size')
  }

  const handleClearContent = () => {
    if (!text.trim()) return
    if (window.confirm('Are you sure you want to clear all content?')) {
      handleStop()
      setText('')
      setIsEditing(true)
      setSentenceTranslations({})
      sentencesRef.current = []
      sessionStorage.removeItem('tts_text')
      setCompactLines(false)
      originalTextRef.current = null
    }
  }

  const handleToggleCompactLines = () => {
    if (!compactLines) {
      // Collapse: store original, then compact
      originalTextRef.current = text
      const compacted = text.replace(/(\r?\n){2,}/g, '\n')
      setText(compacted)
      sessionStorage.setItem('tts_text', compacted)
      setCompactLines(true)
    } else {
      // Restore original
      if (originalTextRef.current !== null) {
        setText(originalTextRef.current)
        sessionStorage.setItem('tts_text', originalTextRef.current)
      }
      originalTextRef.current = null
      setCompactLines(false)
    }
  }

  const handleCopyText = async () => {
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 1500)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  // Clean article text — remove noise from web copy-paste
  const cleanArticleText = (txt) => {
    const lines = txt.split('\n')
    const cleaned = []

    // Patterns to remove entire lines
    const removeLinePatterns = [
      // Media embed markers
      /^\s*(WATCH|LISTEN|READ MORE|READ|VIDEO|RELATED|SEE ALSO|MORE|GALLERY|SLIDESHOW)\s*[|:│]/i,
      // Photo/image credits
      /^\s*\(?\s*(Photo|Image|Picture|Illustration|Video|Graphic|Screenshot)\s*(by|via|courtesy|credit|source|from)/i,
      // Credit lines
      /\((?:Photo|Image|Pic)(?:\s+by)?\s+.*?(?:Getty|AP|Reuters|AFP|Bloomberg|Shutterstock|Alamy|iStock|Unsplash|Pexels|via|Images?|Press|Photo).*?\)/i,
      // Standalone credit patterns
      /^\s*\(.*(?:Getty Images|AP Photo|Reuters|AFP|Bloomberg|Shutterstock|Associated Press).*\)\s*$/i,
      // Multiple credits on one line like (AFP via Getty Images) / (AFP via Getty Images)
      /^\s*\(.*?\)\s*\/\s*\(.*?\)\s*$/,
      // Share/social buttons text
      /^\s*(Share|Tweet|Pin|Email|Print|Save|Bookmark|Like|Follow|Subscribe|Sign up|Sign in|Log in|Register)\s*$/i,
      // Ad markers
      /^\s*(Advertisement|Sponsored|Ad|Promoted|ADVERTISEMENT|Loading\.\.\.)\s*$/i,
      // Navigation breadcrumbs
      /^\s*(Home|News|Sports|Entertainment|Opinion|World|Business)\s*[>»→\/]\s*/i,
      // Copyright lines
      /^\s*©|^\s*Copyright\s/i,
      // "Continue reading" type links
      /^\s*(Continue reading|Read more|Click here|Tap here|Swipe|Scroll down)/i,
      // Time stamps that are just standalone (e.g., "2 hours ago", "Updated 3 min ago")
      /^\s*(Updated|Published|Posted)?\s*\d+\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|days?)\s*ago\s*$/i,
      // Standalone reporter bylines
      /^\s*By\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*,?\s*(CBC|CNN|BBC|AP|Reuters|NPR|The .+)?\s*$/,
    ]

    // Patterns to clean from within lines (inline noise)
    const inlineCleanPatterns = [
      // Inline photo credits
      /\s*\((?:Photo|Image)\s+(?:by|via|courtesy)\s+.*?\)/gi,
      /\s*\/\s*\(.*?(?:Getty|AP|Reuters|AFP).*?\)/gi,
    ]

    for (let line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines (will be preserved as paragraph breaks)
      if (!trimmed) {
        cleaned.push('')
        continue
      }

      // Check if entire line should be removed
      let shouldRemove = false
      for (const pattern of removeLinePatterns) {
        if (pattern.test(trimmed)) {
          shouldRemove = true
          break
        }
      }
      if (shouldRemove) continue

      // Check for image caption heuristics:
      // Lines that are duplicated nearby (alt text + caption) — skip if very similar to previous kept line
      if (cleaned.length > 0) {
        const prevLine = cleaned[cleaned.length - 1].trim()
        if (prevLine && trimmed.startsWith(prevLine.substring(0, Math.min(30, prevLine.length)))) {
          // Current line starts with same text as previous — likely duplicate caption
          // Keep the longer one
          if (trimmed.length > prevLine.length) {
            cleaned[cleaned.length - 1] = trimmed
          }
          continue
        }
      }

      // Clean inline noise
      let cleanedLine = trimmed
      for (const pattern of inlineCleanPatterns) {
        cleanedLine = cleanedLine.replace(pattern, '')
      }

      if (cleanedLine.trim()) {
        cleaned.push(cleanedLine.trim())
      }
    }

    // Remove leading/trailing empty lines and collapse multiple blank lines
    return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  const handleCleanText = () => {
    if (!text.trim()) return
    const cleaned = cleanArticleText(text)
    if (cleaned !== text) {
      setText(cleaned)
      sessionStorage.setItem('tts_text', cleaned)
      setCleanFeedback(true)
      setTimeout(() => setCleanFeedback(false), 1500)
      // Reset sentences since text changed
      setSentenceTranslations({})
      sentencesRef.current = []
    }
  }

  const handleSummarize = async () => {
    if (!text.trim()) return
    if (!isAuthenticated) {
      setSummaryModal({ open: true, loading: false, content: '', error: 'sign_in_required' })
      return
    }
    setSummaryModal({ open: true, loading: true, content: '', error: '' })
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiUrl}/api/tts/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_lang: targetLanguage })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error (${res.status})`)
      }
      const data = await res.json()
      if (data.summary) {
        setSummaryModal({ open: true, loading: false, content: data.summary, error: '' })
      } else {
        setSummaryModal({ open: true, loading: false, content: '', error: data.source === 'unreachable' ? 'AI server is currently unavailable. Please try again later.' : 'Failed to generate summary.' })
      }
    } catch (err) {
      setSummaryModal({ open: true, loading: false, content: '', error: err.message || 'Failed to generate summary.' })
    }
  }

  // 텍스트를 단어별로 렌더링 (어려운 단어 클릭 가능)
  const renderWords = (str, extraClass) => {
    const tokens = tokenizeWithDifficulty(str)
    return tokens.map((t, i) => {
      if (!t.isWord) return <span key={i}>{t.text}</span>
      if (t.isDifficult) {
        return (
          <span
            key={i}
            className={`word-difficult${extraClass ? ' ' + extraClass : ''}`}
            onClick={(e) => handleWordClick(t.text, e)}
          >
            {t.text}
          </span>
        )
      }
      return <span key={i}>{t.text}</span>
    })
  }

  // 하이라이트된 텍스트 렌더링 — translationViewMode에 따라 다르게
  const renderHighlightedText = () => {
    const sentences = sentencesRef.current
    const hasSentences = sentences.length > 0
    const needsTranslation = selectedLanguage !== targetLanguage

    // All 모드: 문장별로 번역 표시
    if (translationViewMode === 'all' && hasSentences && needsTranslation) {
      return (
        <>
          {sentences.map((sentence, idx) => {
            const sentText = text.substring(sentence.start, sentence.end)
            const isActive = idx === currentSentenceIdx
            const translation = sentenceTranslations[idx]
            return (
              <span key={idx} className="highlight-wrapper">
                <span className={isActive ? 'highlight-text' : undefined}>{renderWords(sentText)}</span>
                {translation && (
                  <span className={`highlight-tooltip${isActive ? ' highlight-tooltip--active' : ''}`} style={{ fontSize: `${translationFontSize}px` }}>{translation}</span>
                )}
              </span>
            )
          })}
        </>
      )
    }

    // Highlight 모드 또는 Off 모드
    if (highlightStart < 0 || highlightEnd < 0) {
      return renderWords(text)
    }

    const before = text.substring(0, highlightStart)
    const highlight = text.substring(highlightStart, highlightEnd)
    const after = text.substring(highlightEnd)

    const showTooltip = translationViewMode === 'highlight' && translatedTooltip && needsTranslation

    return (
      <>
        {renderWords(before)}
        <span className="highlight-wrapper">
          <span className="highlight-text">{renderWords(highlight)}</span>
          {showTooltip && (
            <span className="highlight-tooltip highlight-tooltip--active" style={{ fontSize: `${translationFontSize}px` }}>{translatedTooltip}</span>
          )}
        </span>
        {renderWords(after)}
      </>
    )
  }

  // All 모드 전환 시 전체 문장 즉시 번역
  const translateAllSentences = async () => {
    if (!text.trim() || selectedLanguage === targetLanguage) return

    let sentences = sentencesRef.current
    if (sentences.length === 0) {
      sentences = splitSentences(text)
      sentencesRef.current = sentences
    }

    // 이미 번역된 문장은 건너뜀
    const untranslated = sentences
      .map((s, i) => ({ idx: i, text: s.text }))
      .filter(s => !sentenceTranslations[s.idx])

    if (untranslated.length === 0) return

    setIsTranslating(true)
    try {
      const results = await Promise.all(
        untranslated.map(s =>
          translateText(s.text, selectedLanguage, targetLanguage)
            .then(translated => ({ idx: s.idx, translated }))
        )
      )
      setSentenceTranslations(prev => {
        const updated = { ...prev }
        results.forEach(r => { updated[r.idx] = r.translated })
        return updated
      })
    } catch (e) {
      console.error('Bulk translation error:', e)
    }
    setIsTranslating(false)
  }

  // translationViewMode가 'all'로 바뀌면 즉시 번역 실행
  useEffect(() => {
    if (translationViewMode === 'all' && text.trim() && selectedLanguage !== targetLanguage) {
      translateAllSentences()
    }
  }, [translationViewMode])

  // ref 동기화
  useEffect(() => {
    speechRateRef.current = speechRate
  }, [speechRate])
  useEffect(() => {
    translationModelRef.current = translationModel
  }, [translationModel])


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
    <>
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
            <div className="tts-tools-row">
              <button
                className="attach-image-btn-top"
                onClick={() => fileInputRef.current?.click()}
                title="Attach images for OCR"
              >
                📷 Attach Images
              </button>
              {selectedLanguage !== targetLanguage && (
                <div className="tts-tools-right">
                  <div className="model-pills model-pills--action">
                    {TRANSLATION_MODELS.map(model => (
                      <button
                        key={model.id}
                        className={`model-pill${translationModel === model.id ? ' active' : ''}${model.id === 'deepl' ? ' model-pill--deepl' : ' model-pill--google'}`}
                        onClick={() => setTranslationModel(model.id)}
                        title={model.desc}
                      >
                        <span className="model-pill-emoji">{model.emoji}</span>
                        <span className="model-pill-name">{model.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="view-mode-toggle">
                    {[
                      { id: 'highlight', label: 'Highlight' },
                      { id: 'all', label: 'All' },
                      { id: 'off', label: 'Off' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        className={`view-mode-btn${translationViewMode === mode.id ? ' active' : ''}`}
                        onClick={() => setTranslationViewMode(mode.id)}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="button-group">
              <button
                onClick={handlePrevSentence}
                disabled={!isSpeaking || currentSentenceIdx <= 0}
                className="nav-btn"
                title="Previous sentence"
              >
                ⏮
              </button>
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
              <button
                onClick={handleNextSentence}
                disabled={!isSpeaking || currentSentenceIdx >= sentencesRef.current.length - 1}
                className="nav-btn"
                title="Next sentence"
              >
                ⏭
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

            <div className="text-display-wrapper" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {/* Text display toolbar — font size, line height, translation size, reset, clear */}
              <div className="text-display-toolbar">
                <div className="toolbar-group">
                  <span className="toolbar-label">Aa</span>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleFontSizeChange(-1)}
                    disabled={fontSize <= 12}
                    title="Decrease font size"
                  >−</button>
                  <span className="toolbar-value">{fontSize}px</span>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleFontSizeChange(1)}
                    disabled={fontSize >= 28}
                    title="Increase font size"
                  >+</button>
                </div>
                <div className="toolbar-divider"></div>
                <div className="toolbar-group">
                  <span className="toolbar-label">↕</span>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleLineHeightChange(-0.2)}
                    disabled={lineHeight <= 1.0}
                    title="Decrease line spacing"
                  >−</button>
                  <span className="toolbar-value">{lineHeight.toFixed(1)}</span>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleLineHeightChange(0.2)}
                    disabled={lineHeight >= 3.0}
                    title="Increase line spacing"
                  >+</button>
                </div>
                {selectedLanguage !== targetLanguage && (
                  <>
                    <div className="toolbar-divider"></div>
                    <div className="toolbar-group">
                      <span className="toolbar-label" title="Translation text size">Trans</span>
                      <button
                        className="toolbar-btn"
                        onClick={() => handleTranslationFontSizeChange(-1)}
                        disabled={translationFontSize <= 10}
                        title="Decrease translation font size"
                      >−</button>
                      <span className="toolbar-value">{translationFontSize}px</span>
                      <button
                        className="toolbar-btn"
                        onClick={() => handleTranslationFontSizeChange(1)}
                        disabled={translationFontSize >= 22}
                        title="Increase translation font size"
                      >+</button>
                    </div>
                  </>
                )}
                <div className="toolbar-spacer"></div>
                <button
                  className={`toolbar-btn toolbar-clean-btn has-tooltip${cleanFeedback ? ' cleaned' : ''}`}
                  onClick={handleCleanText}
                  data-tooltip={cleanFeedback ? 'Cleaned!' : 'Clean article text (remove captions, credits, ads)'}
                  disabled={!text.trim()}
                >{cleanFeedback ? '✓' : '🧹'}</button>
                <button
                  className={`toolbar-btn toolbar-compact-btn has-tooltip${compactLines ? ' active' : ''}`}
                  onClick={handleToggleCompactLines}
                  data-tooltip={compactLines ? 'Restore original line breaks' : 'Collapse blank lines'}
                  disabled={!text.trim()}
                >¶</button>
                <button
                  className="toolbar-btn toolbar-reset-btn has-tooltip"
                  onClick={handleResetDisplaySettings}
                  data-tooltip="Reset to defaults"
                  disabled={fontSize === DEFAULT_FONT_SIZE && lineHeight === DEFAULT_LINE_HEIGHT && translationFontSize === DEFAULT_TRANSLATION_FONT_SIZE}
                >↺</button>
                <button
                  className="toolbar-btn toolbar-clear-btn has-tooltip"
                  onClick={handleClearContent}
                  data-tooltip="Clear all content"
                  disabled={!text.trim()}
                >🗑</button>
                <div className="toolbar-divider"></div>
                <button
                  className={`toolbar-btn toolbar-copy-btn has-tooltip${copyFeedback ? ' copied' : ''}`}
                  onClick={handleCopyText}
                  data-tooltip={copyFeedback ? 'Copied!' : 'Copy text'}
                  disabled={!text.trim()}
                >{copyFeedback ? '✓' : '📋'}</button>
                <button
                  className="toolbar-btn toolbar-summarize-btn has-tooltip"
                  onClick={handleSummarize}
                  data-tooltip="AI Summarize (via Lannie Server)"
                  disabled={!text.trim() || text.trim().length < 20}
                >✨</button>
              </div>
              {(!isEditing && text.trim()) || isSpeaking ? (
                <div
                  className="text-display"
                  onClick={() => setWordPopup(null)}
                  onDoubleClick={() => { if (!isSpeaking) setIsEditing(true) }}
                  title={!isSpeaking ? 'Double-click to edit' : undefined}
                  style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
                >
                  {renderHighlightedText()}
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  onBlur={() => { if (text.trim()) setIsEditing(false) }}
                  placeholder={pastedImages.length > 0
                    ? 'Images attached. Click 🔍 to extract text, or type here...'
                    : 'Enter text to convert to speech... (Paste images with Ctrl+V)'
                  }
                  className="input-textarea"
                  autoFocus={isEditing && text.trim()}
                  style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
                />
              )}
              {/* Word popup */}
              {wordPopup && (
                <div
                  className="word-popup"
                  style={{ left: Math.min(wordPopup.x, 400), top: wordPopup.y }}
                >
                  <div className="word-popup-header">
                    <span className="word-popup-word">{wordPopup.word}</span>
                    <button className="word-popup-close" onClick={() => setWordPopup(null)}>✕</button>
                  </div>
                  {wordPopup.loading ? (
                    <div className="word-popup-loading">Loading...</div>
                  ) : (
                    <>
                      {wordPopup.translation && (
                        <div className="word-popup-translation">{wordPopup.translation}</div>
                      )}
                      <div className="word-popup-phonetics">
                        {wordPopup.usPhonetic && (
                          <span className="word-popup-phonetic">
                            <span className="word-popup-flag">
                              <svg width="16" height="12" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                                <rect width="60" height="30" fill="#B22234" />
                                <path d="M0,3.46h60M0,6.92h60M0,10.38h60M0,13.84h60M0,17.3h60M0,20.76h60M0,24.22h60M0,27.68h60" stroke="#fff" strokeWidth="2.3" />
                                <rect width="24" height="17.3" fill="#3C3B6E" />
                                <g fill="#fff">
                                  <g id="wp-s5"><g id="wp-s4"><path id="wp-s" d="M3,2.3L3.3,3.3L2.4,2.8h1.2L2.7,3.3z" /><use href="#wp-s" x="6" /><use href="#wp-s" x="12" /><use href="#wp-s" x="18" /></g><use href="#wp-s4" y="4.6" /></g>
                                  <use href="#wp-s5" y="9.2" /><use href="#wp-s4" y="2.3" />
                                </g>
                              </svg>
                            </span>
                            {wordPopup.usPhonetic}
                            <button
                              className="word-popup-speak-btn"
                              onClick={(e) => { e.stopPropagation(); speakWord(wordPopup.word, wordPopup.usAudio) }}
                              title="Play US pronunciation"
                            >🔊</button>
                          </span>
                        )}
                        {wordPopup.ukPhonetic && (
                          <span className="word-popup-phonetic">
                            <span className="word-popup-flag">
                              <svg width="16" height="12" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                                <rect width="60" height="30" fill="#012169" />
                                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
                                <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                                <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                              </svg>
                            </span>
                            {wordPopup.ukPhonetic}
                            <button
                              className="word-popup-speak-btn"
                              onClick={(e) => { e.stopPropagation(); speakWord(wordPopup.word, wordPopup.ukAudio) }}
                              title="Play UK pronunciation"
                            >🔊</button>
                          </span>
                        )}
                        {!wordPopup.usPhonetic && !wordPopup.ukPhonetic && (
                          <span className="word-popup-phonetic">
                            <span className="word-popup-no-phonetic">No phonetic</span>
                            <button
                              className="word-popup-speak-btn"
                              onClick={(e) => { e.stopPropagation(); speakWord(wordPopup.word, null) }}
                              title="Play pronunciation"
                            >🔊</button>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
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


      {/* AI Summary Modal */}
      {summaryModal.open && (
        <div className="summary-modal-overlay" onClick={() => setSummaryModal(prev => ({ ...prev, open: false }))}>
          <div className="summary-modal" onClick={e => e.stopPropagation()}>
            <div className="summary-modal-header">
              <span className="summary-modal-title">✨ AI Summary</span>
              <div className="summary-modal-actions">
                {summaryModal.content && !summaryModal.loading && !summaryModal.error && (
                  <>
                    <button
                      className={`summary-action-btn${summaryCopied ? ' copied' : ''}`}
                      onClick={() => {
                        const plain = summaryModal.content.replace(/\*\*(.*?)\*\*/g, '$1')
                        navigator.clipboard.writeText(plain)
                        setSummaryCopied(true)
                        setTimeout(() => setSummaryCopied(false), 1500)
                      }}
                      title="Copy to clipboard"
                    >{summaryCopied ? '✓ Copied' : '📋 Copy'}</button>
                    <button
                      className="summary-action-btn"
                      onClick={() => {
                        const plain = summaryModal.content.replace(/\*\*(.*?)\*\*/g, '$1')
                        const bom = '\uFEFF'
                        const blob = new Blob([bom + plain], { type: 'text/plain;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `summary_${new Date().toISOString().slice(0,10)}.txt`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      title="Download as text file"
                    >💾 Save</button>
                  </>
                )}
                <button className="summary-modal-close" onClick={() => setSummaryModal(prev => ({ ...prev, open: false }))}>✕</button>
              </div>
            </div>
            <div className="summary-modal-body">
              {summaryModal.loading ? (
                <div className="summary-modal-loading">
                  <div className="summary-spinner"></div>
                  <span>Generating summary...</span>
                </div>
              ) : summaryModal.error === 'sign_in_required' ? (
                <div className="summary-modal-auth">
                  <span className="summary-auth-icon">🔒</span>
                  <p>Please sign in to use AI Summarize.</p>
                  <p className="summary-auth-sub">This feature uses our AI server and is available for logged-in users only.</p>
                </div>
              ) : summaryModal.error ? (
                <div className="summary-modal-error">
                  <span className="summary-error-icon">⚠</span>
                  <p>{summaryModal.error}</p>
                </div>
              ) : (
                <div className="summary-modal-content" dangerouslySetInnerHTML={{ __html: summaryModal.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              )}
            </div>
            {summaryModal.content && !summaryModal.loading && !summaryModal.error && (
              <div className="summary-modal-footer">Made by Lannie Server · Qwen</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default TextToSpeech

