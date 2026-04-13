/**
 * DictionaryView
 * 사전 검색 페이지 뷰
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useDictionary } from '../_04_hooks'
import { useAuthStore } from '../../auth'
import { DIRECTIONS } from '../_08_constants'
import { playPronunciation, getWordLevel, getLevelColor } from '../_07_utils'
import { UsageIndicator } from '../../../common/components/UsageIndicator'
import { DeeplStatusIndicator } from '../../../common/components/DeeplStatusIndicator'
import { TopLoadingBar } from '../../../common/components/TopLoadingBar'
import { authService } from '../../auth'
import '../_10_styles/dictionary.css'

export function DictionaryView() {
  const { isAuthenticated, tokens } = useAuthStore()
  const [togglingFavorite, setTogglingFavorite] = useState(false)
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
    deleteHistoryItem,
    searchWithWord,
    fetchSuggestions,
  } = useDictionary()

  const location = useLocation()
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceLang, setVoiceLang] = useState('en-US')

  const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const VOICE_LANGS = [
    { code: 'en-US', label: 'EN', name: 'English' },
    { code: 'ko-KR', label: 'KO', name: 'Korean' },
    { code: 'zh-CN', label: 'ZH', name: 'Chinese' },
  ]

  // Ref to always have the latest searchWithWord
  const searchWithWordRef = useRef(searchWithWord)
  useEffect(() => { searchWithWordRef.current = searchWithWord }, [searchWithWord])

  const handleVoiceInput = useCallback(() => {
    if (!isSpeechSupported) {
      alert('Your browser does not support speech recognition.')
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = voiceLang
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    let finalTranscript = ''

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setSearchTerm(finalTranscript || interim)
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      if (finalTranscript.trim()) {
        searchWithWordRef.current(finalTranscript.trim())
      }
    }

    recognition.start()
  }, [isSpeechSupported, isListening, voiceLang, setSearchTerm])

  // Cycle voice language: EN → KO → ZH → EN
  const cycleVoiceLang = useCallback(() => {
    if (isListening) return
    setVoiceLang(prev => {
      const idx = VOICE_LANGS.findIndex(l => l.code === prev)
      return VOICE_LANGS[(idx + 1) % VOICE_LANGS.length].code
    })
  }, [isListening])

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

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

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert('Login required to use favorites')
      return
    }
    
    if (togglingFavorite) return
    
    setTogglingFavorite(true)
    try {
      await toggleFavorite()
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    } finally {
      setTogglingFavorite(false)
    }
  }

  const handleWordClick = (text) => {
    // 텍스트에서 첫 번째 단어 추출 (영어 단어만)
    const words = text.match(/\b[a-zA-Z]+\b/g)
    if (words && words.length > 0) {
      const word = words[0].toLowerCase()
      searchWithWord(word)
    }
  }

  return (
    <PageLayout title="Dictionary">
      <TopLoadingBar isLoading={isSearching} />
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
                placeholder={isListening ? 'Listening...' : 'Enter a word to search...'}
                className={`search-input ${isListening ? 'search-input--listening' : ''}`}
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
            {isSpeechSupported && (
              <div className="dict-voice-group">
                <button
                  onClick={cycleVoiceLang}
                  className={`dict-voice-lang-toggle ${isListening ? 'active' : ''}`}
                  title={isListening ? `Listening in ${VOICE_LANGS.find(l => l.code === voiceLang)?.name}. Click to switch language.` : `Voice language: ${VOICE_LANGS.find(l => l.code === voiceLang)?.name}. Click to change.`}
                >
                  {VOICE_LANGS.find(l => l.code === voiceLang)?.label}
                </button>
                <button
                  onClick={handleVoiceInput}
                  className={`dict-voice-btn ${isListening ? 'listening' : ''}`}
                  title={isListening ? 'Stop listening' : `Voice input (${VOICE_LANGS.find(l => l.code === voiceLang)?.name})`}
                >
                  <span className="material-symbols-outlined">
                    {isListening ? 'mic_off' : 'mic'}
                  </span>
                </button>
              </div>
            )}
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
          {isSearching ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="results-list">
              {results.map((result, index) => {
                const wordToPronounce = result.englishWord || result.word
                const wordLevel = getWordLevel(result.term || result.word)
                const levelColor = getLevelColor(wordLevel)
                return (
                  <div key={index} className="result-item">
                    <div className="result-header">
                      <div className="result-word-container">
                        <div className="result-word-with-level">
                          <span className="result-word">{result.term || result.word}</span>
                          <span className="word-level-badge" style={{ backgroundColor: levelColor }}>
                            {wordLevel}
                          </span>
                          <button
                            onClick={handleToggleFavorite}
                            disabled={togglingFavorite}
                            className={`dictionary-favorite-btn ${isFavorite ? 'active' : ''} ${!isAuthenticated ? 'disabled' : ''}`}
                            title={isAuthenticated ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Login required to use favorites'}
                          >
                            <span className="material-symbols-outlined">
                              {isFavorite ? 'star' : 'star_outline'}
                            </span>
                          </button>
                        </div>
                        {result.simpleTranslation && (
                          <div className="result-simple-translation">{result.simpleTranslation}</div>
                        )}
                        {result.englishWord && (
                          <div className="result-english-word">{result.englishWord}</div>
                        )}
                      </div>
                      {((result.pronunciation && (result.pronunciation.ipa || result.pronunciation.phonetic)) || detectedLanguage === 'en') && (
                        <div className="result-pronunciation">
                          {result.pronunciation && (result.pronunciation.ipa || result.pronunciation.phonetic) && (
                            <div className="pronunciation-item">
                              <span className="pronunciation-label">IPA</span>
                              <span className="pronunciation-text">{result.pronunciation.ipa || result.pronunciation.phonetic}</span>
                            </div>
                          )}
                          {detectedLanguage === 'en' && (
                            <>
                              <button className="speaker-btn flag-btn" onClick={() => playPronunciation(result.term || result.word, 'en-US')}>
                                <svg width="20" height="15" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="60" height="30" fill="#B22234"/>
                                  <path d="M0,3.46h60M0,6.92h60M0,10.38h60M0,13.84h60M0,17.3h60M0,20.76h60M0,24.22h60M0,27.68h60" stroke="#fff" strokeWidth="2.3"/>
                                  <rect width="24" height="17.3" fill="#3C3B6E"/>
                                  <g fill="#fff">
                                    <g id="s5">
                                      <g id="s4">
                                        <path id="s" d="M3,2.3L3.3,3.3L2.4,2.8h1.2L2.7,3.3z"/>
                                        <use href="#s" x="6"/>
                                        <use href="#s" x="12"/>
                                        <use href="#s" x="18"/>
                                      </g>
                                      <use href="#s4" y="4.6"/>
                                    </g>
                                    <use href="#s5" y="9.2"/>
                                    <use href="#s4" y="2.3"/>
                                  </g>
                                </svg>
                                <span className="flag-label">US</span>
                              </button>
                              <button className="speaker-btn flag-btn" onClick={() => playPronunciation(result.term || result.word, 'en-GB')}>
                                <svg width="20" height="15" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="60" height="30" fill="#012169"/>
                                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                                  <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                                  <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                                </svg>
                                <span className="flag-label">UK</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {!result.pronunciation && detectedLanguage === 'zh' && (
                        <button className="speaker-btn" onClick={() => playPronunciation(result.term || result.word, 'zh-CN')}>🔉</button>
                      )}
                      {!result.pronunciation && detectedLanguage === 'ko' && (
                        <button className="speaker-btn" onClick={() => playPronunciation(result.term || result.word, 'ko-KR')}>🔉</button>
                      )}
                    </div>

                    {result.meanings && result.meanings.length > 0 && (
                      <div className="meanings-section">
                        {result.meanings.map((meaning, idx) => {
                          const partOfSpeech = meaning.part_of_speech || 'unknown';
                          // Proxy 객체를 일반 배열로 변환
                          const definitions = meaning.definitions ? Array.from(meaning.definitions) : [];
                          
                          return (
                            <div key={idx} className="meaning-item">
                              <div className="meaning-header">
                                <span className="part-of-speech">{partOfSpeech}</span>
                              </div>
                            <div className="meaning-content">
                              {definitions.map((def, defIdx) => (
                                <div key={defIdx} className="definition-block">
                                  <div className="definition-number">{defIdx + 1}</div>
                                  <div className="definition-content">
                                    <div 
                                      className="definition-text clickable-example"
                                      onClick={() => handleWordClick(def.definition)}
                                      title="Click to search words"
                                    >
                                      {def.definition.split(/\b/).map((part, partIdx) => {
                                        const isWord = /^[a-zA-Z]+$/.test(part)
                                        return isWord ? (
                                          <span 
                                            key={partIdx} 
                                            className="clickable-word"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              searchWithWord(part.toLowerCase())
                                            }}
                                          >
                                            {part}
                                          </span>
                                        ) : (
                                          <span key={partIdx}>{part}</span>
                                        )
                                      })}
                                      <button className="inline-speaker-btn" onClick={(e) => {
                                        e.stopPropagation()
                                        playPronunciation(def.definition, 'en-US')
                                      }} title="Listen">
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
                                            <span 
                                              className="example-text clickable-example"
                                              onClick={() => handleWordClick(example)}
                                              title="Click to search words"
                                            >
                                              {example.split(/\b/).map((part, partIdx) => {
                                                const isWord = /^[a-zA-Z]+$/.test(part)
                                                return isWord ? (
                                                  <span 
                                                    key={partIdx} 
                                                    className="clickable-word"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      searchWithWord(part.toLowerCase())
                                                    }}
                                                  >
                                                    {part}
                                                  </span>
                                                ) : (
                                                  <span key={partIdx}>{part}</span>
                                                )
                                              })}
                                              <button className="inline-speaker-btn" onClick={(e) => {
                                                e.stopPropagation()
                                                playPronunciation(example, 'en-US')
                                              }} title="Listen">
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
                          );
                        })}
                      </div>
                    )}
                    {result.translation && (
                      <div className="result-translation">
                        {result.translation}
                        <button 
                          className="inline-speaker-btn" 
                          onClick={() => playPronunciation(result.translation, targetLang === 'zh' ? 'zh-CN' : targetLang === 'ko' ? 'ko-KR' : 'en-US')} 
                          title="Listen"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          </svg>
                        </button>
                      </div>
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

      {/* Dictionary Usage Indicator */}
      <div className="mt-4">
        <UsageIndicator usageType="dictionary" label="Dictionary Searches" />
      </div>

      {/* DeepL Translation Status */}
      <div className="mt-4">
        <DeeplStatusIndicator />
      </div>

      {/* 즐겨찾기 - 로그인한 사용자만 표시 */}
      {isAuthenticated && favoritesLoaded && searchHistory.length > 0 && (
        <div className="search-history-bar">
          <div className="history-words">
            {searchHistory.slice(-20).reverse().map((item, index) => {
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
              Favorites
            </a>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

export default DictionaryView
