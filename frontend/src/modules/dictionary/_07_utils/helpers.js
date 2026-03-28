/**
 * Dictionary 유틸리티 함수
 */

import { LANGUAGE_DETECTION, LANGUAGE_NAMES } from '../_08_constants'

/**
 * 텍스트에서 언어 감지
 */
export function detectLanguage(text) {
  if (!text?.trim()) return null
  
  const trimmedText = text.trim()
  const koreanRegex = new RegExp(LANGUAGE_DETECTION.korean.regex, 'g')
  const chineseRegex = new RegExp(LANGUAGE_DETECTION.chinese.regex, 'g')
  const englishRegex = new RegExp(LANGUAGE_DETECTION.english.regex, 'g')
  
  const koreanMatches = trimmedText.match(koreanRegex)
  const chineseMatches = trimmedText.match(chineseRegex)
  const englishMatches = trimmedText.match(englishRegex)
  
  const koreanCount = koreanMatches ? koreanMatches.length : 0
  const chineseCount = chineseMatches ? chineseMatches.length : 0
  const englishCount = englishMatches ? englishMatches.length : 0
  
  const totalChars = trimmedText.replace(/[\d\s]/g, '').length
  if (totalChars === 0) return null
  
  if (koreanCount > 0 && koreanCount >= englishCount && koreanCount >= chineseCount) return 'ko'
  if (chineseCount > 0 && chineseCount >= englishCount && chineseCount >= koreanCount) return 'zh'
  if (englishCount > 0) return 'en'
  
  return null
}

/**
 * 언어 코드로 언어 이름 가져오기
 */
export function getLanguageName(lang) {
  return LANGUAGE_NAMES[lang] || lang
}

/**
 * 텍스트 발음 재생
 */
export function playPronunciation(text, lang = 'en-GB') {
  if ('speechSynthesis' in window) {
    // Get available voices
    const voices = window.speechSynthesis.getVoices()
    
    const langPrefix = lang.split('-')[0] // e.g., 'en' from 'en-GB'
    
    // Find voice that matches the language (prefer exact match, then prefix match)
    let matchingVoice = voices.find(voice => voice.lang === lang)
    if (!matchingVoice) {
      matchingVoice = voices.find(voice => voice.lang.startsWith(langPrefix))
    }
    // For Chinese, try other variants
    if (!matchingVoice && langPrefix === 'zh') {
      matchingVoice = voices.find(voice => voice.lang.startsWith('zh'))
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.8
    
    // Set specific voice if found
    if (matchingVoice) {
      utterance.voice = matchingVoice
      console.log('✓ Using voice:', matchingVoice.name, '(', matchingVoice.lang, ') for requested lang:', lang)
    } else {
      console.warn('✗ No matching voice found for:', lang)
    }
    
    window.speechSynthesis.speak(utterance)
  }
}
