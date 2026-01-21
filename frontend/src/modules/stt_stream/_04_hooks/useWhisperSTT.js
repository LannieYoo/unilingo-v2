// useWhisperSTT - Whisper.cpp WebAssembly 기반 STT
// 10초 청크 + 2초 오버랩 방식으로 유실 방지
// 2026-01-17

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  transcribe,
  canUseWhisperWeb,
  resampleTo16Khz,
  downloadWhisperModel
} from '@remotion/whisper-web'

const CHUNK_DURATION = 10 // 10초
const OVERLAP_DURATION = 2 // 2초 오버랩
const SAMPLE_RATE = 16000

console.log('[WhisperSTT] Module loaded')

export function useWhisperSTT() {
  const [isRunning, setIsRunning] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [modelStatus, setModelStatus] = useState('idle') // idle, downloading, ready, error
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [stats, setStats] = useState({
    chunksProcessed: 0,
    totalDuration: 0
  })

  const mediaStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const processorRef = useRef(null)
  const audioBufferRef = useRef([])
  const isRecordingRef = useRef(false)
  const chunkTimerRef = useRef(null)
  const chunksProcessedRef = useRef(0)
  const lastChunkTextRef = useRef('')
  const modelRef = useRef('base.en') // tiny.en, base.en, small.en
  const isProcessingChunkRef = useRef(false) // 처리 중 플래그

  // 모델 다운로드
  const downloadModel = useCallback(async () => {
    try {
      setModelStatus('downloading')
      setDownloadProgress(0)

      const { supported, detailedReason } = await canUseWhisperWeb(modelRef.current)
      
      if (!supported) {
        throw new Error(`Whisper not supported: ${detailedReason}`)
      }

      console.log('[WhisperSTT] Downloading model:', modelRef.current)
      
      await downloadWhisperModel({
        model: modelRef.current,
        onProgress: ({ progress }) => {
          const pct = Math.round(progress * 100)
          setDownloadProgress(pct)
          console.log('[WhisperSTT] Download progress:', pct + '%')
        }
      })

      setModelStatus('ready')
      console.log('[WhisperSTT] Model ready')
      return true
    } catch (error) {
      console.error('[WhisperSTT] Model download failed:', error)
      setModelStatus('error')
      return false
    }
  }, [])

  // 오디오 캡처 시작
  const startAudioCapture = useCallback(async () => {
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: SAMPLE_RATE
        }
      })

      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)

      processorRef.current.onaudioprocess = (event) => {
        if (!isRecordingRef.current) return
        
        const audioData = event.inputBuffer.getChannelData(0)
        audioBufferRef.current.push(...audioData)
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)

      console.log('[WhisperSTT] Audio capture started')
      return true
    } catch (error) {
      console.error('[WhisperSTT] Audio capture failed:', error)
      return false
    }
  }, [])

  // 중복 텍스트 제거 (오버랩 처리)
  const removeDuplicateText = useCallback((newText, previousText) => {
    if (!previousText) return newText

    // 이전 텍스트의 마지막 몇 단어와 새 텍스트의 처음 몇 단어를 비교
    const prevWords = previousText.trim().split(/\s+/)
    const newWords = newText.trim().split(/\s+/)

    let overlapLength = 0
    const maxOverlap = Math.min(prevWords.length, newWords.length, 10) // 최대 10단어

    for (let i = 1; i <= maxOverlap; i++) {
      const prevEnd = prevWords.slice(-i).join(' ').toLowerCase()
      const newStart = newWords.slice(0, i).join(' ').toLowerCase()
      
      if (prevEnd === newStart) {
        overlapLength = i
      }
    }

    if (overlapLength > 0) {
      const uniqueWords = newWords.slice(overlapLength)
      console.log('[WhisperSTT] Removed', overlapLength, 'duplicate words')
      return uniqueWords.join(' ')
    }

    return newText
  }, [])

  // 청크 처리
  const processChunk = useCallback(async (audioData) => {
    if (audioData.length === 0) return

    // 이미 처리 중이면 스킵
    if (isProcessingChunkRef.current) {
      console.log('[WhisperSTT] Already processing, skipping chunk')
      return
    }

    try {
      isProcessingChunkRef.current = true
      setIsProcessing(true)
      console.log('[WhisperSTT] Processing chunk, samples:', audioData.length)

      // Float32Array를 Blob으로 변환
      const wavBlob = createWavBlob(audioData, SAMPLE_RATE)
      const file = new File([wavBlob], 'chunk.wav', { type: 'audio/wav' })

      // 리샘플링
      const channelWaveform = await resampleTo16Khz({
        file,
        onProgress: (p) => {
          console.log('[WhisperSTT] Resampling:', Math.round(p * 100) + '%')
        }
      })

      // 전사
      const { transcription } = await transcribe({
        channelWaveform,
        model: modelRef.current,
        onProgress: (p) => {
          console.log('[WhisperSTT] Transcribing:', Math.round(p * 100) + '%')
        }
      })

      const text = transcription.map(t => t.text).join(' ').trim()
      
      if (text) {
        // 중복 제거
        const uniqueText = removeDuplicateText(text, lastChunkTextRef.current)
        
        if (uniqueText) {
          console.log('[WhisperSTT] Chunk result:', uniqueText)
          setTranscript(prev => prev + (prev ? ' ' : '') + uniqueText)
          lastChunkTextRef.current = text
          chunksProcessedRef.current++
          setStats({
            chunksProcessed: chunksProcessedRef.current,
            totalDuration: chunksProcessedRef.current * CHUNK_DURATION
          })
        }
      }

      setIsProcessing(false)
      isProcessingChunkRef.current = false
    } catch (error) {
      console.error('[WhisperSTT] Chunk processing failed:', error)
      setIsProcessing(false)
      isProcessingChunkRef.current = false
    }
  }, [removeDuplicateText])

  // 청크 타이머
  const startChunkTimer = useCallback(() => {
    const processInterval = (CHUNK_DURATION - OVERLAP_DURATION) * 1000 // 8초마다

    console.log('[WhisperSTT] Starting chunk timer, interval:', processInterval + 'ms')

    chunkTimerRef.current = setInterval(() => {
      if (!isRecordingRef.current) {
        console.log('[WhisperSTT] Not recording, skipping chunk')
        return
      }

      // 이미 처리 중이면 스킵
      if (isProcessingChunkRef.current) {
        console.log('[WhisperSTT] Still processing previous chunk, skipping')
        return
      }

      const chunkSize = CHUNK_DURATION * SAMPLE_RATE // 10초
      const currentBuffer = [...audioBufferRef.current]

      console.log('[WhisperSTT] Timer tick, buffer size:', currentBuffer.length, 'required:', chunkSize)

      if (currentBuffer.length >= chunkSize) {
        // 10초 청크 추출
        const chunk = currentBuffer.slice(0, chunkSize)
        
        // 버퍼에서 8초 제거 (2초 오버랩 유지)
        const removeSize = (CHUNK_DURATION - OVERLAP_DURATION) * SAMPLE_RATE
        audioBufferRef.current = currentBuffer.slice(removeSize)

        console.log('[WhisperSTT] Processing chunk, size:', chunk.length)
        // 비동기 처리
        processChunk(new Float32Array(chunk))
      } else {
        console.log('[WhisperSTT] Buffer not ready yet, waiting...')
      }
    }, processInterval)

    console.log('[WhisperSTT] Chunk timer started')
  }, [processChunk])

  // 시작
  const start = useCallback(async () => {
    try {
      // 모델 확인
      if (modelStatus !== 'ready') {
        console.log('[WhisperSTT] Model not ready, downloading...')
        const success = await downloadModel()
        if (!success) {
          throw new Error('Model download failed')
        }
      }

      // 오디오 캡처 시작
      const captureStarted = await startAudioCapture()
      if (!captureStarted) {
        throw new Error('Audio capture failed')
      }

      // 녹음 시작
      audioBufferRef.current = []
      isRecordingRef.current = true
      chunksProcessedRef.current = 0
      lastChunkTextRef.current = ''
      
      startChunkTimer()
      setIsRunning(true)
      
      console.log('[WhisperSTT] Started')
      return true
    } catch (error) {
      console.error('[WhisperSTT] Start failed:', error)
      stop()
      return false
    }
  }, [modelStatus, downloadModel, startAudioCapture, startChunkTimer])

  // 정지
  const stop = useCallback(async () => {
    console.log('[WhisperSTT] Stopping...')
    
    isRecordingRef.current = false

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current)
      chunkTimerRef.current = null
    }

    // 현재 처리 중인 청크가 완료될 때까지 대기
    while (isProcessingChunkRef.current) {
      console.log('[WhisperSTT] Waiting for current chunk to finish...')
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 남은 버퍼 처리
    if (audioBufferRef.current.length > 0) {
      console.log('[WhisperSTT] Processing remaining buffer...')
      await processChunk(new Float32Array(audioBufferRef.current))
      audioBufferRef.current = []
    }

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    setIsRunning(false)
    console.log('[WhisperSTT] Stopped')
  }, [processChunk])

  const toggle = useCallback(async () => {
    if (isRunning) {
      await stop()
    } else {
      await start()
    }
  }, [isRunning, start, stop])

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        stop()
      }
    }
  }, [stop])

  return {
    start,
    stop,
    toggle,
    downloadModel,
    isRunning,
    isProcessing,
    transcript,
    interimTranscript: '', // Whisper는 interim 없음
    modelStatus,
    downloadProgress,
    stats,
    isRestarting: false,
    voskStatus: 'idle',
    voskProgress: 0
  }
}

// WAV 파일 생성 헬퍼
function createWavBlob(audioData, sampleRate) {
  const buffer = new ArrayBuffer(44 + audioData.length * 2)
  const view = new DataView(buffer)

  // WAV 헤더
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + audioData.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, audioData.length * 2, true)

  // 오디오 데이터
  let offset = 44
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
