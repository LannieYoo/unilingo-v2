/**
 * useTTS hook
 * Web Speech API를 사용한 텍스트 음성 변환
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentLang, setCurrentLang] = useState(null)
  const [availableVoices, setAvailableVoices] = useState([])
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const utteranceRef = useRef(null)

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        setAvailableVoices(voices)
        setVoicesLoaded(true)
        console.log('TTS voices loaded:', voices.length, 'voices available')
      }
    }

    // Try to load voices immediately
    loadVoices()
    
    // Also listen for voiceschanged event (needed in Chrome)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const speak = useCallback((text, lang = 'en-US') => {
    if (!text?.trim()) return

    console.log('TTS speak called with lang:', lang, 'text length:', text.length)

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }

    const doSpeak = () => {
      // Get fresh voices list
      const voices = window.speechSynthesis.getVoices()
      
      if (voices.length === 0) {
        console.warn('No voices available yet, retrying...')
        setTimeout(doSpeak, 100)
        return
      }

      const langPrefix = lang.split('-')[0] // e.g., 'ko' from 'ko-KR'
      
      // Find voice that matches the language (prefer exact match, then prefix match, then any variant)
      let matchingVoice = voices.find(voice => voice.lang === lang)
      if (!matchingVoice) {
        matchingVoice = voices.find(voice => voice.lang.startsWith(langPrefix))
      }
      // For Chinese, try other variants (zh-CN, zh-TW, zh-HK)
      if (!matchingVoice && langPrefix === 'zh') {
        matchingVoice = voices.find(voice => voice.lang.startsWith('zh'))
      }
      
      // Check if voice is available
      if (!matchingVoice) {
        console.warn('✗ No matching voice found for:', lang)
        console.log('Available languages:', [...new Set(voices.map(v => v.lang))].sort())
        
        // Show user-friendly warning
        const langNames = {
          'zh': 'Chinese',
          'ko': 'Korean',
          'ja': 'Japanese',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'ar': 'Arabic',
          'hi': 'Hindi',
          'en': 'English'
        }
        const langName = langNames[langPrefix] || lang
        
        alert(
          `⚠️ ${langName} voice is not available on your system.\n\n` +
          `To enable ${langName} text-to-speech:\n` +
          `1. Open Windows Settings\n` +
          `2. Go to Time & Language > Language & Region\n` +
          `3. Add ${langName} language\n` +
          `4. Download the speech pack\n` +
          `5. Restart your browser\n\n` +
          `Available voices: ${[...new Set(voices.map(v => v.lang.split('-')[0]))].join(', ')}`
        )
        return
      }

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      utterance.voice = matchingVoice
      
      console.log('✓ Using voice:', matchingVoice.name, '(', matchingVoice.lang, ') for requested lang:', lang)

      utterance.onstart = () => {
        console.log('TTS started speaking in', lang)
        setIsSpeaking(true)
        setCurrentLang(lang)
      }

      utterance.onend = () => {
        console.log('TTS finished speaking')
        setIsSpeaking(false)
        setCurrentLang(null)
      }

      utterance.onerror = (event) => {
        console.error('TTS Error:', event.error, 'for language:', lang)
        setIsSpeaking(false)
        setCurrentLang(null)
        
        // Show error to user
        if (event.error === 'not-allowed' || event.error === 'canceled') {
          // User canceled or browser blocked - don't show error
          return
        }
        alert(`Failed to play audio: ${event.error}`)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    // Small delay to ensure everything is ready
    setTimeout(doSpeak, 50)
  }, [])

  const stop = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setCurrentLang(null)
    }
  }, [])

  const isSupported = 'speechSynthesis' in window

  return {
    speak,
    stop,
    isSpeaking,
    currentLang,
    isSupported,
    availableVoices,
    voicesLoaded,
  }
}
