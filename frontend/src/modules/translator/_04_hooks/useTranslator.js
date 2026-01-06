/**
 * useTranslator Hook
 * 번역 기능 훅
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { LANG_MAP } from '../_08_constants'

/**
 * 언어 감지 함수
 */
export function detectLanguage(text) {
  if (!text?.trim()) return null
  
  const trimmedText = text.trim()
  const koreanMatches = trimmedText.match(/[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/g)
  const chineseMatches = trimmedText.match(/[\u4E00-\u9FFF]/g)
  const englishMatches = trimmedText.match(/[A-Za-z]/g)
  
  const koreanCount = koreanMatches ? koreanMatches.length : 0
  const chineseCount = chineseMatches ? chineseMatches.length : 0
  const englishCount = englishMatches ? englishMatches.length : 0
  
  if (koreanCount > 0) return 'ko'
  if (chineseCount > 0) return 'zh'
  if (englishCount > 0) return 'en'
  
  return null
}

/**
 * 번역 훅
 */
export function useTranslator() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [sourceLang, setSourceLang] = useState('en-CA')
  const [targetLang, setTargetLang] = useState('ko')
  const [isTranslating, setIsTranslating] = useState(false)
  
  const translateTimeoutRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isManualLangChangeRef = useRef(false)

  // 입력 텍스트 변경 시 언어 자동 탐지
  useEffect(() => {
    if (isManualLangChangeRef.current) {
      isManualLangChangeRef.current = false
      return
    }
    
    if (!inputText?.trim()) return
    
    const detectedLang = detectLanguage(inputText)
    if (!detectedLang) return
    
    if (detectedLang === 'ko') {
      setSourceLang(prev => prev !== 'ko' ? 'ko' : prev)
      setTargetLang(prev => {
        const isEnglish = ['en-CA', 'en-US', 'en-GB', 'en-IN'].includes(prev)
        return !isEnglish ? 'en-CA' : prev
      })
    } else if (detectedLang === 'en') {
      setSourceLang(prev => {
        const isEnglish = ['en-CA', 'en-US', 'en-GB', 'en-IN'].includes(prev)
        return !isEnglish ? 'en-CA' : prev
      })
      setTargetLang(prev => prev !== 'ko' ? 'ko' : prev)
    } else if (detectedLang === 'zh') {
      setSourceLang(prev => prev !== 'zh' ? 'zh' : prev)
      setTargetLang(prev => {
        const isEnglish = ['en-CA', 'en-US', 'en-GB', 'en-IN'].includes(prev)
        return !isEnglish ? 'en-CA' : prev
      })
    }
  }, [inputText])

  const handleTranslate = useCallback(async (text = inputText) => {
    if (!text?.trim()) {
      setOutputText('')
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsTranslating(true)
    
    try {
      const sourceCode = LANG_MAP[sourceLang] || 'en'
      const targetCode = LANG_MAP[targetLang] || 'ko'
      
      if (sourceCode === targetCode) {
        setOutputText(text)
        setIsTranslating(false)
        return
      }
      
      let translatedText = ''
      const timeout = 5000
      
      // Google Translate API
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
        const response = await fetch(googleUrl, { signal: controller.signal })
        clearTimeout(timeoutId)
        
        if (response.ok && !abortControllerRef.current.signal.aborted) {
          const googleData = await response.json()
          if (googleData?.[0] && Array.isArray(googleData[0])) {
            const translated = googleData[0]
              .filter(item => item && Array.isArray(item) && item[0] && typeof item[0] === 'string')
              .map(item => item[0])
              .join('')
              .trim()
            if (translated && translated.length > 0 && translated !== text) {
              translatedText = translated
            }
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Google Translate error:', e)
        }
      }
      
      // MyMemory API fallback
      if (!translatedText && !abortControllerRef.current.signal.aborted) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)
          const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`
          const response = await fetch(myMemoryUrl, { signal: controller.signal })
          clearTimeout(timeoutId)
          
          if (response.ok && !abortControllerRef.current.signal.aborted) {
            const data = await response.json()
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
              let translated = data.responseData.translatedText
              translated = translated.replace(/^t\d+\//, '').replace(/<[^>]*>/g, '').trim()
              if (translated && translated !== text && translated.toUpperCase() !== text.toUpperCase()) {
                translatedText = translated
              }
            }
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error('MyMemory error:', e)
          }
        }
      }
      
      if (!abortControllerRef.current.signal.aborted) {
        setOutputText(translatedText || 'Translation failed. Please try again.')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Translation error:', error)
        if (!abortControllerRef.current.signal.aborted) {
          setOutputText('An error occurred during translation.')
        }
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsTranslating(false)
      }
    }
  }, [inputText, sourceLang, targetLang])

  // 실시간 자동 번역 (debounce)
  useEffect(() => {
    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current)
    }

    if (!inputText?.trim()) {
      setOutputText('')
      return
    }

    translateTimeoutRef.current = setTimeout(() => {
      handleTranslate(inputText)
    }, 500)

    return () => {
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current)
      }
    }
  }, [inputText, sourceLang, targetLang, handleTranslate])

  const handleSourceLangChange = useCallback((lang) => {
    isManualLangChangeRef.current = true
    setSourceLang(lang)
  }, [])

  const handleTargetLangChange = useCallback((lang) => {
    isManualLangChangeRef.current = true
    setTargetLang(lang)
  }, [])

  const handleInputChange = useCallback((text) => {
    setInputText(text)
    
    if (text?.trim()) {
      const detected = detectLanguage(text)
      if (detected === 'ko') {
        setSourceLang('ko')
        setTargetLang('en-CA')
      } else if (detected === 'en') {
        setSourceLang('en-CA')
        setTargetLang('ko')
      } else if (detected === 'zh') {
        setSourceLang('zh')
        setTargetLang('en-CA')
      }
    }
  }, [])

  return {
    inputText,
    outputText,
    sourceLang,
    targetLang,
    isTranslating,
    setInputText: handleInputChange,
    setSourceLang: handleSourceLangChange,
    setTargetLang: handleTargetLangChange,
    translate: handleTranslate,
  }
}

export default useTranslator
