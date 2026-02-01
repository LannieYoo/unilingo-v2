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
                        <div className="result-word">{result.term || result.word}</div>
                        {result.englishWord && (
                          <div className="result-english-word">{result.englishWord}</div>
                        )}
                      </div>
                      {result.pronunciation && (result.pronunciation.ipa || result.pronunciation.phonetic) && (
                        <div className="result-pronunciation">
                          <div className="pronunciation-item">
                            <span className="pronunciation-label">IPA</span>
                            <span className="pronunciation-text">{result.pronunciation.ipa || result.pronunciation.phonetic}</span>
                            {result.pronunciation.audioUrl && (
                              <button className="speaker-btn" onClick={() => {
                                const audio = new Audio(result.pronunciation.audioUrl)
                                audio.play()
                              }}>🔉</button>
                            )}
                            {!result.pronunciation.audioUrl && (
                              <button className="speaker-btn" onClick={() => playPronunciation(result.term || result.word, 'en-US')}>🔉</button>
                            )}
                          </div>
                        </div>
                      )}
                      {!result.pronunciation && targetLang === 'zh' && (
                        <button className="speaker-btn" onClick={() => playPronunciation(result.term || result.word, 'zh-CN')}>🔉</button>
                      )}
                      {!result.pronunciation && targetLang === 'ko' && (
                        <button className="speaker-btn" onClick={() => playPronunciation(result.term || result.word, 'ko-KR')}>🔉</button>
                      )}
                    </div>

                    {result.meanings && result.meanings.length > 0 && (
                      <div className="meanings-section">
                        {result.meanings.map((meaning, idx) => (
                          <div key={idx} className="meaning-item">
                            <div className="meaning-header">
                              <span className="part-of-speech">{meaning.partOfSpeech || meaning.part_of_speech}</span>
                            </div>
                            <div className="meaning-content">
                              {meaning.definitions && meaning.definitions.map((def, defIdx) => (
                                <div key={defIdx} className="definition-block">
                                  <div className="definition-number">{defIdx + 1}</div>
                                  <div className="definition-content">
                                    <div className="definition-text">
                                      {def.definition}
                                      <button className="inline-speaker-btn" onClick={() => playPronunciation(def.definition, 'en-US')} title="Listen">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                        </svg>
                                      </button>
                                    </div>
                                    {def.translation && (
                                      <div className="definition-translation">{def.translation}</div>
                                    )}
                                    {def.examples && def.examples.length > 0 && (
                                      <div className="examples-list">
                                        {def.examples.map((example, exIdx) => (
                                          <div key={exIdx} className="example-item">
                                            <span className="example-icon">💬</span>
                                            <span className="example-text">
                                              {example}
                                              <button className="inline-speaker-btn" onClick={() => playPronunciation(example, 'en-US')} title="Listen">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                </svg>
                                              </button>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
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
            {searchHistory.slice(-20).reverse().map((item, index) => {
              // Calculate the actual index in the original searchHistory array
              // slice(-20) takes last 20 items, reverse() flips them
              // So index 0 in displayed list = last item in original array
              const actualIndex = searchHistory.length - 1 - index
              
              return (
                <span key={item.id || index} className="history-item">
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
                      deleteHistoryItem(actualIndex)
                    }}
                  >
                    ✕
                  </span>
                  {index < Math.min(searchHistory.length, 20) - 1 && <span className="history-separator">|</span>}
                </span>
              )
            })}
          </div>
          <div className="history-actions">
            <a href="/dictionary/history" className="history-view-all-btn">
              History
            </a>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

export default DictionaryView
