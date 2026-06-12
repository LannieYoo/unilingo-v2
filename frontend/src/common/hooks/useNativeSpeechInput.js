/**
 * useNativeSpeechInput
 * Capacitor native speech recognition hook for iOS and Android.
 * Uses the OS native STT engine (Siri on iOS, Gboard on Android).
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// Dynamic import to avoid errors on web
let SpeechRecognitionPlugin = null

async function loadPlugin() {
  if (!SpeechRecognitionPlugin) {
    try {
      const mod = await import('@capacitor-community/speech-recognition')
      SpeechRecognitionPlugin = mod.SpeechRecognition
    } catch {
      console.warn('[NativeSTT] speech-recognition plugin not available')
    }
  }
  return SpeechRecognitionPlugin
}

export function useNativeSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const listenerRef = useRef(null)
  const onResultRef = useRef(onResult)

  // Keep onResult ref fresh
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  // Check availability on mount
  useEffect(() => {
    let mounted = true
    loadPlugin().then(plugin => {
      if (plugin && mounted) {
        plugin.available().then(result => {
          if (mounted) setIsAvailable(result.available)
        }).catch(() => {
          if (mounted) setIsAvailable(false)
        })
      }
    })
    return () => { mounted = false }
  }, [])

  const start = useCallback(async () => {
    const plugin = await loadPlugin()
    if (!plugin) {
      setError(new Error('Speech recognition plugin not available'))
      return false
    }

    try {
      setError(null)

      // Request permissions
      const permResult = await plugin.requestPermissions()
      if (permResult.speechRecognition !== 'granted') {
        setError(new Error('Microphone permission denied'))
        return false
      }

      // Listen for partial results
      listenerRef.current = await plugin.addListener('partialResults', (data) => {
        if (data.matches && data.matches.length > 0) {
          const text = data.matches[0]
          setInterimTranscript(text)
          if (onResultRef.current) {
            onResultRef.current(text, false)
          }
        }
      })

      // Start listening
      await plugin.start({
        language: language,
        partialResults: true,
        popup: false,
      })

      setIsListening(true)
      return true
    } catch (err) {
      console.error('[NativeSTT] Start error:', err)
      setError(err)
      setIsListening(false)
      return false
    }
  }, [language])

  const stop = useCallback(async () => {
    const plugin = await loadPlugin()
    if (!plugin) return

    try {
      await plugin.stop()
    } catch (err) {
      console.error('[NativeSTT] Stop error:', err)
    }

    // Remove listener
    if (listenerRef.current) {
      listenerRef.current.remove()
      listenerRef.current = null
    }

    // The last interim result becomes the final transcript
    setTranscript(prev => {
      const finalText = prev + (interimTranscript ? ' ' + interimTranscript : '')
      if (interimTranscript && onResultRef.current) {
        onResultRef.current(interimTranscript, true) // final = true
      }
      return finalText.trim()
    })
    setInterimTranscript('')
    setIsListening(false)
  }, [interimTranscript])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        listenerRef.current.remove()
        listenerRef.current = null
      }
      loadPlugin().then(plugin => {
        if (plugin) plugin.stop().catch(() => {})
      })
    }
  }, [])

  return {
    start,
    stop,
    isListening,
    transcript,
    interimTranscript,
    error,
    isAvailable,
    // WASM-compatible fields (native STT has no model download)
    isModelLoading: false,
    modelLoadProgress: 1,
    modelLoadStage: null,
  }
}
