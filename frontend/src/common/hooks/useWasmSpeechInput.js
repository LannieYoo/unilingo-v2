/**
 * useWasmSpeechInput
 *
 * Browser-based STT using sherpa-onnx WASM + SenseVoice model.
 * Runs entirely in the browser via Web Worker — no server, no OS dependency.
 *
 * Features:
 *   - Identical interface to useWebSpeechInput (fallback engine)
 *   - Model auto-download with progress reporting (cached in IndexedDB)
 *   - Silero VAD for voice activity detection
 *   - Korean spacing fix
 *   - 16kHz mono PCM capture via Web Audio API
 *
 * Usage:
 *   const { start, stop, isListening, transcript, error, isAvailable,
 *           isModelLoading, modelLoadProgress } = useWasmSpeechInput({
 *     language: 'ko-KR',
 *     onResult: (text, isFinal) => console.log(text),
 *   })
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// Models are now bundled in the WASM .data file — no separate downloads needed

export function useWasmSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadProgress, setModelLoadProgress] = useState(0)
  const [modelLoadStage, setModelLoadStage] = useState('')

  const workerRef = useRef(null)
  const audioContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const onResultRef = useRef(onResult)
  const isReadyRef = useRef(false)
  const finalTranscriptRef = useRef('')

  // Check WASM availability (starts as static check, set to false on fatal init error)
  const [isAvailable, setIsAvailable] = useState(
    typeof window !== 'undefined'
    && typeof WebAssembly !== 'undefined'
    && (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined')
  )

  // Keep onResult ref fresh
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  // ─── Worker Management ─────────────────────────────────────

  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current

    const worker = new Worker(
      new URL('../workers/sttWasmWorker.js', import.meta.url)
    )

    worker.onmessage = (event) => {
      const msg = event.data

      switch (msg.type) {
        case 'model-loading':
          setIsModelLoading(true)
          setModelLoadProgress(msg.progress)
          setModelLoadStage(msg.stage)
          break

        case 'ready':
          isReadyRef.current = true
          setIsModelLoading(false)
          setModelLoadProgress(1)
          console.log('[WASM STT] Model ready')
          break

        case 'started':
          setIsListening(true)
          break

        case 'final':
          if (msg.text && msg.text.trim()) {
            const text = msg.text.trim()
            if (continuous) {
              finalTranscriptRef.current += text + ' '
              setTranscript(finalTranscriptRef.current.trim())
            } else {
              setTranscript(text)
            }
            if (onResultRef.current) {
              onResultRef.current(text, true, msg.forcedSplit || false)
            }
          }
          break

        case 'interim':
          if (msg.text) {
            setInterimTranscript(msg.text)
            if (onResultRef.current) {
              onResultRef.current(msg.text, false)
            }
          }
          break

        case 'end':
          setIsListening(false)
          setInterimTranscript('')
          break

        case 'error':
          console.error('[WASM STT] Worker error:', msg.message)
          setError(new Error(msg.message))
          setIsModelLoading(false)
          // Fatal initialization error - mark as unavailable for fallback
          if (!isReadyRef.current) {
            console.warn('[WASM STT] Init failed, marking as unavailable for fallback')
            setIsAvailable(false)
          }
          break
      }
    }

    worker.onerror = (err) => {
      console.error('[WASM STT] Worker crashed:', err)
      setError(new Error('STT worker crashed'))
      setIsListening(false)
      setIsModelLoading(false)
    }

    workerRef.current = worker
    return worker
  }, [continuous])

  // Initialize worker and load model on mount
  useEffect(() => {
    if (!isAvailable) return

    const worker = initWorker()
    worker.postMessage({
      type: 'init',
      wasmBaseUrl: window.location.origin + '/',
      language,
    })

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      isReadyRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Audio Capture ─────────────────────────────────────────

  const startAudioCapture = useCallback(async () => {
    try {
      console.log('[WASM STT] Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream
      console.log('[WASM STT] Microphone access granted')

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContextCtor({ sampleRate: 16000 })
      audioContextRef.current = audioContext
      console.log('[WASM STT] AudioContext created, sampleRate:', audioContext.sampleRate)

      const source = audioContext.createMediaStreamSource(stream)

      // Use ScriptProcessorNode for wider compatibility
      // (AudioWorklet is better but requires more setup)
      const bufferSize = 4096
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

      let audioChunkCount = 0
      processor.onaudioprocess = (e) => {
        if (!isReadyRef.current || !workerRef.current) return

        const inputData = e.inputBuffer.getChannelData(0)
        // Copy the data (can't transfer AudioBuffer data)
        const samples = new Float32Array(inputData.length)
        samples.set(inputData)

        audioChunkCount++
        if (audioChunkCount % 20 === 1) {
          console.log(`[WASM STT] Sending audio chunk #${audioChunkCount}, samples: ${samples.length}`)
        }

        workerRef.current.postMessage(
          { type: 'audio', samples },
          [samples.buffer] // Transfer ownership for performance
        )
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      workletNodeRef.current = processor
      console.log('[WASM STT] Audio capture pipeline ready')

      return true
    } catch (err) {
      console.error('[WASM STT] Audio capture error:', err)
      setError(new Error('Microphone access denied or unavailable'))
      return false
    }
  }, [])

  const stopAudioCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // ─── Public API ────────────────────────────────────────────

  const start = useCallback(async () => {
    console.log('[WASM STT] start() called', {
      isAvailable,
      isListening,
      isModelLoading,
      isReadyRef: isReadyRef.current,
      hasWorker: !!workerRef.current,
      language,
    })

    if (!isAvailable) {
      console.warn('[WASM STT] Not available')
      setError(new Error('WASM STT not available'))
      return false
    }

    if (isListening) {
      console.log('[WASM STT] Already listening')
      return true
    }

    // Wait for model to be ready
    if (!isReadyRef.current) {
      console.warn('[WASM STT] Model not ready, isModelLoading:', isModelLoading)
      // Model still loading, try init again
      if (!isModelLoading && workerRef.current) {
        console.log('[WASM STT] Re-sending init message')
        workerRef.current.postMessage({
          type: 'init',
          wasmBaseUrl: window.location.origin + '/',
          language,
        })
      }
      setError(new Error('Model is still loading. Please wait.'))
      return false
    }

    setError(null)
    finalTranscriptRef.current = ''

    // Start audio capture
    console.log('[WASM STT] Starting audio capture...')
    const captureOk = await startAudioCapture()
    console.log('[WASM STT] Audio capture result:', captureOk)
    if (!captureOk) return false

    // Tell worker to start recognition
    console.log('[WASM STT] Sending start to worker')
    workerRef.current.postMessage({ type: 'start', language })
    return true
  }, [isAvailable, isListening, isModelLoading, language, startAudioCapture])

  const stop = useCallback(() => {
    stopAudioCapture()
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' })
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [stopAudioCapture])

  // Stop when language changes
  useEffect(() => {
    if (isListening) {
      stop()
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture()
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' })
      }
    }
  }, [stopAudioCapture])

  return {
    start,
    stop,
    isListening,
    transcript,
    interimTranscript,
    error,
    isAvailable,
    // WASM-specific extras
    isModelLoading,
    modelLoadProgress,
    modelLoadStage,
  }
}
