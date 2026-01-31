/**
 * useInlineDictionary Hook
 * 인라인 사전 기능 훅
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchDictionary, translateText } from '../../dictionary/_06_services/service'
import { useAuthStore } from '../../auth'

export function useInlineDictionary(targetLang) {
  const [selectedWord, setSelectedWord] = useState(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dictionaryData, setDictionaryData] = useState(null)
  const [translation, setTranslation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const abortControllerRef = useRef(null)
  
  const { tokens } = useAuthStore()

  // 단어 클릭 핸들러
  const handleWordClick = useCallback(async (word, event) => {
    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 같은 단어 클릭 시 닫기
    if (selectedWord === word) {
      setSelectedWord(null)
      setDictionaryData(null)
      setTranslation(null)
      return
    }

    // 클릭 위치 저장 및 초기 화면 경계 체크
    const rect = event.target.getBoundingClientRect()
    const tooltipHeight = 400 // 예상 툴팁 높이
    const viewportHeight = window.innerHeight
    
    // 수직 위치 계산 (위/아래)
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const showAbove = spaceBelow < tooltipHeight && spaceAbove > spaceBelow
    
    // 초기 수평 위치 (중앙 정렬)
    const x = rect.left + rect.width / 2
    
    setPosition({
      x,
      y: showAbove ? rect.top - 5 : rect.bottom + 5,
      showAbove
    })

    setSelectedWord(word)
    setIsLoading(true)
    setDictionaryData(null)
    setTranslation(null)
    setIsFavorited(false)

    // 새 요청 시작
    abortControllerRef.current = new AbortController()

    try {
      // 사전 데이터, 번역을 병렬로 가져오기
      const [dictData, wordTranslation] = await Promise.all([
        fetchDictionary(word, abortControllerRef.current.signal),
        translateText(word, 'en', targetLang)
      ])
      
      setDictionaryData(dictData)
      setTranslation(wordTranslation)

      // 사전 정의가 있으면 각 정의도 번역
      if (dictData && dictData.meanings) {
        const translatedMeanings = await Promise.all(
          dictData.meanings.map(async (meaning) => {
            const translatedDefinitions = await Promise.all(
              meaning.definitions.map(async (def) => {
                const translatedDef = await translateText(def.definition, 'en', targetLang)
                return {
                  ...def,
                  translatedDefinition: translatedDef || def.definition
                }
              })
            )
            return {
              ...meaning,
              definitions: translatedDefinitions
            }
          })
        )
        setDictionaryData({
          ...dictData,
          meanings: translatedMeanings
        })
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Dictionary fetch error:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedWord, targetLang])

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async () => {
    if (!selectedWord || !dictionaryData) return
    
    if (!tokens?.access_token) {
      console.error('Not authenticated')
      return
    }
    
    try {
      const response = await fetch('/api/dictionary/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({
          word: selectedWord,
          source_lang: 'en',
          target_lang: targetLang,
          search_results: JSON.stringify({
            translation,
            meanings: dictionaryData.meanings
          }),
          source: 'stt'
        })
      })
      
      if (response.ok) {
        setIsFavorited(true)
      } else {
        const errorData = await response.json()
        console.error('Failed to save favorite:', errorData)
      }
    } catch (error) {
      console.error('Error saving favorite:', error)
    }
  }, [selectedWord, dictionaryData, translation, targetLang, tokens])

  // 툴팁 닫기
  const closeTooltip = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setSelectedWord(null)
    setDictionaryData(null)
    setTranslation(null)
    setIsFavorited(false)
    setIsLoading(false)
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    selectedWord,
    position,
    dictionaryData,
    translation,
    isFavorited,
    isLoading,
    handleWordClick,
    toggleFavorite,
    closeTooltip
  }
}

export default useInlineDictionary
