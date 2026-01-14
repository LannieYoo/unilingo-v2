/**
 * Glossary Processor
 * 도메인별 전문 용어 처리 유틸리티
 * 
 * 새로운 방식: 번역 전에 용어를 보호하고, 번역 후 복원
 */

import { GLOSSARIES } from '../_08_constants'

/**
 * 번역 전 전처리: 원문에서 도메인 용어를 찾아 플레이스홀더로 교체
 * @param {string} text - 원본 텍스트
 * @param {string} domain - 도메인 코드
 * @param {string} sourceLang - 소스 언어 코드
 * @param {string} targetLang - 타겟 언어 코드
 * @returns {Object} { processedText, termMap }
 */
export function protectTerms(text, domain, sourceLang, targetLang) {
  if (!text || domain === 'general') {
    console.log('[Glossary] Skipping protection (general domain)')
    return { processedText: text, termMap: {} }
  }

  const glossary = GLOSSARIES[domain]
  if (!glossary) {
    console.log('[Glossary] No glossary for domain:', domain)
    return { processedText: text, termMap: {} }
  }

  const langKey = `${sourceLang}_${targetLang}`
  const terms = glossary[langKey]
  if (!terms || Object.keys(terms).length === 0) {
    console.log('[Glossary] No terms for:', { domain, langKey })
    return { processedText: text, termMap: {} }
  }

  let processedText = text
  const termMap = {}
  let termIndex = 0

  // 긴 용어부터 먼저 처리
  const sortedTerms = Object.entries(terms).sort((a, b) => b[0].length - a[0].length)

  console.log('[Glossary] Protecting terms:', { domain, termCount: sortedTerms.length })

  for (const [term, translation] of sortedTerms) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
    const matches = [...processedText.matchAll(regex)]
    
    if (matches.length > 0) {
      for (const match of matches) {
        const placeholder = `__TERM${termIndex}__`
        termMap[placeholder] = translation
        processedText = processedText.replace(match[0], placeholder)
        termIndex++
        console.log('[Glossary] Protected:', { term: match[0], placeholder, translation })
      }
    }
  }

  console.log('[Glossary] Protection complete:', { protectedCount: termIndex })
  return { processedText, termMap }
}

/**
 * 번역 후 복원: 플레이스홀더를 도메인 용어로 교체
 * @param {string} translatedText - 번역된 텍스트
 * @param {Object} termMap - 플레이스홀더 → 용어 매핑
 * @returns {string} 복원된 텍스트
 */
export function restoreTerms(translatedText, termMap) {
  if (!translatedText || !termMap || Object.keys(termMap).length === 0) {
    console.log('[Glossary] No terms to restore')
    return translatedText
  }

  let result = translatedText
  let restoredCount = 0

  for (const [placeholder, translation] of Object.entries(termMap)) {
    if (result.includes(placeholder)) {
      result = result.replace(new RegExp(escapeRegex(placeholder), 'g'), translation)
      restoredCount++
      console.log('[Glossary] Restored:', { placeholder, translation })
    }
  }

  console.log('[Glossary] Restoration complete:', { restoredCount })
  return result
}

/**
 * 텍스트에서 glossary 용어를 찾아 치환 (레거시 - 하위 호환성)
 * @deprecated Use protectTerms + restoreTerms instead
 */
export function applyGlossary(text, domain, sourceLang, targetLang) {
  const { processedText, termMap } = protectTerms(text, domain, sourceLang, targetLang)
  return { processedText, replacements: Object.entries(termMap).map(([k, v]) => ({ placeholder: k, translation: v })) }
}

/**
 * 번역 후 glossary 용어 후처리
 * @deprecated 새로운 방식(protectTerms + restoreTerms)을 사용하세요
 */
export function postProcessGlossary(translatedText, originalText, domain, sourceLang, targetLang) {
  console.log('[Glossary] postProcessGlossary is deprecated, use protectTerms + restoreTerms instead')
  return translatedText
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 도메인에 해당하는 glossary 용어 목록 반환
 */
export function getGlossaryTerms(domain, sourceLang, targetLang) {
  if (domain === 'general') return {}
  
  const glossary = GLOSSARIES[domain]
  if (!glossary) return {}
  
  const langKey = `${sourceLang}_${targetLang}`
  return glossary[langKey] || {}
}

/**
 * 텍스트에서 glossary 용어 하이라이트 정보 반환
 */
export function findGlossaryTermsInText(text, domain, sourceLang, targetLang) {
  if (!text || domain === 'general') return []
  
  const terms = getGlossaryTerms(domain, sourceLang, targetLang)
  const found = []
  
  for (const [term, translation] of Object.entries(terms)) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      found.push({
        term: match[0],
        translation,
        index: match.index,
        length: match[0].length,
      })
    }
  }
  
  return found.sort((a, b) => a.index - b.index)
}

export default {
  protectTerms,
  restoreTerms,
  applyGlossary,
  postProcessGlossary,
  getGlossaryTerms,
  findGlossaryTermsInText,
}
