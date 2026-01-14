/**
 * useAutoScroll Hook
 * 텍스트 영역 자동 스크롤
 * 
 * - 기본적으로 맨 아래로 자동 스크롤
 * - 사용자가 위로 스크롤하면 자동 스크롤 중지
 * - 사용자가 다시 맨 아래로 스크롤하면 자동 스크롤 재개
 */

import { useRef, useEffect, useState, useCallback } from 'react'

export function useAutoScroll(dependencies = []) {
  const containerRef = useRef(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)

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
    // 맨 아래에서 50px 이내면 "맨 아래"로 간주
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    // 사용자가 위로 스크롤하면 자동 스크롤 중지
    // 사용자가 맨 아래로 스크롤하면 자동 스크롤 재개
    setIsUserScrolling(!isAtBottom)
  }, [])

  return {
    containerRef,
    handleScroll,
    scrollToBottom,
    isUserScrolling
  }
}

export default useAutoScroll
