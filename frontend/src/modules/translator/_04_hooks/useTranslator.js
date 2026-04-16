/**
 * useTranslator Hook
 * 번역 기능 훅
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { LANG_MAP, SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../_08_constants'
import { useLanguagePreferences } from '../../auth'
import { useGlossary } from '../../../shared/modules/glossary'
import { useUsage } from '../../../common/contexts/UsageContext'

/**
 * 언어 감지 함수
 */
export function detectLanguage(text) {
  if (!text?.trim()) return null
  
  const trimmedText = text.trim()
  const koreanMatches = trimmedText.match(/[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/g)
  const chineseMatches = trimmedText.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g)
  const englishMatches = trimmedText.match(/[A-Za-z]/g)
  
  const koreanCount = koreanMatches ? koreanMatches.length : 0
  const chineseCount = chineseMatches ? chineseMatches.length : 0
  const englishCount = englishMatches ? englishMatches.length : 0
  
  // Return the dominant language by character count
  const max = Math.max(koreanCount, chineseCount, englishCount)
  if (max === 0) return null
  
  if (koreanCount === max) return 'ko'
  if (chineseCount === max) return 'zh'
  if (englishCount === max) return 'en'
  
  return null
}

/**
 * 번역 훅
 */
export function useTranslator() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [sourceLang, setSourceLang] = useState('ko')
  const [targetLang, setTargetLang] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)
  
  // Track whether a translation is in progress to avoid race conditions
  const latestRequestIdRef = useRef(0)
  
  const translateTimeoutRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isManualLangChangeRef = useRef(false)

  // 공통 언어 설정 훅 사용
  const { nativeLanguage, targetLanguage, isLoaded } = useLanguagePreferences()
  
  // Glossary 훅 사용
  const { domain, setDomain, preProcess, postProcess } = useGlossary('general')

  // Usage tracking hook
  const { trackUsage } = useUsage()

  // Load language preferences from settings
  useEffect(() => {
    if (!isLoaded) return
    
    // Settings의 native_language → Translator의 Source Language (모국어로 입력)
    // Settings의 target_language → Translator의 Target Language (번역 대상)
    const isSourceSupported = SOURCE_LANGUAGES.some(l => l.code === nativeLanguage)
    const isTargetSupported = TARGET_LANGUAGES.some(l => l.code === targetLanguage)
    
    if (isSourceSupported) {
      setSourceLang(nativeLanguage)
    }
    if (isTargetSupported) {
      setTargetLang(targetLanguage)
    }
  }, [isLoaded, nativeLanguage, targetLanguage])

  // 입력 텍스트 변경 시 언어 자동 탐지
  useEffect(() => {
    // Skip auto-detection if user manually changed language (stays sticky until input cleared)
    if (isManualLangChangeRef.current) {
      return
    }
    
    if (!inputText?.trim()) {
      return
    }
    
    const detectedLang = detectLanguage(inputText)
    if (!detectedLang) return
    
    if (detectedLang === 'ko') {
      setSourceLang(prev => prev !== 'ko' ? 'ko' : prev)
      setTargetLang(prev => prev !== 'en' ? 'en' : prev)
    } else if (detectedLang === 'en') {
      setSourceLang(prev => prev !== 'en' ? 'en' : prev)
      setTargetLang(prev => prev !== 'ko' ? 'ko' : prev)
    } else if (detectedLang === 'zh') {
      setSourceLang(prev => prev !== 'zh' ? 'zh' : prev)
      setTargetLang(prev => prev !== 'en' ? 'en' : prev)
    }
  }, [inputText])

  const handleTranslate = useCallback(async (text = inputText) => {
    if (!text?.trim()) {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Invalidate pending results
      latestRequestIdRef.current++
      setOutputText('')
      setIsTranslating(false)
      return
    }

    const textToTranslate = text

    // Increment request ID to track latest request
    const requestId = ++latestRequestIdRef.current

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsTranslating(true)
    
    try {
      const sourceCode = LANG_MAP[sourceLang] || 'en'
      // Use textToTranslate (may be partial if frozen)
      const targetCode = LANG_MAP[targetLang] || 'ko'
      
      if (sourceCode === targetCode) {
        setOutputText(text)
        setIsTranslating(false)
        return
      }

      // 1. 번역 전 용어 보호
      const { processedText, termMap } = preProcess(textToTranslate, sourceCode, targetCode)
      
      let translatedText = ''
      const timeout = 5000
      
      // 2. Google Translate API (보호된 텍스트 번역)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(processedText)}`
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
            if (translated && translated.length > 0 && translated !== processedText) {
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
          const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(processedText)}&langpair=${sourceCode}|${targetCode}`
          const response = await fetch(myMemoryUrl, { signal: controller.signal })
          clearTimeout(timeoutId)
          
          if (response.ok && !abortControllerRef.current.signal.aborted) {
            const data = await response.json()
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
              let translated = data.responseData.translatedText
              translated = translated.replace(/^t\d+\//, '').replace(/<[^>]*>/g, '').trim()
              if (translated && translated !== processedText && translated.toUpperCase() !== processedText.toUpperCase()) {
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
      
      // Only update if this is still the latest request (prevents race conditions)
      if (!abortControllerRef.current.signal.aborted && requestId === latestRequestIdRef.current) {
        if (translatedText) {
          // 3. 번역 후 용어 복원
          const finalText = postProcess(translatedText, termMap)
          setOutputText(finalText)
          
          // Track usage - count characters in input text
          const charCount = text.length
          await trackUsage(charCount, 'translation')
        } else {
          setOutputText('Translation failed. Please try again.')
        }
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
  }, [inputText, sourceLang, targetLang, preProcess, postProcess, trackUsage])

  // 실시간 자동 번역 (debounce)
  useEffect(() => {
    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current)
    }

    if (!inputText?.trim()) {
      // Abort any in-flight request to prevent ghost results
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      latestRequestIdRef.current++
      setOutputText('')
      setIsTranslating(false)
      // Reset manual lang change flag so auto-detection works for new input
      isManualLangChangeRef.current = false
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
  }, [inputText, sourceLang, targetLang, domain, handleTranslate])

  const handleSourceLangChange = useCallback((lang) => {
    isManualLangChangeRef.current = true
    setSourceLang(lang)
    // If source and target become the same, auto-adjust target
    setTargetLang(prev => {
      if (lang === prev) {
        return lang === 'en' ? 'ko' : 'en'
      }
      return prev
    })
  }, [])

  const handleTargetLangChange = useCallback((lang) => {
    isManualLangChangeRef.current = true
    setTargetLang(lang)
    // If source and target become the same, auto-adjust source
    setSourceLang(prev => {
      if (lang === prev) {
        return lang === 'en' ? 'ko' : 'en'
      }
      return prev
    })
  }, [])

  const handleInputChange = useCallback((text) => {
    setInputText(text)
  }, [])

  return {
    inputText,
    outputText,
    sourceLang,
    targetLang,
    isTranslating,
    domain,
    setInputText: handleInputChange,
    setInputTextRaw: setInputText,  // Raw setter without language detection (for voice input)
    setSourceLang: handleSourceLangChange,
    setTargetLang: handleTargetLangChange,
    setDomain,
    translate: handleTranslate,
  }
}

export default useTranslator
