/**
 * useServerSpeechInput — Server-side Whisper STT Hook
 *
 * Captures microphone audio in the browser, sends 3-second chunks
 * to a remote faster-whisper server via REST for transcription.
 * Used for accented English (Indian, etc.) where local SenseVoice struggles.
 *
 * Same interface as useWasmSpeechInput for drop-in compatibility.
 *
 * Audio pipeline:
 *   Microphone → Web Audio API (16kHz mono) → 3s buffer → WAV blob
 *   → POST /api/stt/transcribe → text response → onResult callback
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const SAMPLE_RATE = 16000
const CHUNK_DURATION_S = 3  // Send audio every 3 seconds
const CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION_S
// Server URL — RAG Linux server
const SERVER_URL = 'http://192.168.1.150:8200'

export function useServerSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const [isAvailable, setIsAvailable] = useState(true)

  const audioContextRef = useRef(null)
  const workletNodeRef = useRef(null)
  const streamRef = useRef(null)
  const onResultRef = useRef(onResult)
  const finalTranscriptRef = useRef('')
  const audioBufferRef = useRef([])  // Accumulates Float32 samples
  const isRunningRef = useRef(false)
  const flushTimerRef = useRef(null)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  // ─── Check server availability on mount ───────────────────────

  useEffect(() => {
    fetch(`${SERVER_URL}/api/stt/health`, { mode: 'cors' })
      .then(res => res.json())
      .then(data => {
        setIsAvailable(data.status === 'ok' && data.ready)
        if (!data.ready) {
          console.warn('[Server STT] Model not ready yet')
        }
      })
      .catch(() => {
        console.warn('[Server STT] Server not reachable')
        setIsAvailable(false)
      })
  }, [])

  // ─── WAV Encoding ─────────────────────────────────────────────

  const encodeWav = useCallback((samples) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)           // Subchunk1Size
    view.setUint16(20, 1, true)            // PCM format
    view.setUint16(22, 1, true)            // Mono
    view.setUint32(24, SAMPLE_RATE, true)  // Sample rate
    view.setUint32(28, SAMPLE_RATE * 2, true)  // Byte rate
    view.setUint16(32, 2, true)            // Block align
    view.setUint16(34, 16, true)           // Bits per sample
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)

    // Convert float32 to int16
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }, [])

  // ─── Send chunk to server ─────────────────────────────────────

  const sendChunkToServer = useCallback(async (samples) => {
    if (samples.length < SAMPLE_RATE * 0.3) return  // Skip < 0.3s

    // Skip silent chunks — Whisper hallucinates on silence ('you you you')
    let sumSq = 0
    for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i]
    const rms = Math.sqrt(sumSq / samples.length)
    if (rms < 0.01) {
      console.log(`[Server STT] Skipping silent chunk (RMS: ${rms.toFixed(4)})`)
      return
    }

    const wavBlob = encodeWav(samples)
    const formData = new FormData()
    formData.append('audio', wavBlob, 'chunk.wav')

    // Send base language code to Whisper (e.g., 'en-US' → 'en', 'ko-KR' → 'ko')
    const langCode = language.split('-')[0] || 'en'
    formData.append('language', langCode)

    try {
      const response = await fetch(`${SERVER_URL}/api/stt/transcribe`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const result = await response.json()

      if (result.text && result.text.trim()) {
        const text = result.text.trim()
        console.log(`[Server STT] Recognized: "${text}" (${result.duration}s → ${result.processing_time}s)`)

        if (continuous) {
          finalTranscriptRef.current += text + ' '
          setTranscript(finalTranscriptRef.current.trim())
        } else {
          setTranscript(text)
        }

        if (onResultRef.current) {
          onResultRef.current(text, true)
        }
      }
    } catch (err) {
      console.error('[Server STT] Request failed:', err)
      // Don't set error state for transient failures — just skip this chunk
    }
  }, [language, continuous, encodeWav])

  // ─── Periodic flush ───────────────────────────────────────────

  const flushBuffer = useCallback(() => {
    if (audioBufferRef.current.length === 0) return

    // Combine all buffered samples
    const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0)
    const combined = new Float32Array(totalLength)
    let offset = 0
    for (const buf of audioBufferRef.current) {
      combined.set(buf, offset)
      offset += buf.length
    }
    audioBufferRef.current = []

    // Send to server (async, don't await)
    sendChunkToServer(combined)
  }, [sendChunkToServer])

  // ─── Audio Capture ────────────────────────────────────────────

  const startAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContextCtor({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const bufferSize = 4096
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

      processor.onaudioprocess = (e) => {
        if (!isRunningRef.current) return
        const inputData = e.inputBuffer.getChannelData(0)
        const samples = new Float32Array(inputData.length)
        samples.set(inputData)
        audioBufferRef.current.push(samples)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
      workletNodeRef.current = processor

      console.log('[Server STT] Audio capture ready')
      return true
    } catch (err) {
      console.error('[Server STT] Audio capture error:', err)
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
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ─── Public API ───────────────────────────────────────────────

  const start = useCallback(async () => {
    if (isListening) return true
    if (!isAvailable) {
      setError(new Error('Server Whisper not available'))
      return false
    }

    setError(null)
    finalTranscriptRef.current = ''
    audioBufferRef.current = []

    const captureOk = await startAudioCapture()
    if (!captureOk) return false

    isRunningRef.current = true
    setIsListening(true)

    // Start periodic flush timer (every CHUNK_DURATION_S seconds)
    flushTimerRef.current = setInterval(flushBuffer, CHUNK_DURATION_S * 1000)

    console.log(`[Server STT] Started (language: ${language}, chunk: ${CHUNK_DURATION_S}s)`)
    return true
  }, [isListening, isAvailable, language, startAudioCapture, flushBuffer])

  const stop = useCallback(() => {
    isRunningRef.current = false

    // Stop timer
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current)
      flushTimerRef.current = null
    }

    // Flush remaining audio
    flushBuffer()

    stopAudioCapture()
    setIsListening(false)
    setInterimTranscript('')
  }, [stopAudioCapture, flushBuffer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current)
      }
      stopAudioCapture()
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
    // Server-specific extras
    isModelLoading: false,
    modelLoadProgress: 1,
    modelLoadStage: 'Server Whisper',
  }
}
