/**
 * Dictionary API 서비스
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
const TIMEOUT = 15000  // Increased timeout for multiple API calls (DeepL + LibreTranslate + Google)

/**
 * snake_case를 camelCase로 변환 (재귀적으로 모든 중첩 객체 처리)
 */
function keysToCamel(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => keysToCamel(item))
  
  const result = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = keysToCamel(obj[key])
    }
  }
  return result
}

/**
 * 백엔드 Dictionary API로 단어 검색 (게스트 사용 가능)
 */
export async function searchDictionary(word, targetLang) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
    
    const url = `${API_BASE_URL}/api/dictionary/search?word=${encodeURIComponent(word)}&target_lang=${targetLang}`
    console.log('[Dictionary Service] Calling API:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    console.log('[Dictionary Service] Response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error('[Dictionary Service] API error:', response.status, errorData)
      return null
    }
    
    const data = await response.json()
    console.log('[Dictionary Service] Response data:', data)
    // keysToCamel 제거 - 백엔드 응답을 그대로 사용
    return data
  } catch (error) {
    // Network error - backend server might be down
    if (error.name === 'AbortError') {
      console.error('[Dictionary Service] API timeout')
    } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.error('[Dictionary Service] Backend server is not running. Please start the backend server.')
    } else {
      console.error('[Dictionary Service] API error:', error)
    }
    return null
  }
}

/**
 * 백엔드 Dictionary API로 자동완성 제안 가져오기 (게스트 사용 가능)
 */
export async function fetchAutocompleteSuggestions(query, language, targetLang) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
    
    const params = new URLSearchParams({
      query,
      target_lang: targetLang
    })
    
    if (language) {
      params.append('language', language)
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/dictionary/autocomplete?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error('Autocomplete API error:', response.status)
      return []
    }
    
    const data = await response.json()
    return data.suggestions || []
  } catch (error) {
    // Network error - backend server might be down
    if (error.name === 'AbortError') {
      console.error('Autocomplete API timeout')
    } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.error('Backend server is not running. Autocomplete disabled.')
    } else {
      console.error('Autocomplete API error:', error)
    }
    return []
  }
}

/**
 * Google Translate API로 번역 (Fallback용)
 */
export async function translateText(text, fromLang, toLang) {
  try {
    const langMap = { ko: 'ko', en: 'en', zh: 'zh' }
    const sourceCode = langMap[fromLang] || 'en'
    const targetCode = langMap[toLang] || 'ko'
    
    if (sourceCode === targetCode) return text
    
    // 1. 직접 Google Translate API 시도
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
      const response = await fetch(googleUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const googleData = await response.json()
        if (googleData?.[0]?.[0]?.[0]) {
          const translated = googleData[0]
            .filter(item => item?.[0] && typeof item[0] === 'string')
            .map(item => item[0])
            .join('')
            .trim()
          if (translated && translated !== text) return translated
        }
      }
    } catch (e) {
      console.error('Google Translate direct error:', e)
    }
    
    // 2. MyMemory API 시도
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`
      const response = await fetch(myMemoryUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          let translated = data.responseData.translatedText
          translated = translated.replace(/^t\d+\//, '').replace(/<[^>]*>/g, '').trim()
          if (translated && translated !== text && translated.toUpperCase() !== text.toUpperCase()) {
            return translated
          }
        }
      }
    } catch (e) {
      console.error('MyMemory error:', e)
    }
    
    // 3. Proxy를 통한 Google Translate 시도
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleUrl)}`
      const response = await fetch(proxyUrl, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const proxyData = await response.json()
        if (proxyData?.contents) {
          const googleData = JSON.parse(proxyData.contents)
          if (googleData?.[0]?.[0]?.[0]) {
            const translated = googleData[0]
              .filter(item => item?.[0] && typeof item[0] === 'string')
              .map(item => item[0])
              .join('')
              .trim()
            if (translated && translated !== text) return translated
          }
        }
      }
    } catch (e) {
      console.error('Google Translate proxy error:', e)
    }
  } catch (error) {
    console.error('Translation error:', error)
  }
  
  return null
}

/**
 * Dictionary API에서 단어 정보 가져오기 (Deprecated - 백엔드 API 사용)
 */
export async function fetchDictionary(word, signal = null) {
  console.warn('fetchDictionary is deprecated. Use searchDictionary instead.')
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
    
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: signal || controller.signal }
      )
      
      if (!response.ok) {
        clearTimeout(timeoutId)
        return null
      }
      
      const data = await response.json()
      clearTimeout(timeoutId)
      return Array.isArray(data) ? data[0] : data
    } catch (fetchError) {
      clearTimeout(timeoutId)
      return null
    }
  } catch (error) {
    console.error('Dictionary API error:', error)
    return null
  }
}

/**
 * Datamuse API에서 자동완성 제안 가져오기 (Deprecated - 백엔드 API 사용)
 */
export async function fetchSuggestionsFromDatamuse(query, signal = null) {
  console.warn('fetchSuggestionsFromDatamuse is deprecated. Use fetchAutocompleteSuggestions instead.')
  const [sugResponse, spellResponse] = await Promise.all([
    fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=8`, { signal }),
    fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(query)}*&max=5`, { signal })
  ])
  
  const sugData = sugResponse.ok ? await sugResponse.json() : []
  const spellData = spellResponse.ok ? await spellResponse.json() : []
  
  // 결과 병합 및 중복 제거
  const allWords = new Map()
  
  sugData.forEach((item, idx) => {
    if (!allWords.has(item.word)) {
      allWords.set(item.word, { word: item.word, score: item.score || (1000 - idx), type: 'suggest' })
    }
  })
  
  spellData.forEach((item, idx) => {
    if (!allWords.has(item.word)) {
      allWords.set(item.word, { word: item.word, score: item.score || (500 - idx), type: 'spell' })
    }
  })
  
  return Array.from(allWords.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

export default {
  searchDictionary,
  fetchAutocompleteSuggestions,
  translateText,
  fetchDictionary,
  fetchSuggestionsFromDatamuse
}
