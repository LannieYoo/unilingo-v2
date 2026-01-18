/**
 * useLanguagePreferences Hook
 * 사용자 언어 설정을 불러오는 공통 훅
 * 
 * Settings에서 설정한 native_language와 target_language를 불러옵니다.
 * - native_language: 모국어 (번역 결과 언어)
 * - target_language: 학습 언어 (번역 원본 언어)
 */

import { useState, useEffect } from 'react'
import { useAuthStore } from '../_05_stores'
import { authService } from '../_06_services'

// 기본값
const DEFAULT_NATIVE_LANGUAGE = 'ko'
const DEFAULT_TARGET_LANGUAGE = 'en'

/**
 * 언어 설정 훅
 * @returns {Object} 언어 설정 상태
 * - nativeLanguage: 모국어 (기본값: 'ko')
 * - targetLanguage: 학습 언어 (기본값: 'en')
 * - isLoading: 로딩 중 여부
 * - isLoaded: 로드 완료 여부
 */
export function useLanguagePreferences() {
  const [nativeLanguage, setNativeLanguage] = useState(DEFAULT_NATIVE_LANGUAGE)
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const { isAuthenticated, tokens } = useAuthStore()

  useEffect(() => {
    const loadLanguagePreferences = async () => {
      // 비로그인 상태면 기본값 유지
      if (!isAuthenticated || !tokens?.access_token) {
        setIsLoaded(true)
        return
      }

      setIsLoading(true)
      try {
        const data = await authService.getLanguagePreferences(tokens.access_token)
        
        // 설정값이 있으면 적용, 없으면 기본값 유지
        if (data.native_language) {
          setNativeLanguage(data.native_language)
        }
        if (data.target_language) {
          setTargetLanguage(data.target_language)
        }
      } catch (error) {
        // 401 에러는 무시 (비로그인 상태)
        if (error.response?.status !== 401) {
          console.error('Failed to load language preferences:', error)
        }
        // 에러 시 기본값 유지
      } finally {
        setIsLoading(false)
        setIsLoaded(true)
      }
    }

    loadLanguagePreferences()
  }, [isAuthenticated, tokens?.access_token])

  return {
    nativeLanguage,
    targetLanguage,
    isLoading,
    isLoaded,
  }
}

export default useLanguagePreferences
