/**
 * useWebSpeechInput
 * Web Speech API based speech recognition hook.
 * Used on desktop (Electron/browser) where Web Speech API is stable.
 * Falls back gracefully if not supported.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export function useWebSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)
  const idleTimerRef = useRef(null)
  const finalTranscriptRef = useRef('')

  const isAvailable = typeof window !== 'undefined'
    && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Keep onResult ref fresh
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const resetIdleTimer = useCallback(() => {
    clearIdleTimer()
    if (continuous) {
      idleTimerRef.current = setTimeout(() => {
        // Stop after 20s of silence in continuous mode
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }, 20000)
    }
  }, [continuous, clearIdleTimer])

  // Post-process: add punctuation to recognized text
  const addPunctuation = useCallback((text) => {
    if (!text) return text
    let t = text.trim()

    // Korean: insert period + space between merged sentences
    t = t.replace(
      /(니다|세요|어요|해요|에요|거야|잖아|네요|구나|할게|래요|한다|인데|거든|겠어|죠|지요|어라|구요|군요|듯요)(?=[가-힣])/g,
      '$1. '
    )

    // Chinese: insert period between merged sentences
    t = t.replace(/(了|的|吗|呢|吧|啊|哦|啦|呀|么)(?=[\u4e00-\u9fff])/g, '$1。')

    // Capitalize first letter (for English)
    t = t.charAt(0).toUpperCase() + t.slice(1)

    // Add period if sentence doesn't end with punctuation
    if (t && !/[.!?。！？，,;:]$/.test(t)) {
      t += '.'
    }
    return t
  }, [])

  const start = useCallback(() => {
    if (!isAvailable) {
      setError(new Error('Web Speech API not supported'))
      return false
    }

    if (isListening) {
      return true // Already listening
    }

    try {
      setError(null)
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognitionCtor()
      recognitionRef.current = recognition

      recognition.lang = language
      recognition.interimResults = true
      recognition.continuous = continuous
      recognition.maxAlternatives = 1

      finalTranscriptRef.current = ''

      recognition.onstart = () => {
        setIsListening(true)
        resetIdleTimer()
      }

      recognition.onresult = (event) => {
        resetIdleTimer()
        let interim = ''
        let finalText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            const punctuated = continuous ? addPunctuation(result[0].transcript) : result[0].transcript
            if (punctuated && punctuated.trim()) {
              finalText += punctuated + ' '
            }
          } else {
            interim += result[0].transcript
          }
        }

        if (finalText.trim()) {
          finalTranscriptRef.current += finalText
          setTranscript(finalTranscriptRef.current.trim())
          if (onResultRef.current) {
            onResultRef.current(finalText.trim(), true)
          }
        }

        if (interim.trim()) {
          setInterimTranscript(interim)
          if (onResultRef.current) {
            onResultRef.current(interim, false)
          }
        }
      }

      recognition.onerror = (event) => {
        console.error('[WebSpeech] Error:', event.error)
        clearIdleTimer()

        if (event.error === 'not-allowed') {
          setError(new Error('Microphone access denied'))
          setIsListening(false)
          recognitionRef.current = null
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          setError(new Error(`Speech recognition error: ${event.error}`))
        }
      }

      recognition.onend = () => {
        clearIdleTimer()
        setIsListening(false)
        setInterimTranscript('')
        recognitionRef.current = null
      }

      recognition.start()
      return true
    } catch (err) {
      console.error('[WebSpeech] Start failed:', err)
      setError(err)
      setIsListening(false)
      return false
    }
  }, [isAvailable, isListening, language, continuous, resetIdleTimer, clearIdleTimer, addPunctuation])

  const stop = useCallback(() => {
    clearIdleTimer()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (err) {
        console.error('[WebSpeech] Stop error:', err)
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [clearIdleTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearIdleTimer()
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null
      }
    }
  }, [clearIdleTimer])

  // Stop when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      stop()
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    start,
    stop,
    isListening,
    transcript,
    interimTranscript,
    error,
    isAvailable,
  }
}
