/**
 * useDictionary Hook
 * 사전 검색 비즈니스 로직
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { detectLanguage } from '../_07_utils'
import { DEFAULT_TARGET_LANG, DIRECTIONS } from '../_08_constants'
import { useAuthStore, useLanguagePreferences } from '../../auth'
import { authService } from '../../auth/_06_services'
import { useUsage } from '../../../common/contexts/UsageContext'

export function useDictionary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [targetLang, setTargetLang] = useState(DEFAULT_TARGET_LANG)
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [searchHistory, setSearchHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentLogId, setCurrentLogId] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoritesLoaded, setFavoritesLoaded] = useState(false)

  const abortControllerRef = useRef(null)
  const currentSearchTermRef = useRef('')
  const suggestionAbortRef = useRef(null)

  // Auth store
  const { user, tokens, isAuthenticated } = useAuthStore()

  // Usage tracking hook
  const { trackUsage } = useUsage()

  // 공통 언어 설정 훅 사용
  const { nativeLanguage, isLoaded: preferencesLoaded } = useLanguagePreferences()

  // Load language preferences from settings
  useEffect(() => {
    if (!preferencesLoaded) return
    
    // Settings의 native_language → Dictionary의 Target Language (결과를 모국어로 표시)
    const isSupported = DIRECTIONS.some(d => d.value === nativeLanguage)
    
    if (isSupported) {
      setTargetLang(nativeLanguage)
    }
  }, [preferencesLoaded, nativeLanguage])

  // 페이지 로드 시 데이터베이스에서 즐겨찾기만 불러오기
  useEffect(() => {
    const loadFavorites = async () => {
      console.log('[Dictionary] Loading favorites, user:', user, 'token:', !!tokens?.access_token)
      if (user && tokens?.access_token) {
        try {
          const data = await authService.getDictionaryLogs(tokens.access_token, 50)
          console.log('[Dictionary] Loaded logs:', data)
          if (data.logs && data.logs.length > 0) {
            // 즐겨찾기만 필터링
            const favoriteItems = data.logs
              .filter(log => {
                console.log('[Dictionary] Log:', log.search_word, 'is_favorite:', log.is_favorite)
                return log.is_favorite
              })
              .map(log => {
                // search_results에서 번역 추출
                let simpleTranslation = null
                try {
                  const results = typeof log.search_results === 'string' 
                    ? JSON.parse(log.search_results) 
                    : log.search_results
                  
                  if (results && results.length > 0) {
                    const firstResult = results[0]
                    
                    // 1. simpleTranslation이 있고 원본 단어와 다르면 사용
                    if (firstResult.simpleTranslation && 
                        firstResult.simpleTranslation !== firstResult.term &&
                        firstResult.simpleTranslation !== firstResult.word) {
                      simpleTranslation = firstResult.simpleTranslation
                    }
                    // 2. meanings의 첫 번째 정의의 translation 사용
                    else if (firstResult.meanings && firstResult.meanings.length > 0) {
                      const firstMeaning = firstResult.meanings[0]
                      if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
                        const firstDef = firstMeaning.definitions[0]
                        if (firstDef.translation) {
                          simpleTranslation = firstDef.translation
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error('[Dictionary] Failed to parse search_results:', e)
                }
                
                return {
                  id: log.id,
                  word: log.search_word,
                  results: log.search_results ? JSON.parse(log.search_results) : [],
                  fromLang: log.source_lang,
                  toLang: log.target_lang,
                  isFavorite: true,
                  resultSummary: simpleTranslation,
                  timestamp: new Date(log.created_at).getTime()
                }
              })
              .reverse()
            
            console.log('[Dictionary] Favorite items:', favoriteItems)
            setSearchHistory(favoriteItems)
            if (favoriteItems.length > 0) {
              setHistoryIndex(favoriteItems.length - 1)
            }
          }
        } catch (error) {
          console.error('Failed to load dictionary favorites:', error)
        } finally {
          setFavoritesLoaded(true)
        }
      } else {
        setFavoritesLoaded(true)
      }
    }

    loadFavorites()
  }, [user, tokens?.access_token])

  // 언어 감지
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDetectedLanguage(null)
      return
    }
    const detectedLang = detectLanguage(searchTerm)
    setDetectedLanguage(detectedLang)
    
    if (detectedLang === targetLang) {
      const availableLangs = DIRECTIONS.filter(dir => dir.value !== detectedLang)
      if (availableLangs.length > 0) {
        setTargetLang(availableLangs[0].value)
      }
    }
  }, [searchTerm, targetLang])

  // 검색어 비워지면 초기화
  useEffect(() => {
    if (!searchTerm.trim()) {
      setTargetLang(DEFAULT_TARGET_LANG)
      setResults([])
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchTerm])

  // 자동완성 가져오기
  const fetchSuggestions = useCallback(async (query) => {
    if (!query.trim() || query.length < 1) {
      setSuggestions([])
      return
    }

    const detectedLang = detectLanguage(query)

    // 한국어/중국어 입력인 경우
    if (detectedLang === 'ko' || detectedLang === 'zh') {
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort()
      }
      const controller = new AbortController()
      suggestionAbortRef.current = controller

      try {
        const sourceLang = detectedLang === 'ko' ? 'ko' : 'zh'
        const initialSuggestion = [{ word: query, translation: null, type: 'original', isNonEnglish: true, sourceLang }]
        setSuggestions(initialSuggestion)
        setShowSuggestions(true)

        // Google Translate로 영어 번역
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodeURIComponent(query)}`
        const response = await fetch(googleUrl, { signal: controller.signal })

        if (response.ok) {
          const data = await response.json()
          const englishWord = data?.[0]?.[0]?.[0]?.toLowerCase()?.trim()

          if (englishWord && englishWord !== query) {
            const [sugResponse, relatedResponse] = await Promise.all([
              fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(englishWord)}&max=8`, { signal: controller.signal }),
              fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(englishWord)}&max=5`, { signal: controller.signal })
            ])

            const sugData = sugResponse.ok ? await sugResponse.json() : []
            const relatedData = relatedResponse.ok ? await relatedResponse.json() : []

            const allWords = new Map()
            allWords.set(query, { word: query, translation: null, type: 'original', isNonEnglish: true, sourceLang })

            sugData.forEach((item, idx) => {
              if (!allWords.has(item.word) && item.word !== englishWord) {
                allWords.set(item.word, { word: item.word, score: item.score || (1000 - idx), type: 'related' })
              }
            })
            relatedData.forEach((item, idx) => {
              if (!allWords.has(item.word) && item.word !== englishWord) {
                allWords.set(item.word, { word: item.word, score: item.score || (500 - idx), type: 'synonym' })
              }
            })

            const combined = Array.from(allWords.values()).slice(0, 10)
            setSuggestions(combined)
            setShowSuggestions(combined.length > 0)

            // 번역 추가
            const actualTargetLang = targetLang === sourceLang ? 'en' : targetLang
            const suggestionsWithTranslation = await Promise.all(
              combined.map(async (suggestion) => {
                try {
                  if (suggestion.isNonEnglish) {
                    const transUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${suggestion.sourceLang}&tl=${actualTargetLang}&dt=t&q=${encodeURIComponent(suggestion.word)}`
                    const transResponse = await fetch(transUrl)
                    if (transResponse.ok) {
                      const transData = await transResponse.json()
                      const translation = transData?.[0]?.[0]?.[0] || null
                      return { ...suggestion, translation }
                    }
                    return suggestion
                  }

                  const sourceTransUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${sourceLang}&dt=t&q=${encodeURIComponent(suggestion.word)}`
                  const sourceTransResponse = await fetch(sourceTransUrl)
                  let sourceTranslation = null
                  if (sourceTransResponse.ok) {
                    const sourceTransData = await sourceTransResponse.json()
                    sourceTranslation = sourceTransData?.[0]?.[0]?.[0] || null
                  }

                  let targetTranslation = null
                  if (actualTargetLang !== 'en') {
                    const targetTransUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${actualTargetLang}&dt=t&q=${encodeURIComponent(suggestion.word)}`
                    const targetTransResponse = await fetch(targetTransUrl)
                    if (targetTransResponse.ok) {
                      const targetTransData = await targetTransResponse.json()
                      targetTranslation = targetTransData?.[0]?.[0]?.[0] || null
                    }
                  } else {
                    targetTranslation = suggestion.word
                  }

                  return {
                    ...suggestion,
                    sourceTranslation,
                    translation: targetTranslation || suggestion.word
                  }
                } catch {
                  return suggestion
                }
              })
            )

            if (!isSearching) {
              setSuggestions(suggestionsWithTranslation)
            }
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Korean/Chinese suggestion error:', error)
        }
      }
      return
    }

    // 영어 입력인 경우
    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort()
    }

    const controller = new AbortController()
    suggestionAbortRef.current = controller

    try {
      const [sugResponse, spellResponse] = await Promise.all([
        fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=8`, { signal: controller.signal }),
        fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(query)}*&max=5`, { signal: controller.signal })
      ])
      
      const sugData = sugResponse.ok ? await sugResponse.json() : []
      const spellData = spellResponse.ok ? await spellResponse.json() : []
      
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
      
      const combined = Array.from(allWords.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      
      setSuggestions(combined)
      setShowSuggestions(combined.length > 0)

      // 백그라운드에서 번역 추가
      const suggestionsWithTranslation = await Promise.all(
        combined.map(async (suggestion) => {
          try {
            const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang === 'en' ? 'ko' : targetLang}&dt=t&q=${encodeURIComponent(suggestion.word)}`
            const response = await fetch(googleUrl)
            if (response.ok) {
              const data = await response.json()
              const translation = data?.[0]?.[0]?.[0] || null
              return { ...suggestion, translation }
            }
            return { ...suggestion, translation: null }
          } catch {
            return { ...suggestion, translation: null }
          }
        })
      )

      if (!isSearching) {
        setSuggestions(suggestionsWithTranslation)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Suggestion error:', error)
      }
    }
  }, [targetLang, isSearching])

  // 번역 헬퍼 (Backend DeepL → Google Translate fallback)
  const translateText = useCallback(async (text, sl, tl, signal) => {
    // 1. Backend DeepL (higher quality + caching)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiUrl}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source_lang: sl, target_lang: tl }),
        signal
      })
      if (res.ok) {
        const data = await res.json()
        if (data.translated_text && data.translated_text.trim() && data.translated_text !== text) {
          return data.translated_text.trim()
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
    }
    // 2. Google Translate fallback
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url, { signal })
      if (res.ok) {
        const data = await res.json()
        return data?.[0]?.[0]?.[0] || null
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Translate error:', e)
    }
    return null
  }, [])

  // 검색 수행 - Free Dictionary API + Google Translate (자동완성과 동일한 소스)
  const performSearch = useCallback(async (fromLang, toLang, searchWord, signal = null, historyWord = null) => {
    const wordToSearch = searchWord
    
    console.log('[Dictionary Hook] performSearch called:', { fromLang, toLang, searchWord, historyWord })
    
    // 현재 검색어가 즐겨찾기에 있는지 확인
    const existingFavorite = searchHistory.find(item => {
      const match = item.word.toLowerCase() === searchWord.toLowerCase() && item.isFavorite
      return match
    })
    
    if (existingFavorite) {
      setCurrentLogId(existingFavorite.id)
      setIsFavorite(true)
    } else {
      setCurrentLogId(null)
      setIsFavorite(false)
    }
    
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError')
    if (wordToSearch !== currentSearchTermRef.current) throw new DOMException('Search cancelled', 'AbortError')

    try {
      // 비영어 입력인 경우 Google Translate로 영어 변환
      let englishWord = wordToSearch
      let originalWord = null
      if (fromLang === 'ko' || fromLang === 'zh') {
        const translated = await translateText(wordToSearch, fromLang, 'en', signal)
        if (translated && translated.toLowerCase() !== wordToSearch.toLowerCase()) {
          englishWord = translated.toLowerCase().trim()
          originalWord = wordToSearch
          
          // Normalize: strip common prefixes that break dictionary lookup
          // e.g. "to endure" → "endure", "a book" → "book"
          const prefixes = ['to ', 'a ', 'an ', 'the ', 'be ', 'very ', 'really ', 'quite ']
          for (const prefix of prefixes) {
            if (englishWord.startsWith(prefix)) {
              englishWord = englishWord.slice(prefix.length).trim()
            }
          }
        }
      }

      console.log('[Dictionary Hook] Looking up:', englishWord)

      // Free Dictionary API 호출 (자동완성과 같은 빠른 소스)
      const dictResponse = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(englishWord)}`,
        { signal }
      )

      if (!dictResponse.ok) {
        const result = [{ word: wordToSearch, translation: `"${wordToSearch}" - 검색 결과를 찾을 수 없습니다.`, isPhrase: true }]
        setResults(result)
        return
      }

      const dictDataArray = await dictResponse.json()
      const dictData = Array.isArray(dictDataArray) ? dictDataArray[0] : dictDataArray

      if (!dictData) {
        const result = [{ word: wordToSearch, translation: `"${wordToSearch}" - 검색 결과를 찾을 수 없습니다.`, isPhrase: true }]
        setResults(result)
        return
      }

      // 발음 추출
      let pronunciation = null
      if (dictData.phonetics && dictData.phonetics.length > 0) {
        let ipa = null
        let audioUrl = null
        for (const p of dictData.phonetics) {
          if (p.text && !ipa) ipa = p.text
          if (p.audio && !audioUrl) audioUrl = p.audio
        }
        if (ipa || audioUrl) {
          pronunciation = { ipa, phonetic: ipa, audioUrl }
        }
      }

      // 의미 추출 + 번역 (병렬 처리)
      const meanings = []
      const translationPromises = []

      if (dictData.meanings) {
        for (const meaning of dictData.meanings) {
          const partOfSpeech = meaning.partOfSpeech || 'unknown'
          const definitions = []

          if (meaning.definitions) {
            for (const def of meaning.definitions.slice(0, 3)) {
              if (!def.definition) continue
              const examples = def.example ? [def.example] : []
              definitions.push({
                definition: def.definition,
                translation: null,
                examples
              })

              // 번역 프로미스 수집 (영어 → 타겟 언어)
              if (toLang !== 'en') {
                const defRef = definitions[definitions.length - 1]
                translationPromises.push(
                  translateText(def.definition, 'en', toLang, signal).then(t => {
                    defRef.translation = t
                  })
                )
              }
            }
          }

          if (definitions.length > 0) {
            meanings.push({ part_of_speech: partOfSpeech, partOfSpeech, definitions })
          }
        }
      }

      // simple_translation 가져오기 (병렬)
      let simpleTranslation = null
      if (toLang !== 'en') {
        translationPromises.push(
          translateText(englishWord, 'en', toLang, signal).then(t => {
            simpleTranslation = t
          })
        )
      }

      // 동의어/반의어 추출
      const synonyms = []
      const antonyms = []
      if (dictData.meanings) {
        for (const meaning of dictData.meanings) {
          if (meaning.synonyms) synonyms.push(...meaning.synonyms)
          if (meaning.antonyms) antonyms.push(...meaning.antonyms)
          if (meaning.definitions) {
            for (const def of meaning.definitions) {
              if (def.synonyms) synonyms.push(...def.synonyms)
              if (def.antonyms) antonyms.push(...def.antonyms)
            }
          }
        }
      }

      // 모든 번역 병렬 완료 대기
      await Promise.all(translationPromises)

      const result = [{
        term: originalWord || englishWord,
        word: originalWord || englishWord,
        simpleTranslation,
        englishWord: originalWord ? englishWord : null,
        pronunciation,
        meanings,
        synonyms: [...new Set(synonyms)].slice(0, 10),
        antonyms: [...new Set(antonyms)].slice(0, 10),
        cached: false
      }]
      
      console.log('[Dictionary Hook] Result:', result)
      setResults(result)
      
      // Track usage
      try {
        await trackUsage(1, 'dictionary')
      } catch (err) {
        console.error('[Dictionary] Failed to track usage:', err)
      }
    } catch (error) {
      if (error.name === 'AbortError') throw error
      console.error('Search error:', error)
      const errorResult = [{ word: wordToSearch, translation: 'Error: ' + error.message }]
      setResults(errorResult)
    }
  }, [trackUsage, searchHistory, translateText])

  // 검색 실행
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }
    setShowSuggestions(false)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    currentSearchTermRef.current = searchTerm
    
    setResults([])
    setIsSearching(true)
    
    try {
      const fromLang = detectedLanguage || 'en'
      await performSearch(fromLang, targetLang, searchTerm, abortController.signal)
    } catch (error) {
      if (error.name === 'AbortError') return
      if (currentSearchTermRef.current === searchTerm) {
        setResults([{ word: searchTerm, translation: 'Error: ' + error.message }])
      }
    } finally {
      if (currentSearchTermRef.current === searchTerm) {
        setIsSearching(false)
        abortControllerRef.current = null
      }
    }
  }, [searchTerm, detectedLanguage, targetLang, performSearch])

  // 직접 검색 수행
  const performSearchDirect = useCallback(async (fromLang, toLang, word) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    currentSearchTermRef.current = word
    
    setResults([])
    setIsSearching(true)
    setSuggestions([])
    setShowSuggestions(false)
    
    try {
      await performSearch(fromLang, toLang, word, abortController.signal)
    } catch (error) {
      if (error.name === 'AbortError') return
      const errorResult = [{ word: word, translation: 'Error: ' + error.message }]
      setResults(errorResult)
    } finally {
      setIsSearching(false)
      abortControllerRef.current = null
    }
  }, [performSearch])

  // 단어로 검색
  const searchWithWord = useCallback(async (word, historyWord = null, suggestionTranslation = null) => {
    if (!word.trim()) {
      setResults([])
      return
    }

    const wordForHistory = historyWord || word
    setSearchTerm(word)
    setShowSuggestions(false)
    setSuggestions([])
    
    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort()
      suggestionAbortRef.current = null
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    currentSearchTermRef.current = word
    
    setResults([])
    setIsSearching(true)
    
    // suggestionTranslation을 임시 저장
    if (suggestionTranslation) {
      window.__lastSuggestionTranslation = suggestionTranslation
    }
    
    try {
      const detectedLang = detectLanguage(word)
      const fromLang = detectedLang || 'en'
      await performSearch(fromLang, targetLang, word, abortController.signal, wordForHistory)
    } catch (error) {
      if (error.name === 'AbortError') return
      if (currentSearchTermRef.current === word) {
        setResults([{ word: word, translation: 'Error: ' + error.message }])
      }
    } finally {
      if (currentSearchTermRef.current === word) {
        setIsSearching(false)
        abortControllerRef.current = null
      }
    }
  }, [targetLang, performSearch])

  // 입력 변경 핸들러
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setSelectedSuggestionIndex(-1)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setResults([])
    setIsSearching(false)
    currentSearchTermRef.current = newValue
    
    if (newValue.trim()) {
      fetchSuggestions(newValue)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [fetchSuggestions])

  // 자동완성 선택
  const selectSuggestion = useCallback((suggestion) => {
    let displayWord, searchWord, suggestionTranslation
    
    if (!suggestion.isNonEnglish && suggestion.sourceTranslation) {
      displayWord = suggestion.sourceTranslation
      searchWord = suggestion.word
      suggestionTranslation = suggestion.translation
    } else {
      displayWord = suggestion.word
      searchWord = suggestion.word
      suggestionTranslation = suggestion.translation
    }
    
    setSearchTerm(displayWord)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedSuggestionIndex(-1)
    
    // suggestionTranslation을 함께 전달
    searchWithWord(searchWord, displayWord, suggestionTranslation)
  }, [searchWithWord])

  // 히스토리 네비게이션
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const historyItem = searchHistory[newIndex]
      setHistoryIndex(newIndex)
      setSearchTerm(historyItem.word)
      setTargetLang(historyItem.toLang)
      setResults(historyItem.results)
      setDetectedLanguage(historyItem.fromLang)
      setCurrentLogId(historyItem.id || null)
      setIsFavorite(historyItem.isFavorite || false)
    }
  }, [historyIndex, searchHistory])

  const goForward = useCallback(() => {
    if (historyIndex < searchHistory.length - 1) {
      const newIndex = historyIndex + 1
      const historyItem = searchHistory[newIndex]
      setHistoryIndex(newIndex)
      setSearchTerm(historyItem.word)
      setTargetLang(historyItem.toLang)
      setResults(historyItem.results)
      setDetectedLanguage(historyItem.fromLang)
      setCurrentLogId(historyItem.id || null)
      setIsFavorite(historyItem.isFavorite || false)
    }
  }, [historyIndex, searchHistory])

  // 히스토리 관리
  const clearHistory = useCallback(async () => {
    setSearchHistory([])
    setHistoryIndex(-1)
    
    // 로그인한 사용자인 경우 데이터베이스에서도 삭제
    if (user && tokens?.access_token) {
      try {
        await authService.clearDictionaryLogs(tokens.access_token)
      } catch (error) {
        console.error('Failed to clear dictionary logs:', error)
      }
    }
  }, [user, tokens])

  const deleteHistoryItem = useCallback(async (index) => {
    const itemToDelete = searchHistory[index]
    
    if (!itemToDelete) {
      console.error('Item not found at index:', index, 'searchHistory length:', searchHistory.length)
      return
    }
    
    // 로그인한 사용자이고 아이템에 ID가 있는 경우에만 데이터베이스에서 삭제
    if (user && tokens?.access_token && itemToDelete.id && itemToDelete.isFavorite) {
      try {
        await authService.deleteDictionaryLog(tokens.access_token, itemToDelete.id)
      } catch (error) {
        console.error('Failed to delete dictionary log:', error)
      }
    }
    
    // 로컬 히스토리에서 삭제
    setSearchHistory(prev => {
      const newHistory = prev.filter((_, i) => i !== index)
      return newHistory
    })
    
    // Update history index separately to avoid closure issues
    if (historyIndex >= index) {
      setHistoryIndex(Math.max(-1, historyIndex - 1))
    }
  }, [historyIndex, searchHistory, user, tokens])

  // 즐겨찾기 토글 (DB에 저장)
  const toggleFavorite = useCallback(async () => {
    if (!user || !tokens?.access_token) return null
    
    try {
      // 현재 검색 결과 가져오기
      if (!searchTerm || results.length === 0) return null
      
      const fromLang = detectedLanguage || 'en'
      const toLang = targetLang
      
      // 이미 저장된 로그가 있으면 토글
      if (currentLogId) {
        const response = await authService.toggleDictionaryFavorite(tokens.access_token, currentLogId)
        const newFavoriteState = response.log.is_favorite
        setIsFavorite(newFavoriteState)
        
        // 로컬 히스토리 업데이트
        if (newFavoriteState) {
          // 즐겨찾기 추가 - 히스토리에 추가
          setSearchHistory(prev => {
            const exists = prev.find(item => item.id === currentLogId)
            if (exists) {
              return prev.map(item => 
                item.id === currentLogId ? { ...item, isFavorite: true } : item
              )
            } else {
              return [...prev, {
                id: currentLogId,
                word: searchTerm,
                results: results,
                fromLang: fromLang,
                toLang: toLang,
                isFavorite: true,
                timestamp: Date.now()
              }]
            }
          })
        } else {
          // 즐겨찾기 제거 - 히스토리에서 삭제
          setSearchHistory(prev => prev.filter(item => item.id !== currentLogId))
          setCurrentLogId(null)
        }
        
        return newFavoriteState
      } else {
        // 새로 저장
        // Extract simple_translation from results or use suggestion translation
        const resultSummary = window.__lastSuggestionTranslation || 
          (results && results.length > 0 && results[0].simpleTranslation 
            ? results[0].simpleTranslation 
            : null)
        
        // Clear the temporary translation
        delete window.__lastSuggestionTranslation
        
        const response = await authService.createDictionaryLog(tokens.access_token, {
          search_word: searchTerm,
          source_lang: fromLang,
          target_lang: toLang,
          search_results: results,
          result_summary: resultSummary
        })
        
        if (response.log && response.log.id) {
          const logId = response.log.id
          setCurrentLogId(logId)
          
          // 즐겨찾기 토글
          const toggleResponse = await authService.toggleDictionaryFavorite(tokens.access_token, logId)
          const newFavoriteState = toggleResponse.log.is_favorite
          setIsFavorite(newFavoriteState)
          
          // 로컬 히스토리에 추가
          if (newFavoriteState) {
            setSearchHistory(prev => [...prev, {
              id: logId,
              word: searchTerm,
              results: results,
              fromLang: fromLang,
              toLang: toLang,
              isFavorite: true,
              timestamp: Date.now()
            }])
          }
          
          return newFavoriteState
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      return null
    }
  }, [user, tokens, currentLogId, searchTerm, results, detectedLanguage, targetLang])

  return {
    searchTerm,
    setSearchTerm,
    targetLang,
    setTargetLang,
    results,
    isSearching,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    searchHistory,
    historyIndex,
    detectedLanguage,
    currentLogId,
    isFavorite,
    setIsFavorite,
    favoritesLoaded,
    toggleFavorite,
    handleSearch,
    handleInputChange,
    selectSuggestion,
    goBack,
    goForward,
    performSearchDirect,
    clearHistory,
    deleteHistoryItem,
    searchWithWord,
    fetchSuggestions,
  }
}

export default useDictionary
