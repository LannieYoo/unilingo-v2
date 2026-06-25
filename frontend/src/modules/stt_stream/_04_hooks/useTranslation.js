/**
 * useTranslation Hook
 * 실시간 번역 훅
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLanguagePreferences } from '../../auth'
import { useGlossary } from '../../../shared/modules/glossary'
import { useUsage } from '../../../common/contexts/UsageContext'
import { useAuthStore } from '../../auth/_05_stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Supported languages
export const TRANSLATION_LANGUAGES = [
  { code: 'ko', name: 'Korean' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
]

// 재시도 설정
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * 지연 함수
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 언어 코드 정규화 (en-us, en-in -> en)
 */
const normalizeLanguageCode = (lang) => {
  if (!lang) return lang
  // en-us, en-in 등을 en으로 변환
  if (lang.startsWith('en-')) return 'en'
  return lang
}

/**
 * 숫자/통화/단위 보호
 *
 * 번역 모델이 "$16.8 million"을 "16달러"처럼 (소수점/단위/통화를 떨어뜨려)
 * 망가뜨리는 일이 잦다. glossary가 전문 용어를 보호하는 것과 동일하게,
 * 번역 전에 숫자 표현을 플레이스홀더로 치환했다가 번역 후 원본 그대로
 * 복원해서 모델이 숫자를 건드리지 못하게 한다.
 */
// 통화기호?  숫자(콤마/소수점)  단위(million 등)?  퍼센트?
const NUMERIC_RE = /(?:[$€£₩¥]\s?)?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|trillion|thousand))?%?/gi

const protectNumbers = (text) => {
  if (!text) return { text, numMap: {} }
  const numMap = {}
  let i = 0
  const protectedText = text.replace(NUMERIC_RE, (match) => {
    if (!/\d/.test(match)) return match // 숫자 없는 매치는 무시
    const placeholder = `__NUM${i}__`
    numMap[placeholder] = match.trim()
    i++
    return placeholder
  })
  return { text: protectedText, numMap }
}

const restoreNumbers = (text, numMap) => {
  if (!text || !numMap) return text
  let result = text
  for (const [placeholder, value] of Object.entries(numMap)) {
    result = result.split(placeholder).join(value)
  }
  return result
}

/**
 * 번역 훅
 */
