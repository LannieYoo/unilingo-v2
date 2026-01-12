/**
 * DictionaryView
 * 사전 검색 페이지 뷰
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useDictionary } from '../_04_hooks'
import { useAuthStore } from '../../auth'
import { DIRECTIONS } from '../_08_constants'
import { playPronunciation } from '../_07_utils'
import '../_10_styles/dictionary.css'

export function DictionaryView() {
  const { isAuthenticated } = useAuthStore()
  const {
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
  } = useDictionary()

  const location = useLocation()
  const inputRef = useRef(null)

  // Handle location state for pre-filling search term and target language
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm)
      if (location.state.targetLang) {
        setTargetLang(location.state.targetLang)
      }
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title)
    }
  }, [location.state, setSearchTerm, setTargetLang])

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearch()
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex])
        } else {
          setShowSuggestions(false)
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
      default:
        break
    }
  }

  const handleTargetLangChange = (e) => {
    const newLang = e.target.value
    setTargetLang(newLang)
    if (searchTerm.trim()) {
      performSearchDirect(detectedLanguage || 'en', newLang, searchTerm)
    }
  }

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.suggestion-item')) return
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowSuggestions])

  return (
    <PageLayout title="Dictionary">
      <PageBox>
        {/* 검색 컨트롤 */}
        <div className="search-controls">
          <div className="search-input-group" ref={inputRef}>
            <div className="search-input-wrapper">
              <input
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  if (searchTerm.trim() && !showSuggestions) {
                    fetchSuggestions(searchTerm)
                  } else if (searchTerm.trim() && suggestions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                placeholder="Enter a word to search..."
                className="search-input"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setTimeout(() => selectSuggestion(suggestion), 0)
                      }}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      {!suggestion.isNonEnglish && suggestion.sourceTranslation ? (
                        <>
                          <span className="suggestion-word">{suggestion.sourceTranslation}</span>
                          <span className="suggestion-translation">{suggestion.translation || suggestion.word}</span>
                        </>
                      ) : (
                        <>
                          <span className="suggestion-word">{suggestion.word}</span>
                          {suggestion.translation && (
                            <span className="suggestion-translation">{suggestion.translation}</span>
                          )}
                        </>
                      )}
                      {suggestion.type === 'spell' && (
                        <span className="suggestion-hint">Did you mean?</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <select
              value={targetLang}
              onChange={handleTargetLangChange}
              className="direction-select"
            >
              {DIRECTIONS.filter(dir => dir.value !== detectedLanguage).map(dir => (
                <option key={dir.value} value={dir.value}>{dir.label}</option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="search-btn"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* 관련 단어 섹션 */}
        {results.length > 0 && (
          <div className="related-words-section-top">
            {results.map((result, index) => (
              <div key={index} className="related-words-wrapper">
                {result.synonyms && result.synonyms.length > 0 && (
                  <div className="synonyms-section">
                    <div className="section-title">Synonyms</div>
                    <div className="word-list">
                      {result.synonyms.map((syn, idx) => (
                        <span
                          key={idx}
                          className="word-tag synonym-tag"
                          onClick={() => {
                            setSearchTerm(syn)
                            setTargetLang('ko')
                            performSearchDirect('en', 'ko', syn)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.antonyms && result.antonyms.length > 0 && (
                  <div className="antonyms-section">
                    <div className="section-title">Antonyms</div>
                    <div className="word-list">
                      {result.antonyms.map((ant, idx) => (
                        <span
                          key={idx}
                          className="word-tag antonym-tag"
                          onClick={() => {
                            setSearchTerm(ant)
                            setTargetLang('ko')
                            performSearchDirect('en', 'ko', ant)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {ant}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {searchHistory.length > 1 && (
                  <div className="history-controls-inline">
                    <button
                      onClick={goBack}
                      disabled={historyIndex <= 0}
                      className="history-btn-inline history-back-btn"
                      title="Previous search"
                    >
                      ← Back
                    </button>
                    <span className="history-info-inline">
                      {historyIndex + 1} / {searchHistory.length}
                    </span>
                    <button
                      onClick={goForward}
                      disabled={historyIndex >= searchHistory.length - 1}
                      className="history-btn-inline history-forward-btn"
                      title="Next search"
                    >
                      Forward →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 검색 결과 */}
        <div className="results-section">
          {isSearching && results.length === 0 ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Searching...</p>
            </div>
          ) : !isSearching && results.length > 0 ? (
            <div className="results-list">
              {results.map((result, index) => {
                const wordToPronounce = result.englishWord || result.word
                return (
                  <div key={index} className="result-item">
                    <div className="result-header">
                      <div className="result-word-container">
                        <div className="result-word">{result.word}</div>
                        {result.englishWord && (
                          <div className="result-english-word">{result.englishWord}</div>
                        )}
                      </div>
                      {result.pronunciation && (
                        <div className="result-pronunciation">
                          <div className="pronunciation-item">
                            <img src="https://flagcdn.com/w40/us.png" alt="US" className="flag-icon" width="24" height="16" />
                            <span className="pronunciation-label">US</span>
                            <span className="pronunciation-text">{result.pronunciation.us}</span>
                            <button className="speaker-btn" onClick={() => playPronunciation(wordToPronounce, 'en-US')}>🔊</button>
                          </div>
                          <div className="pronunciation-item">
                            <img src="https://flagcdn.com/w40/gb.png" alt="UK" className="flag-icon" width="24" height="16" />
                            <span className="pronunciation-label">UK</span>
                            <span className="pronunciation-text">{result.pronunciation.uk}</span>
                            <button className="speaker-btn" onClick={() => playPronunciation(wordToPronounce, 'en-GB')}>🔊</button>
                          </div>
                        </div>
                      )}
                      {!result.pronunciation && targetLang === 'zh' && (
                        <button className="speaker-btn" onClick={() => playPronunciation(result.word, 'zh-CN')}>🔊</button>
                      )}
                      {!result.pronunciation && targetLang === 'ko' && (
                        <button className="speaker-btn" onClick={() => playPronunciation(result.word, 'ko-KR')}>🔊</button>
                      )}
                    </div>

                    {result.meanings && result.meanings.length > 0 && (
                      <div className="meanings-section">
                        {result.meanings.map((meaning, idx) => (
                          <div key={idx} className="meaning-item">
                            <div className="meaning-number">{meaning.number}</div>
                            <div className="meaning-content">
                              <div className="meaning-translation-container">
                                <div className="meaning-translation">{meaning.translation}</div>
                                {targetLang === 'zh' && meaning.translation && (
                                  <button className="example-speaker-btn" onClick={() => playPronunciation(meaning.translation, 'zh-CN')}>🔊</button>
                                )}
                                {targetLang === 'ko' && meaning.translation && (
                                  <button className="example-speaker-btn" onClick={() => playPronunciation(meaning.translation, 'ko-KR')}>🔊</button>
                                )}
                              </div>
                              {(meaning.exampleKo || meaning.exampleEn || meaning.exampleZh) && (
                                <div className="meaning-examples">
                                  {meaning.exampleKo && (
                                    <div className="example-ko-container">
                                      <div className="example-ko">{meaning.exampleKo}</div>
                                      <button className="example-speaker-btn" onClick={() => playPronunciation(meaning.exampleKo, 'ko-KR')}>🔊</button>
                                    </div>
                                  )}
                                  {meaning.exampleZh && (
                                    <div className="example-zh-container">
                                      <div className="example-zh">{meaning.exampleZh}</div>
                                      <button className="example-speaker-btn" onClick={() => playPronunciation(meaning.exampleZh, 'zh-CN')}>🔊</button>
                                    </div>
                                  )}
                                  {meaning.exampleEn && (
                                    <div className="example-en-container">
                                      <div className="example-en">{meaning.exampleEn}</div>
                                      <button className="example-speaker-btn" onClick={() => playPronunciation(meaning.exampleEn, 'en-US')}>🔊</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.translation && (
                      <div className="result-translation">{result.translation}</div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="no-results">
              {searchTerm ? 'No results found.' : 'Enter a search term.'}
            </div>
          )}
        </div>
      </PageBox>

      {/* 검색 히스토리 - 로그인한 사용자만 표시 */}
      {isAuthenticated && searchHistory.length > 0 && (
        <div className="search-history-bar">
          <div className="history-words">
            {searchHistory.map((item, index) => (
              <span key={index} className="history-item">
                <span
                  className="history-word"
                  onClick={() => searchWithWord(item.word)}
                >
                  {item.word}
                </span>
                <span
                  className="history-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteHistoryItem(index)
                  }}
                >
                  ✕
                </span>
                {index < searchHistory.length - 1 && <span className="history-separator">|</span>}
              </span>
            ))}
          </div>
          <button className="history-clear-btn" onClick={clearHistory}>
            Clear
          </button>
        </div>
      )}
    </PageLayout>
  )
}

export default DictionaryView
