/**
 * useGlossary Hook
 * 도메인별 glossary 관리 훅
 */

import { useState, useCallback } from 'react'
import { DEFAULT_DOMAIN } from '../_08_constants'
import { applyGlossary, postProcessGlossary, findGlossaryTermsInText } from '../_07_utils'

/**
 * Glossary 훅
 * @param {string} initialDomain - 초기 도메인 (기본값: 'general')
 * @returns {Object} glossary 상태 및 함수
 */
export function useGlossary(initialDomain = DEFAULT_DOMAIN) {
  const [domain, setDomain] = useState(initialDomain)

  /**
   * 번역 전 glossary 적용
   */
  const preProcess = useCallback((text, sourceLang, targetLang) => {
    return applyGlossary(text, domain, sourceLang, targetLang)
  }, [domain])

  /**
   * 번역 후 glossary 후처리
   */
  const postProcess = useCallback((translatedText, originalText, sourceLang, targetLang) => {
    return postProcessGlossary(translatedText, originalText, domain, sourceLang, targetLang)
  }, [domain])

  /**
   * 텍스트에서 glossary 용어 찾기
   */
  const findTerms = useCallback((text, sourceLang, targetLang) => {
    return findGlossaryTermsInText(text, domain, sourceLang, targetLang)
  }, [domain])

  return {
    domain,
    setDomain,
    preProcess,
    postProcess,
    findTerms,
  }
}

export default useGlossary
