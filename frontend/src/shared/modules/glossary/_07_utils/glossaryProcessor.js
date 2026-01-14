/**
 * Glossary Processor
 * 도메인별 전문 용어 처리 유틸리티
 */

import { GLOSSARIES } from '../_08_constants'

/**
 * 텍스트에서 glossary 용어를 찾아 치환
 * @param {string} text - 원본 텍스트
 * @param {string} domain - 도메인 코드 (it, medical, legal, business, academic)
 * @param {string} sourceLang - 소스 언어 코드
 * @param {string} targetLang - 타겟 언어 코드
 * @returns {Object} { processedText, replacements }
 */
export function applyGlossary(text, domain, sourceLang, targetLang) {
  if (!text || domain === 'general') {
    return { processedText: text, replacements: [] }
  }

  const glossary = GLOSSARIES[domain]
  if (!glossary) {
    return { processedText: text, replacements: [] }
  }

  const langKey = `${sourceLang}_${targetLang}`
  const terms = glossary[langKey]
  if (!terms || Object.keys(terms).length === 0) {
    return { processedText: text, replacements: [] }
  }

  let processedText = text
  const replacements = []

  // 긴 용어부터 먼저 처리 (더 긴 매칭 우선)
  const sortedTerms = Object.entries(terms).sort((a, b) => b[0].length - a[0].length)

  for (const [term, translation] of sortedTerms) {
    // 대소문자 무시 매칭
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
    const matches = processedText.match(regex)
    
    if (matches) {
      processedText = processedText.replace(regex, translation)
      replacements.push({ original: term, translated: translation, count: matches.length })
    }
  }

  return { processedText, replacements }
}

/**
 * 번역 후 glossary 용어 후처리
 * 번역 결과에서 잘못 번역된 전문 용어를 수정
 * @param {string} translatedText - 번역된 텍스트
 * @param {string} originalText - 원본 텍스트
 * @param {string} domain - 도메인 코드
 * @param {string} sourceLang - 소스 언어 코드
 * @param {string} targetLang - 타겟 언어 코드
 * @returns {string} 후처리된 텍스트
 */
export function postProcessGlossary(translatedText, originalText, domain, sourceLang, targetLang) {
  if (!translatedText || domain === 'general') {
    return translatedText
  }

  const glossary = GLOSSARIES[domain]
  if (!glossary) {
    return translatedText
  }

  const langKey = `${sourceLang}_${targetLang}`
  const terms = glossary[langKey]
  if (!terms || Object.keys(terms).length === 0) {
    return translatedText
  }

  let result = translatedText

  // 원본에서 전문 용어 찾기
  const sortedTerms = Object.entries(terms).sort((a, b) => b[0].length - a[0].length)
  
  for (const [term, translation] of sortedTerms) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
    if (regex.test(originalText)) {
      // 번역 결과에서 해당 용어의 일반 번역을 전문 용어로 교체
      // 이미 올바르게 번역된 경우는 건너뜀
      if (!result.includes(translation)) {
        // 일반적인 번역 패턴을 전문 용어로 교체 시도
        const commonTranslations = getCommonTranslations(term, targetLang)
        for (const common of commonTranslations) {
          const commonRegex = new RegExp(escapeRegex(common), 'gi')
          if (commonRegex.test(result)) {
            result = result.replace(commonRegex, translation)
            break
          }
        }
      }
    }
  }

  return result
}

/**
 * 일반적인 번역 패턴 반환 (잘못된 번역 수정용)
 */
function getCommonTranslations(term, targetLang) {
  // 일반적으로 잘못 번역되는 패턴들
  const commonMistranslations = {
    ko: {
      'deploy': ['전개', '배치'],
      'branch': ['가지', '지점'],
      'merge': ['합치다', '통합'],
      'commit': ['저지르다', '약속'],
      'push': ['밀다', '누르다'],
      'pull': ['당기다', '끌다'],
      'bug': ['벌레', '곤충'],
      'cache': ['은닉처', '숨기다'],
      'hook': ['갈고리', '걸다'],
      'thread': ['실', '줄'],
      'stack': ['쌓다', '더미'],
      'queue': ['줄', '대기열'],
      'tree': ['나무'],
      'node': ['마디', '결절'],
      'container': ['용기', '그릇'],
      'pipeline': ['파이프라인', '관로'],
      'sprint': ['전력질주', '달리기'],
    },
    en: {
      '배포': ['distribution', 'spread'],
      '브랜치': ['branch'],
      '병합': ['combination', 'union'],
      '버그': ['insect', 'beetle'],
      '캐시': ['hiding place'],
      '훅': ['hook'],
      '스레드': ['thread'],
      '스택': ['pile', 'heap'],
      '큐': ['cue'],
      '트리': ['tree'],
      '컨테이너': ['container', 'vessel'],
    },
  }

  const termLower = term.toLowerCase()
  return commonMistranslations[targetLang]?.[termLower] || []
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
  applyGlossary,
  postProcessGlossary,
  getGlossaryTerms,
  findGlossaryTermsInText,
}
