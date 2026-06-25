/**
 * useServerSpeechInput — Server-side Whisper STT Hook
 *
 * Captures microphone audio in the browser, sends small low-latency chunks
 * to a remote faster-whisper server via REST for transcription.
 * Used for accented English (Indian, etc.) where local SenseVoice struggles.
 *
 * Same interface as useWasmSpeechInput for drop-in compatibility.
 *
 * Audio pipeline:
 *   Microphone → Web Audio API (16kHz mono) → short buffer → WAV blob
 *   → POST /api/stt/transcribe → text response → onResult callback
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const SAMPLE_RATE = 16000

// ─── Client-side energy VAD ───────────────────────────────────
// Instead of cutting blindly every N seconds (which splits words mid-utterance
// and feeds Whisper garbled boundaries), we detect speech vs. silence by frame
// energy (RMS) and emit a segment only when the speaker pauses. This gives
// Whisper whole utterances → far better accuracy and cleaner translations.
const SPEECH_RMS_THRESHOLD = 0.015   // frame louder than this = speech
const SILENCE_HANGOVER_S = 0.6       // this much trailing silence ends a segment
const MIN_SEGMENT_S = 0.4            // drop anything shorter (noise blips)
const MAX_SEGMENT_S = 8              // safety cap: force-emit continuous speech
const PRE_ROLL_FRAMES = 2            // ~0.5s of audio kept before speech onset so
                                     // the first word isn't clipped
// Server URL — Whisper STT server
// Production: ngrok tunnel to Lannie Server (set VITE_WHISPER_SERVER_URL)
// Development: direct access to Lannie Server
const SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://192.168.1.150:8200'

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
  const isRunningRef = useRef(false)
  const serverQueueRef = useRef([])
  const isSendingRef = useRef(false)
  const sessionIdRef = useRef(0)

  // VAD state (per-frame, mutated inside onaudioprocess)
  const segmentFramesRef = useRef([])    // frames of the current utterance
  const segmentSamplesRef = useRef(0)    // sample count of current utterance
  const hasSpeechRef = useRef(false)     // has the current utterance seen speech?
  const silenceSamplesRef = useRef(0)    // trailing silence samples since last speech
  const preRollRef = useRef([])          // ring buffer of recent frames (pre-speech)

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

  const sendChunkToServer = useCallback(async (samples, sessionId = sessionIdRef.current) => {
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

      if (sessionId !== sessionIdRef.current) {
        return
      }

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

  const processServerQueue = useCallback(async () => {
    if (isSendingRef.current) return

    isSendingRef.current = true
    try {
      while (serverQueueRef.current.length > 0) {
        const item = serverQueueRef.current.shift()
        if (!item || item.sessionId !== sessionIdRef.current) continue
        await sendChunkToServer(item.samples, item.sessionId)
      }
    } finally {
      isSendingRef.current = false
    }
  }, [sendChunkToServer])

  // ─── Segment emission (VAD-driven) ────────────────────────────

  // Combine the current utterance's frames and queue it for the server, then
  // reset VAD state for the next utterance. Drops sub-MIN_SEGMENT_S blips.
  const emitSegment = useCallback(() => {
    const frames = segmentFramesRef.current
    const totalLength = segmentSamplesRef.current

    // Reset state up front so a slow send can't race the next utterance
    segmentFramesRef.current = []
    segmentSamplesRef.current = 0
    hasSpeechRef.current = false
    silenceSamplesRef.current = 0

    if (frames.length === 0) return
    if (totalLength < MIN_SEGMENT_S * SAMPLE_RATE) return

    const combined = new Float32Array(totalLength)
    let offset = 0
    for (const buf of frames) {
      combined.set(buf, offset)
      offset += buf.length
    }

    serverQueueRef.current.push({
      samples: combined,
      sessionId: sessionIdRef.current,
    })
    processServerQueue()
  }, [processServerQueue])

  // Feed one captured frame through the energy VAD. Accumulates speech (plus a
  // little pre-roll and trailing silence) and emits a segment on a real pause
  // or the safety cap.
  const processFrame = useCallback((samples) => {
    // Frame energy (RMS)
    let sumSq = 0
    for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i]
    const rms = Math.sqrt(sumSq / samples.length)
    const isSpeech = rms >= SPEECH_RMS_THRESHOLD

    // Maintain a small pre-roll ring buffer of the most recent frames
    preRollRef.current.push(samples)
    if (preRollRef.current.length > PRE_ROLL_FRAMES) preRollRef.current.shift()

    if (isSpeech) {
      if (!hasSpeechRef.current) {
        // Speech onset — seed the segment with the pre-roll so the first word
        // (already captured in the ring buffer) isn't clipped
        hasSpeechRef.current = true
        segmentFramesRef.current = [...preRollRef.current]
        segmentSamplesRef.current = preRollRef.current.reduce((s, f) => s + f.length, 0)
      } else {
        segmentFramesRef.current.push(samples)
        segmentSamplesRef.current += samples.length
      }
      silenceSamplesRef.current = 0
    } else if (hasSpeechRef.current) {
      // Trailing silence inside an utterance — keep it, but end the segment
      // once the pause is long enough
      segmentFramesRef.current.push(samples)
      segmentSamplesRef.current += samples.length
      silenceSamplesRef.current += samples.length
      if (silenceSamplesRef.current >= SILENCE_HANGOVER_S * SAMPLE_RATE) {
        emitSegment()
        return
      }
    }

    // Safety cap: force-emit very long continuous speech so latency stays bounded
    if (hasSpeechRef.current && segmentSamplesRef.current >= MAX_SEGMENT_S * SAMPLE_RATE) {
      emitSegment()
    }
  }, [emitSegment])

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
        processFrame(samples)
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
  }, [processFrame])

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
    serverQueueRef.current = []
    sessionIdRef.current += 1

    // Reset VAD state
    segmentFramesRef.current = []
    segmentSamplesRef.current = 0
    hasSpeechRef.current = false
    silenceSamplesRef.current = 0
    preRollRef.current = []

    const captureOk = await startAudioCapture()
    if (!captureOk) return false

    isRunningRef.current = true
    setIsListening(true)

    console.log(`[Server STT] Started (language: ${language}, VAD-segmented)`)
    return true
  }, [isListening, isAvailable, language, startAudioCapture])

  const stop = useCallback(() => {
    isRunningRef.current = false

    // Flush the final in-progress utterance, if any
    emitSegment()

    stopAudioCapture()
    setIsListening(false)
    setInterimTranscript('')
  }, [stopAudioCapture, emitSegment])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
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
