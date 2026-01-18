// useHybridSTT - Web Speech API Only (No Vosk Backup)
// English 모드 전용: Web Speech API 단독 사용 (자동 재시작)
//
// 텍스트 유실 방지 전략:
// 1. Web Speech API는 브라우저가 자동으로 마지막 interim을 final로 변환
// 2. 200ms 재시작 딜레이로 브라우저가 final 결과를 전달할 시간 확보
// 3. sessionStartIndex로 중복 결과 방지
// 4. final 결과만 transcript에 누적하여 안정성 확보

import { useState, useRef, useCallback } from 'react'
import { WebSpeechManager } from '../_07_utils/WebSpeechManager'
import { addPunctuation } from '../_07_utils/textFormatter'

export function useHybridSTT() {
  const [isRunning, setIsRunning] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [stats, setStats] = useState({
    restartCount: 0,
    totalSegments: 0
  })

  const webSpeechRef = useRef(null)
  const startTimeRef = useRef(null)
  const segmentCountRef = useRef(0)
  const lastFinalTextRef = useRef('') // 마지막 final 텍스트 추적 (중복 방지)

  const start = useCallback(async () => {
    try {
      webSpeechRef.current = new WebSpeechManager('en-US', {
        onResult: (text, isFinal) => {
          if (isFinal) {
            // 중복 방지: 같은 텍스트가 연속으로 오면 무시
            if (text === lastFinalTextRef.current) {
              console.log('[Hybrid STT] Duplicate final text ignored:', text)
              return
            }
            
            lastFinalTextRef.current = text
            const textWithPunctuation = addPunctuation(text, 'en')
            setTranscript(prev => prev + textWithPunctuation + ' ')
            setInterimTranscript('')
            segmentCountRef.current++
            updateStats()
            
            console.log('[Hybrid STT] Final text added:', textWithPunctuation)
          } else {
            // Interim 결과는 실시간 표시만 (transcript에 추가하지 않음)
            setInterimTranscript(text)
          }
        },
        onRestart: (restartCount) => {
          console.log('[WebSpeech] Auto-restarted, count:', restartCount)
          // 재시작 시 마지막 final 텍스트 초기화 (새 세션 시작)
          lastFinalTextRef.current = ''
          updateStats()
        },
        onError: (error) => {
          console.error('[WebSpeech] Error:', error)
        }
      })

      await webSpeechRef.current.start()
      startTimeRef.current = Date.now()
      setIsRunning(true)
      
      return true

    } catch (error) {
      console.error('Failed to start Web Speech API:', error)
      stop()
      return false
    }
  }, [])

  const stop = useCallback(() => {
    if (webSpeechRef.current) {
      webSpeechRef.current.stop()
      webSpeechRef.current = null
    }

    lastFinalTextRef.current = ''
    setIsRunning(false)
  }, [])

  const toggle = useCallback(async () => {
    if (isRunning) {
      stop()
    } else {
      await start()
    }
  }, [isRunning, start, stop])

  const updateStats = useCallback(() => {
    const restartCount = webSpeechRef.current?.getRestartCount() || 0
    
    setStats({
      restartCount,
      totalSegments: segmentCountRef.current
    })
  }, [])

  return {
    start,
    stop,
    toggle,
    isRunning,
    transcript,
    interimTranscript,
    stats
  }
}
