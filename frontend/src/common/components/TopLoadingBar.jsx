/**
 * TopLoadingBar - 페이지 상단 로딩 프로그레스 바
 * NProgress 스타일의 얇은 로딩바
 */

import { useEffect, useState } from 'react'
import './TopLoadingBar.css'

export function TopLoadingBar({ isLoading }) {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true)
      setProgress(0)
      
      // 시작 시 빠르게 30%까지
      const timer1 = setTimeout(() => setProgress(30), 100)
      
      // 그 다음 천천히 70%까지
      const timer2 = setTimeout(() => setProgress(70), 500)
      
      // 90%까지 천천히
      const timer3 = setTimeout(() => setProgress(90), 1000)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    } else {
      // 완료 시 100%로 채우고 페이드아웃
      setProgress(100)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (!isVisible) return null

  return (
    <div className="top-loading-bar">
      <div 
        className="top-loading-bar-progress" 
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
