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
  const [targetLang, setTargetLang] = useState('ko')
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState(null)
  
  // 번역된 문장 추적 (중복 방지)
  const translatedSentencesRef = useRef(new Set())
  // 번역 큐
  const pendingRef = useRef([])
  const processingRef = useRef(false)

  /**
   * 단일 문장 번역
   */
  const translateSentence = useCallback(async (text, sourceLang, targetLang) => {
    if (!text?.trim()) return null
    
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
      return data.translated_text || text
    } catch (err) {
      console.error('Translation error:', err)
      setError(err.message)
      return null
    }
  }, [])

  /**
   * 큐 처리
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || pendingRef.current.length === 0) return
    
    processingRef.current = true
    setIsTranslating(true)
    
    while (pendingRef.current.length > 0) {
      const { sentence, sourceLang, targetLang: tLang } = pendingRef.current.shift()
      
      // 이미 번역된 문장 스킵
      const key = `${sentence}|${sourceLang}|${tLang}`
      if (translatedSentencesRef.current.has(key)) continue
      
      const translated = await translateSentence(sentence, sourceLang, tLang)
      
      if (translated) {
        translatedSentencesRef.current.add(key)
        setTranslatedText(prev => {
          const newText = prev ? `${prev}\n${translated}` : translated
          return newText
        })
      }
    }
    
    processingRef.current = false
    setIsTranslating(false)
  }, [translateSentence])

  /**
   * 새 문장 번역 요청
   */
  const addSentenceToTranslate = useCallback((sentence, sourceLang) => {
    if (!sentence?.trim()) return
    if (sourceLang === targetLang) {
      // 같은 언어면 그대로 추가
      setTranslatedText(prev => prev ? `${prev}\n${sentence}` : sentence)
      return
    }
    
    pendingRef.current.push({ sentence, sourceLang, targetLang })
    processQueue()
  }, [targetLang, processQueue])

  /**
   * 번역 언어 변경
   */
  const changeTargetLang = useCallback((newLang) => {
    setTargetLang(newLang)
    // 언어 변경 시 기존 번역 초기화
    setTranslatedText('')
    translatedSentencesRef.current.clear()
    pendingRef.current = []
  }, [])

  /**
   * 초기화
   */
  const clearTranslation = useCallback(() => {
    setTranslatedText('')
    setError(null)
    translatedSentencesRef.current.clear()
    pendingRef.current = []
  }, [])

  return {
    translatedText,
    targetLang,
    isTranslating,
    error,
    setTargetLang: changeTargetLang,
    addSentenceToTranslate,
    clearTranslation,
  }
}

export default useTranslation
