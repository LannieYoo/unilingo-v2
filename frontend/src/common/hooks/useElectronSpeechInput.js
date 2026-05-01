/**
 * useElectronSpeechInput
 * 
 * Electron desktop STT hook using sherpa-onnx (SenseVoice model).
 * Fully offline, no OS language pack or privacy setting needed.
 * 
 * Architecture:
 *   Renderer: Web Audio API captures mic → Float32 PCM chunks
 *   → IPC push-audio → Main process: sherpa-onnx processes audio
 *   → IPC speech:event → Renderer: updates React state
 * 
 * Supported languages: zh, en, ja, ko, yue (SenseVoice model)
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// Target sample rate for sherpa-onnx SenseVoice model
const TARGET_SAMPLE_RATE = 16000

/**
 * Start microphone capture using Web Audio API.
 * Downsamples to 16kHz mono and sends Float32 PCM via IPC.
 * 
 * @returns {{ stop: Function }} Cleanup object
 */
async function startMicCapture() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: TARGET_SAMPLE_RATE,
      echoCancellation: true,
      noiseSuppression: true,
    },
  })

  const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
  const source = audioCtx.createMediaStreamSource(stream)

  // ScriptProcessorNode for capturing PCM chunks
  // (AudioWorklet is more modern but requires separate file, ScriptProcessor works fine here)
  const bufferSize = 4096
  const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1)

  processor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0)

    // Send PCM Float32 to main process via IPC
    // Transfer as ArrayBuffer for efficiency
    const api = window.electronAPI?.speech
    if (api) {
      api.pushAudio(inputData.buffer.slice(0))
    }
  }

  source.connect(processor)
  processor.connect(audioCtx.destination)

  return {
    stop: () => {
      processor.disconnect()
      source.disconnect()
      audioCtx.close().catch(() => {})
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}

export function useElectronSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const onResultRef = useRef(onResult)
  const cleanupRef = useRef(null)
  const micRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const continuousRef = useRef(continuous)
  const stopRef = useRef(null)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    continuousRef.current = continuous
  }, [continuous])

  // Check availability on mount (model installed?)
  useEffect(() => {
    const api = window.electronAPI?.speech
    if (api) {
      api.isModelInstalled().then((installed) => {
        setIsAvailable(installed)
        if (!installed) {
          console.warn('[ElectronSTT] SenseVoice model not installed in electron/models/')
        }
      }).catch(() => setIsAvailable(false))
    }
  }, [])

  const start = useCallback(async () => {
    const api = window.electronAPI?.speech
    if (!api) {
      setError(new Error('Electron Speech API not available'))
      return false
    }

    try {
      setError(null)
      finalTranscriptRef.current = ''

      // Listen for speech events from main process
      cleanupRef.current = api.onEvent((data) => {
        switch (data.type) {
          case 'started':
            setIsListening(true)
            break

          case 'final':
            if (data.text?.trim()) {
              const text = data.text.trim()
              finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + text
              setTranscript(finalTranscriptRef.current)
              setInterimTranscript('')
              if (onResultRef.current) onResultRef.current(text, true)
              // Auto-stop after first result in non-continuous mode
              if (!continuousRef.current && stopRef.current) {
                setTimeout(() => stopRef.current(), 100)
              }
            }
            break

          case 'interim':
            if (data.text?.trim()) {
              setInterimTranscript(data.text.trim())
              if (onResultRef.current) onResultRef.current(data.text.trim(), false)
            }
            break

          case 'error':
            console.error('[ElectronSTT] Error:', data.message)
            setError(new Error(data.message))
            setIsListening(false)
            break

          case 'end':
          case 'stopped':
            setIsListening(false)
            setInterimTranscript('')
            break
        }
      })

      // Start sherpa-onnx recognizer in main process
      const result = await api.start(language)
      if (!result.success) {
        setError(new Error(result.error || 'Failed to start speech recognition'))
        return false
      }

      // Start microphone capture in renderer (Web Audio API)
      try {
        micRef.current = await startMicCapture()
      } catch (micErr) {
        console.error('[ElectronSTT] Mic error:', micErr)
        setError(new Error(`Microphone access denied: ${micErr.message}`))
        await api.stop()
        setIsListening(false)
        return false
      }

      return true
    } catch (err) {
      console.error('[ElectronSTT] Start failed:', err)
      setError(err)
      setIsListening(false)
      return false
    }
  }, [language])

  const stop = useCallback(async () => {
    // Stop microphone capture first
    if (micRef.current) {
      micRef.current.stop()
      micRef.current = null
    }

    // Stop sherpa-onnx recognizer
    const api = window.electronAPI?.speech
    if (api) await api.stop()

    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    setIsListening(false)
    setInterimTranscript('')
  }, [])

  // Keep stopRef in sync for event handler access
  useEffect(() => {
    stopRef.current = stop
  }, [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micRef.current) {
        micRef.current.stop()
        micRef.current = null
      }
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      window.electronAPI?.speech?.stop().catch(() => {})
    }
  }, [])

  // Stop when language changes
  useEffect(() => {
    if (isListening) stop()
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
