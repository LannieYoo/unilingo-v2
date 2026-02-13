/**
 * useDictionary Hook
 * 사전 검색 비즈니스 로직
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchDictionary, fetchAutocompleteSuggestions } from '../_06_services'
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
    
    // Settings의 native_language → Dictionary의 Target Language
    const isSupported = DIRECTIONS.some(d => d.value === nativeLanguage)
    
    if (isSupported) {
      setTargetLang(nativeLanguage)
    }
  }, [preferencesLoaded, nativeLanguage])

  // 페이지 로드 시 데이터베이스에서 검색 히스토리 불러오기
  useEffect(() => {
    const loadSearchHistory = async () => {
      if (user && tokens?.access_token) {
        try {
          const data = await authService.getRecentDictionaryLogs(tokens.access_token, 20)
          if (data.logs && data.logs.length > 0) {
            const historyItems = data.logs.map(log => ({
              id: log.id,
              word: log.search_word,
              results: log.search_results ? JSON.parse(log.search_results) : [],
              fromLang: log.source_lang,
              toLang: log.target_lang,
              timestamp: new Date(log.created_at).getTime()
            })).reverse() // 최신순으로 정렬 (API에서 최신순으로 오므로 reverse)
            
            setSearchHistory(historyItems)
            setHistoryIndex(historyItems.length - 1)
          }
        } catch (error) {
          console.error('Failed to load dictionary history:', error)
        }
      }
    }

    loadSearchHistory()
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

  // 히스토리에 추가 (데이터베이스에도 저장)
  const addToHistory = useCallback(async (searchWord, searchResults, fromLang, toLang) => {
    const historyItem = {
      word: searchWord,
      results: searchResults,
      fromLang,
      toLang,
      timestamp: Date.now()
    }
    
    // 로그인한 사용자인 경우 데이터베이스에 저장하고 ID 받아오기
    if (user && tokens?.access_token) {
      try {
        const response = await authService.createDictionaryLog(tokens.access_token, {
          search_word: searchWord,
          source_lang: fromLang,
          target_lang: toLang,
          search_results: searchResults
        })
        
        // 데이터베이스에서 받은 ID를 히스토리 아이템에 추가
        if (response.log && response.log.id) {
          historyItem.id = response.log.id
        }
      } catch (error) {
        console.error('Failed to save dictionary log:', error)
      }
    }
    
    // 로컬 히스토리 업데이트 (중복 단어 제거 후 새로 추가)
    setSearchHistory(prev => {
      // 동일한 단어가 있으면 제거
      const filteredHistory = prev.filter(item => item.word !== searchWord)
      
      // 새 항목 추가
      filteredHistory.push(historyItem)
      
      // 최대 50개 유지
      if (filteredHistory.length > 50) {
        filteredHistory.shift()
      }
      
      setHistoryIndex(filteredHistory.length - 1)
      return filteredHistory
    })
  }, [user, tokens])

  // 검색 수행
  const performSearch = useCallback(async (fromLang, toLang, searchWord, signal = null, historyWord = null) => {
    const wordToSearch = searchWord
    const wordForHistory = historyWord || searchWord
    
    console.log('[Dictionary Hook] performSearch called:', { fromLang, toLang, searchWord, historyWord })
    
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError')
    if (wordToSearch !== currentSearchTermRef.current) throw new DOMException('Search cancelled', 'AbortError')

    try {
      // 백엔드 API 호출 (언어 자동 감지 및 캐시 처리)
      console.log('[Dictionary Hook] Calling searchDictionary:', wordToSearch, toLang)
      const dictData = await searchDictionary(wordToSearch, toLang)
      console.log('[Dictionary Hook] searchDictionary returned:', dictData)
      
      if (!dictData || !dictData.term) {
        console.log('[Dictionary Hook] No data or no term, showing error')
        const result = [{ word: wordToSearch, translation: `"${wordToSearch}" - 검색 결과를 찾을 수 없습니다.`, isPhrase: true }]
        setResults(result)
        addToHistory(wordForHistory, result, fromLang, toLang)
        return
      }
      
      // 새 API 응답 구조에 맞게 변환
      console.log('[Dictionary Hook] Transforming data...')
      const result = [{
        term: dictData.term,
        word: dictData.term,
        pronunciation: dictData.pronunciation && (dictData.pronunciation.ipa || dictData.pronunciation.phonetic) 
          ? { 
              ipa: dictData.pronunciation.ipa,
              phonetic: dictData.pronunciation.phonetic,
              audioUrl: dictData.pronunciation.audio_url
            }
          : null,
        meanings: dictData.meanings && dictData.meanings.length > 0
          ? dictData.meanings.map((meaning) => ({
              part_of_speech: meaning.part_of_speech,
              partOfSpeech: meaning.part_of_speech,
              definitions: meaning.definitions.map((def) => ({
                definition: def.definition,
                translation: def.translation,
                examples: def.examples || []
              }))
            }))
          : [],
        synonyms: [],
        antonyms: [],
        cached: dictData.cached || false
      }]
      
      console.log('[Dictionary Hook] Transformed result:', result)
      setResults(result)
      addToHistory(wordForHistory, result, fromLang, toLang)
      
      // Track usage - count as 1 search
      const searchCount = 1
      console.log('[Dictionary] Tracking usage:', searchCount, 'search')
      try {
        await trackUsage(searchCount, 'dictionary')
        console.log('[Dictionary] Usage tracked successfully')
      } catch (err) {
        console.error('[Dictionary] Failed to track usage:', err)
      }
    } catch (error) {
      console.error('Search error:', error)
      const errorResult = [{ word: wordToSearch, translation: 'Error: ' + error.message }]
      setResults(errorResult)
      addToHistory(wordForHistory, errorResult, fromLang, toLang)
    }
  }, [addToHistory, trackUsage])

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
  const searchWithWord = useCallback(async (word, historyWord = null) => {
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
    let displayWord, searchWord
    
    if (!suggestion.isNonEnglish && suggestion.sourceTranslation) {
      displayWord = suggestion.sourceTranslation
      searchWord = suggestion.word
    } else {
      displayWord = suggestion.word
      searchWord = suggestion.word
    }
    
    setSearchTerm(displayWord)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedSuggestionIndex(-1)
    
    searchWithWord(searchWord, displayWord)
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
    
    // 로그인한 사용자이고 아이템에 ID가 있는 경우 데이터베이스에서 삭제
    if (user && tokens?.access_token && itemToDelete.id) {
      try {
        await authService.deleteDictionaryLog(tokens.access_token, itemToDelete.id)
      } catch (error) {
        console.error('Failed to delete dictionary log:', error)
        // 데이터베이스 삭제 실패해도 로컬에서는 삭제 진행
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
