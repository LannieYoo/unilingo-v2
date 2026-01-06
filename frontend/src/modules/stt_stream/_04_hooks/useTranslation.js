/**
 * useTranslation Hook
 * 실시간 번역 훅
 */

import { useState, useCallback, useRef } from 'react'

const API_BASE = '/api'

// 지원 언어
export const TRANSLATION_LANGUAGES = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
]

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

  /**
   * 단일 문장 번역 API 호출
   */
  const translateSentence = useCallback(async (text, sourceLang, targetLang) => {
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
    
    console.log(`[Translation] Adding sentence: "${sentence}" (source: ${sourceLang}, target: ${currentTargetLang})`)
    
    // 문장 저장
    sentencesRef.current.push({
      sentence: sentence.trim(),
      sourceLang,
      translatedText: null,
      targetLang: currentTargetLang
    })
    
    // 같은 언어면 바로 표시
    if (sourceLang === currentTargetLang) {
      console.log(`[Translation] Same language, using original`)
      sentencesRef.current[index].translatedText = sentence.trim()
      updateTranslatedText()
      return
    }
    
    // 번역 큐에 추가
    console.log(`[Translation] Adding to queue for translation`)
    pendingRef.current.push({ 
      sentence: sentence.trim(), 
      sourceLang, 
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