/**
 * useTranslation Hook
 * 실시간 번역 훅
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLanguagePreferences } from '../../auth'

const API_BASE = '/api'

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
 * 번역 훅
 */
export function useTranslation() {
  const [translatedText, setTranslatedText] = useState('')
  const [targetLang, setTargetLangState] = useState('ko')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isRetranslating, setIsRetranslating] = useState(false)
  const [retranslateProgress, setRetranslateProgress] = useState(0)
  const [error, setError] = useState(null)
  
  // 원본 문장들 저장 (재번역용) - {sentence, sourceLang, translatedText, targetLang}
  const sentencesRef = useRef([])
  // 번역 큐
  const pendingRef = useRef([])
  const processingRef = useRef(false)

  // 공통 언어 설정 훅 사용
  const { nativeLanguage, isLoaded } = useLanguagePreferences()

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
    
    // 같은 언어면 번역 불필요
    if (sourceLang === targetLang) {
      return text
    }
    
    try {
      const response = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          source_lang: sourceLang,
          target_lang: targetLang
        })
      })
      
      // Rate limit 에러 시 재시도
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10)
        const waitTime = Math.max(retryAfter * 1000, RETRY_DELAY_MS * (retryCount + 1))
        console.log(`[Translation] Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await delay(waitTime)
        return translateSentence(text, sourceLang, targetLang, retryCount + 1)
      }
      
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data.translated_text || null
    } catch (err) {
      console.error('[Translation] Error:', err)
      setError(err.message)
      return null
    }
  }, [])


  // targetLang을 참조하기 위한 ref (클로저 문제 해결)
  const targetLangRef = useRef(targetLang)
  targetLangRef.current = targetLang

  /**
   * 큐 처리 - 실시간 번역
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || pendingRef.current.length === 0) return
    
    processingRef.current = true
    setIsTranslating(true)
    
    while (pendingRef.current.length > 0) {
      const { sentence, sourceLang, targetLang: tLang, index } = pendingRef.current.shift()
      
      let translatedResult = sentence // 기본값은 원본
      
      if (sourceLang !== tLang) {
        const translated = await translateSentence(sentence, sourceLang, tLang)
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
    if (!sentence?.trim()) return
    
    // ref를 사용하여 최신 targetLang 값 가져오기
    const currentTargetLang = targetLangRef.current
    const index = sentencesRef.current.length
    
    // 언어 코드 정규화 (en-us, en-in -> en)
    const normalizedSourceLang = normalizeLanguageCode(sourceLang)
    
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
      console.log(`[Translation] Same language, using original`)
      sentencesRef.current[index].translatedText = sentence.trim()
      updateTranslatedText()
      return
    }
    
    // 번역 큐에 추가
    console.log(`[Translation] Adding to queue for translation`)
    pendingRef.current.push({ 
      sentence: sentence.trim(), 
      sourceLang: normalizedSourceLang, 
      targetLang: currentTargetLang,
      index 
    })
    processQueue()
  }, [processQueue, updateTranslatedText])

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
    setTargetLang,
    addSentenceToTranslate,
    retranslateAll,
    clearTranslation,
  }
}

export default useTranslation