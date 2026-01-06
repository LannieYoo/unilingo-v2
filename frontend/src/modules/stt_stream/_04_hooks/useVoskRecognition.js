/**
 * useVoskRecognition Hook
 * Vosk 기반 실시간 STT 로직
 */

import { useRef, useEffect, useCallback } from 'react'
import { createModel } from 'vosk-browser'
import { useTranscriptStore, useDebugStore } from '../_05_stores'
import { addPunctuation } from '../_07_utils'
import { MODEL_URLS, STATUS, SAMPLE_RATE } from '../_08_constants'

export function useVoskRecognition() {
  const {
    selectedLang,
    status,
    setStatus,
    setLoadProgress,
    setIsSupported,
    setInterim,
    appendFinal
  } = useTranscriptStore()

  const debugStore = useDebugStore()

  // Refs
  const modelRef = useRef(null)
  const recognizerRef = useRef(null)
  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const processorRef = useRef(null)
  const isRunningRef = useRef(false)
  const isModelLoadedRef = useRef(false)

  // 지원 여부 확인
  useEffect(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    setIsSupported(supported)
    if (!supported) {
      debugStore.error('MediaDevices not supported')
    }
  }, [setIsSupported])

  // 모델 로드
  const loadModel = useCallback(async () => {
    if (isModelLoadedRef.current && modelRef.current) {
      debugStore.info('Model already loaded')
      return true
    }

    const modelUrl = MODEL_URLS[selectedLang]
    if (!modelUrl) {
      debugStore.error('Unsupported language', { lang: selectedLang })
      setStatus(STATUS.ERROR)
      return false
    }

    try {
      setStatus(STATUS.LOADING)
      debugStore.info('Loading Vosk model...', { lang: selectedLang, url: modelUrl })
      
      modelRef.current = await createModel(modelUrl, (progress) => {
        const pct = Math.round(progress * 100)
        debugStore.info('Model loading progress', { progress: pct })
        setLoadProgress(pct)
      })
      
      isModelLoadedRef.current = true
      debugStore.info('Vosk model loaded successfully')
      setStatus(STATUS.READY)
      return true
    } catch (error) {
      debugStore.error('Failed to load model', { error: error.message })
      setStatus(STATUS.ERROR)
      return false
    }
  }, [selectedLang, setStatus, setLoadProgress])

  // 언어 변경
  const setLanguage = useCallback(async (lang) => {
    const newLang = lang.split('-')[0]
    if (selectedLang === newLang) return
    
    useTranscriptStore.getState().setSelectedLang(newLang)
    isModelLoadedRef.current = false
    modelRef.current = null
    setStatus(STATUS.INIT)
    setLoadProgress(0)
    debugStore.info('Language changed, model needs reload', { lang: newLang })
  }, [selectedLang, setStatus, setLoadProgress])

  // 녹음 시작
  const start = useCallback(async () => {
    if (isRunningRef.current) {
      debugStore.warn('Already running')
      return false
    }

    if (!isModelLoadedRef.current) {
      const loaded = await loadModel()
      if (!loaded) return false
    }

    try {
      // 마이크 접근
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: SAMPLE_RATE
        }
      })

      // AudioContext 생성
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      
      // Recognizer 생성
      recognizerRef.current = new modelRef.current.KaldiRecognizer(SAMPLE_RATE)
      
      // 이벤트 핸들러 설정
      recognizerRef.current.on('result', (message) => {
        const text = message.result?.text
        if (text && text.trim()) {
          const punctuatedText = addPunctuation(text.trim(), selectedLang)
          debugStore.result('Final', { text: punctuatedText })
          appendFinal(punctuatedText)
          setInterim('')
        }
      })

      recognizerRef.current.on('partialresult', (message) => {
        const partial = message.result?.partial
        if (partial) {
          debugStore.result('Partial', { text: partial })
          setInterim(partial)
        }
      })

      // 오디오 처리
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      processorRef.current.onaudioprocess = (event) => {
        if (!isRunningRef.current || !recognizerRef.current) return
        try {
          recognizerRef.current.acceptWaveform(event.inputBuffer)
        } catch (error) {
          debugStore.error('acceptWaveform failed', { error: error.message })
        }
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)

      isRunningRef.current = true
      debugStore.info('Recording started')
      setStatus(STATUS.LISTENING)
      return true
    } catch (error) {
      debugStore.error('Failed to start recording', { error: error.message })
      setStatus(STATUS.ERROR)
      return false
    }
  }, [loadModel, setStatus, setInterim, appendFinal])

  // 녹음 중지
  const stop = useCallback(async () => {
    debugStore.info('Stopping...')
    isRunningRef.current = false

    // 마지막 결과 가져오기
    if (recognizerRef.current) {
      try {
        const finalResult = recognizerRef.current.retrieveFinalResult()
        if (finalResult?.text && finalResult.text.trim()) {
          const currentLang = useTranscriptStore.getState().selectedLang
          const punctuatedText = addPunctuation(finalResult.text.trim(), currentLang)
          debugStore.result('Final on stop', { text: punctuatedText })
          appendFinal(punctuatedText)
        }
      } catch (e) {
        debugStore.warn('Could not retrieve final result', { error: e.message })
      }
      
      recognizerRef.current.remove()
      recognizerRef.current = null
    }

    // 리소스 정리
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    setInterim('')
    debugStore.info('Stopped')
    setStatus(STATUS.STOPPED)
  }, [setStatus, setInterim, appendFinal])

  // 토글
  const toggle = useCallback(async () => {
    if (status === STATUS.LISTENING) {
      await stop()
    } else {
      await start()
    }
  }, [status, start, stop])

  // 리소스 해제
  const destroy = useCallback(() => {
    stop()
    if (modelRef.current) {
      modelRef.current.terminate()
      modelRef.current = null
    }
    isModelLoadedRef.current = false
  }, [stop])

  // 클린업
  useEffect(() => {
    return () => {
      destroy()
    }
  }, [])

  return {
    loadModel,
    start,
    stop,
    toggle,
    setLanguage,
    destroy,
    isRunning: status === STATUS.LISTENING,
    isLoading: status === STATUS.LOADING,
    isReady: status === STATUS.READY
  }
}

export default useVoskRecognition
