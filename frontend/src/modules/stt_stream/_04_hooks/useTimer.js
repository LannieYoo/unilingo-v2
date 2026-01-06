/**
 * useTimer Hook
 * 실시간 구동 시간 추적 훅
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 시간을 MM:SS 형식으로 포맷
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 타이머 훅
 */
export function useTimer() {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)

  /**
   * 타이머 시작
   */
  const start = useCallback(() => {
    if (isRunning) return
    
    startTimeRef.current = Date.now() - (elapsedTime * 1000)
    setIsRunning(true)
    
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTimeRef.current) / 1000)
      setElapsedTime(elapsed)
    }, 1000)
  }, [isRunning, elapsedTime])

  /**
   * 타이머 중지
   */
  const stop = useCallback(() => {
    if (!isRunning) return
    
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isRunning])

  /**
   * 타이머 리셋
   */
  const reset = useCallback(() => {
    stop()
    setElapsedTime(0)
    startTimeRef.current = null
  }, [stop])

  /**
   * 타이머 토글
   */
  const toggle = useCallback(() => {
    if (isRunning) {
      stop()
    } else {
      start()
    }
  }, [isRunning, start, stop])

  // 클린업
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    isRunning,
    start,
    stop,
    reset,
    toggle
  }
}

export default useTimer