export function useTranslation() {
  const [translatedText, setTranslatedText] = useState('')
  const [targetLang, setTargetLangState] = useState('ko')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isRetranslating, setIsRetranslating] = useState(false)
  const [retranslateProgress, setRetranslateProgress] = useState(0)
  const [error, setError] = useState(null)
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(true)
  
  // 원본 문장들 저장 (재번역용) - {sentence, sourceLang, translatedText, targetLang}
  const sentencesRef = useRef([])
  // 번역 큐
  const pendingRef = useRef([])
  const processingRef = useRef(false)

  // 공통 언어 설정 훅 사용
  const { nativeLanguage, isLoaded } = useLanguagePreferences()

  // Glossary 훅 사용
  const { domain, setDomain, preProcess, postProcess } = useGlossary('general')

  // Usage tracking hook
  const { trackUsage } = useUsage()
  
  // Auth store for token
  const { tokens, isAuthenticated } = useAuthStore()

  // Load language preferences from settings
  useEffect(() => {
    if (!isLoaded) return
    
    // Settings의 native_language → Translation의 Target Language
    const isSupported = TRANSLATION_LANGUAGES.some(l => l.code === nativeLanguage)
    
    if (isSupported) {
      setTargetLangState(nativeLanguage)
    }
  }, [isLoaded, nativeLanguage])

  /**
   * 단일 문장 번역 API 호출 (재시도 로직 포함)
   */
  const translateSentence = useCallback(async (text, sourceLang, targetLang, retryCount = 0) => {
    if (!text?.trim()) return null
    
    console.log(`[Translation] translateSentence called:`, { text, sourceLang, targetLang })
    
    // 같은 언어면 번역 불필요
    if (sourceLang === targetLang) {
      console.log(`[Translation] Same language, skipping translation`)
      return text
    }

    // 1. 번역 전 용어 보호
    const { processedText, termMap } = preProcess(text, sourceLang, targetLang)

    // 1-2. 숫자/통화/단위 보호 (모델이 "$16.8 million"을 망가뜨리지 못하게)
    const { text: protectedText, numMap } = protectNumbers(processedText)

    console.log(`[Translation] Calling API:`, {
      url: `${API_BASE}/api/translate`,
      sourceLang,
      targetLang,
      textLength: protectedText.length,
      isAuthenticated
    })
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if authenticated
      if (isAuthenticated && tokens?.access_token) {
        headers['Authorization'] = `Bearer ${tokens.access_token}`
      }
      
      const response = await fetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: protectedText.trim(),
          source_lang: sourceLang,
          target_lang: targetLang
        })
      })
      
      console.log(`[Translation] API response:`, { status: response.status, ok: response.ok })
      
      // Rate limit 에러 시 재시도
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10)
        const waitTime = Math.max(retryAfter * 1000, RETRY_DELAY_MS * (retryCount + 1))
        console.log(`[Translation] Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await delay(waitTime)
        return translateSentence(text, sourceLang, targetLang, retryCount + 1)
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Translation] API error:`, errorText)
        throw new Error(`Translation failed: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(`[Translation] API success:`, { translatedText: data.translated_text })
      const translatedText = data.translated_text || null
      
      // 2. 번역 후 숫자 복원 → 용어 복원
      if (translatedText) {
        const numRestored = restoreNumbers(translatedText, numMap)
        const finalText = postProcess(numRestored, termMap)

        // Track usage - count characters in original text (STT type)
        const charCount = text.length
        await trackUsage(charCount, 'stt')
        
        return finalText
      }
      
      return null
    } catch (err) {
      console.error('[Translation] Error:', err)
      setError(err.message)
      return null
    }
  }, [preProcess, postProcess, trackUsage])


  // targetLang을 참조하기 위한 ref (클로저 문제 해결)
  const targetLangRef = useRef(targetLang)
  targetLangRef.current = targetLang

  /**
   * 큐 처리 - 실시간 번역
   */
  const processQueue = useCallback(async () => {
    console.log(`[Translation] processQueue called, processing: ${processingRef.current}, queue length: ${pendingRef.current.length}`)
    
    if (processingRef.current || pendingRef.current.length === 0) {
      console.log(`[Translation] Skipping queue processing`)
      return
    }
    
    processingRef.current = true
    setIsTranslating(true)
    console.log(`[Translation] Starting queue processing...`)
    
    while (pendingRef.current.length > 0) {
      const { sentence, sourceLang, targetLang: tLang, index } = pendingRef.current.shift()
      console.log(`[Translation] Processing:`, { sentence, sourceLang, targetLang: tLang, index })
      
      let translatedResult = sentence // 기본값은 원본
      
      if (sourceLang !== tLang) {
        console.log(`[Translation] Calling translateSentence...`)
        const translated = await translateSentence(sentence, sourceLang, tLang)
        console.log(`[Translation] Result:`, translated)
        if (translated) {
          translatedResult = translated
        }
      }
      
      // 문장 저장소 업데이트
      if (sentencesRef.current[index]) {
        sentencesRef.current[index].translatedText = translatedResult
        sentencesRef.current[index].targetLang = tLang
      }
      
      // 번역 텍스트 업데이트
      updateTranslatedText()
    }
    
    processingRef.current = false
    setIsTranslating(false)
    console.log(`[Translation] Queue complete`)
  }, [translateSentence])

  /**
   * 번역 텍스트 업데이트
   */
  const updateTranslatedText = useCallback(() => {
    const texts = sentencesRef.current
      .map(s => s.translatedText)
      .filter(t => t)
    setTranslatedText(texts.join('\n'))
  }, [])

  /**
   * 새 문장 번역 요청 (실시간)
   */
  const addSentenceToTranslate = useCallback((sentence, sourceLang) => {
    console.log(`[Translation] addSentenceToTranslate called:`, { 
      sentence, 
      sourceLang, 
      isTranslationEnabled,
      currentTargetLang: targetLangRef.current 
    })
    
    if (!sentence?.trim()) {
      console.log(`[Translation] Empty sentence, skipping`)
      return
    }
    
    // 번역이 비활성화되어 있으면 번역하지 않음
    if (!isTranslationEnabled) {
      console.log(`[Translation] Translation disabled, skipping`)
      return
    }
    
    // ref를 사용하여 최신 targetLang 값 가져오기
    const currentTargetLang = targetLangRef.current
    const index = sentencesRef.current.length
    
    // 언어 코드 정규화 (en-us, en-in -> en)
    const normalizedSourceLang = normalizeLanguageCode(sourceLang)
    
    console.log(`[Translation] Normalized source lang: ${sourceLang} -> ${normalizedSourceLang}`)
    console.log(`[Translation] Adding sentence: "${sentence}" (source: ${normalizedSourceLang}, target: ${currentTargetLang})`)
    
    // 문장 저장
    sentencesRef.current.push({
      sentence: sentence.trim(),
      sourceLang: normalizedSourceLang,
      translatedText: null,
      targetLang: currentTargetLang
    })
    
    // 같은 언어면 바로 표시
    if (normalizedSourceLang === currentTargetLang) {
      console.log(`[Translation] Same language (${normalizedSourceLang} === ${currentTargetLang}), using original`)
      sentencesRef.current[index].translatedText = sentence.trim()
      updateTranslatedText()
      return
    }
    
    // 번역 큐에 추가
    console.log(`[Translation] Different languages, adding to queue for translation`)
    pendingRef.current.push({ 
      sentence: sentence.trim(), 
      sourceLang: normalizedSourceLang, 
      targetLang: currentTargetLang,
      index 
    })
    console.log(`[Translation] Queue length: ${pendingRef.current.length}`)
    processQueue()
  }, [processQueue, updateTranslatedText, isTranslationEnabled])

  /**
   * 번역 언어 변경 (기존 번역 유지, 이후만 새 언어로)
   */
  const setTargetLang = useCallback((newLang) => {
    if (newLang === targetLangRef.current) return
    setTargetLangState(newLang)
  }, [])

  /**
   * 전체 재번역 (Retranslate All)
   */
  const retranslateAll = useCallback(async () => {
    if (sentencesRef.current.length === 0) return
    
    const currentTargetLang = targetLangRef.current
    const total = sentencesRef.current.length
    
    setIsRetranslating(true)
    setRetranslateProgress(0)
    
    for (let i = 0; i < total; i++) {
      const item = sentencesRef.current[i]
      const { sentence, sourceLang } = item
      
      if (sourceLang === currentTargetLang) {
        // 같은 언어면 원본 사용
        sentencesRef.current[i].translatedText = sentence
        sentencesRef.current[i].targetLang = currentTargetLang
      } else {
        // 다른 언어면 번역
        const translated = await translateSentence(sentence, sourceLang, currentTargetLang)
        sentencesRef.current[i].translatedText = translated || sentence
        sentencesRef.current[i].targetLang = currentTargetLang
      }
      
      // 진행률 업데이트
      setRetranslateProgress(Math.round(((i + 1) / total) * 100))
      
      // 실시간으로 텍스트 업데이트
      updateTranslatedText()
    }
    
    setIsRetranslating(false)
    setRetranslateProgress(0)
  }, [translateSentence, updateTranslatedText])

  /**
   * 초기화
   */
  const clearTranslation = useCallback(() => {
    setTranslatedText('')
    setError(null)
    sentencesRef.current = []
    pendingRef.current = []
    setRetranslateProgress(0)
  }, [])

  return {
    translatedText,
    targetLang,
    isTranslating,
    isRetranslating,
    retranslateProgress,
    error,
    domain,
    isTranslationEnabled,
    setTargetLang,
    setDomain,
    setIsTranslationEnabled,
    addSentenceToTranslate,
    retranslateAll,
    clearTranslation,
  }
}

export default useTranslation