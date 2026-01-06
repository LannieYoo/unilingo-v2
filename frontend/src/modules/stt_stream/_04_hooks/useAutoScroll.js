/**
 * useAutoScroll Hook
 * 텍스트 영역 자동 스크롤
 */

import { useRef, useEffect, useState, useCallback } from 'react'

export function useAutoScroll(dependencies = []) {
  const containerRef = useRef(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef(null)

  // 자동 스크롤
  const scrollToBottom = useCallback(() => {
    if (containerRef.current && !isUserScrolling) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [isUserScrolling])

  // 의존성 변경 시 자동 스크롤
  useEffect(() => {
    scrollToBottom()
  }, [...dependencies, scrollToBottom])

  // 사용자 스크롤 감지
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    // 사용자가 위로 스크롤하면 자동 스크롤 일시 중지
    if (!isAtBottom) {
      setIsUserScrolling(true)
      
      // 3초 후 자동 스크롤 재개
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false)
      }, 3000)
    } else {
      setIsUserScrolling(false)
    }
  }, [])

  // 클린업
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return {
    containerRef,
    handleScroll,
    scrollToBottom,
    isUserScrolling
  }
}

export default useAutoScroll
