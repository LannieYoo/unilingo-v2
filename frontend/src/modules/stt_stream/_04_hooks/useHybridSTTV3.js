// useHybridSTTV3 - 완전히 새로운 파일 (캐시 우회)
// 2026-01-17 16:00

import { useState, useRef, useCallback, useEffect } from 'react'
import { WebSpeechManagerV3 } from '../_07_utils/WebSpeechManagerV3'
import { addPunctuation } from '../_07_utils/textFormatter'

console.log('[HybridSTTV3] Module loaded - 2026-01-17 16:00')

export function useHybridSTTV3() {
  const [isRunning, setIsRunning] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isRestarting, setIsRestarting] = useState(false)
  const [stats, setStats] = useState({
    restartCount: 0,
    totalSegments: 0
  })

  const webSpeechRef = useRef(null)
  const segmentCountRef = useRef(0)

  const updateStats = useCallback(() => {
    const restartCount = webSpeechRef.current?.getRestartCount() || 0
    setStats({
      restartCount,
      totalSegments: segmentCountRef.current
    })
  }, [])

  const start = useCallback(async () => {
    try {
      console.log('[HybridSTTV3] Starting...')

      webSpeechRef.current = new WebSpeechManagerV3('en-US', {
        onResult: (text, isFinal) => {
          if (isFinal) {
            const textWithPunctuation = addPunctuation(text, 'en')
            console.log('[HybridSTTV3] FINAL:', textWithPunctuation)
            setTranscript(prev => {
              const newTranscript = prev + textWithPunctuation + ' '
              console.log('[HybridSTTV3] Transcript length:', newTranscript.length)
              return newTranscript
            })
            setInterimTranscript('')
            segmentCountRef.current++
            updateStats()
          } else {
            console.log('[HybridSTTV3] INTERIM:', text)
            setInterimTranscript(text)
          }
        },
        onRestart: (restartCount, savedInterim) => {
          console.log('[HybridSTTV3] RESTART #' + restartCount + ', savedInterim:', savedInterim)
          
          setIsRestarting(true)
          setTimeout(() => setIsRestarting(false), 1000)
          
          if (savedInterim && savedInterim.trim()) {
            const textWithPunctuation = addPunctuation(savedInterim.trim(), 'en')
            console.log('[HybridSTTV3] SAVING INTERIM:', textWithPunctuation)
            setTranscript(prev => {
              const newTranscript = prev + textWithPunctuation + ' '
              console.log('[HybridSTTV3] After saving interim, length:', newTranscript.length)
              return newTranscript
            })
            segmentCountRef.current++
          } else {
            console.log('[HybridSTTV3] No interim to save')
          }
          
          setInterimTranscript('')
          updateStats()
        },
        onError: (error) => {
          console.error('[HybridSTTV3] Error:', error)
        }
      })

      await webSpeechRef.current.start()
      setIsRunning(true)
      console.log('[HybridSTTV3] Started')
      
      return true
    } catch (error) {
      console.error('[HybridSTTV3] Start failed:', error)
      stop()
      return false
    }
  }, [updateStats])

  const stop = useCallback(() => {
    console.log('[HybridSTTV3] Stopping')
    
    if (webSpeechRef.current) {
      webSpeechRef.current.stop()
      webSpeechRef.current = null
    }

    setIsRunning(false)
  }, [])

  const toggle = useCallback(async () => {
    if (isRunning) {
      stop()
    } else {
      await start()
    }
  }, [isRunning, start, stop])

  useEffect(() => {
    return () => {
      if (webSpeechRef.current) {
        webSpeechRef.current.stop()
      }
    }
  }, [])

  return {
    start,
    stop,
    toggle,
    isRunning,
    isRestarting,
    transcript,
    interimTranscript,
    voskStatus: 'idle',
    voskProgress: 0,
    stats
  }
}
