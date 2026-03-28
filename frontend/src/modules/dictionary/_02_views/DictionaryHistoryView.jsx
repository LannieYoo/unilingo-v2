/**
 * DictionaryHistoryView
 * Dictionary search history full view page
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useAuthStore, authService } from '../../auth'
import '../_10_styles/dictionary.css'

export function DictionaryHistoryView() {
  const { isAuthenticated, tokens } = useAuthStore()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Search / autocomplete state
  const [searchQuery, setSearchQuery] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Load all favorites in one request (no pagination needed for search)
  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadAllFavorites()
    }
  }, [isAuthenticated, tokens?.access_token])

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/dictionary" replace />
  }

  const parseResultSummary = (log) => {
    let resultSummary = null
    try {
      const results = typeof log.search_results === 'string'
        ? JSON.parse(log.search_results)
        : log.search_results

      if (results && results.length > 0) {
        const firstResult = results[0]

        if (firstResult.simpleTranslation &&
          firstResult.simpleTranslation !== firstResult.term &&
          firstResult.simpleTranslation !== firstResult.word) {
          resultSummary = firstResult.simpleTranslation
        } else if (firstResult.meanings && firstResult.meanings.length > 0) {
          const firstMeaning = firstResult.meanings[0]
          if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
            const firstDef = firstMeaning.definitions[0]
            if (firstDef.translation) {
              resultSummary = firstDef.translation
            }
          }
        }
      }
    } catch (e) {
      console.error('[DictionaryHistory] Failed to parse search_results:', e)
    }
    return resultSummary
  }

  const loadAllFavorites = async () => {
    if (!tokens?.access_token) return

    setLoading(true)
    setError(null)
    try {
      // Load a large batch of favorites (server-side filtered)
      const data = await authService.getDictionaryLogs(tokens.access_token, 500, 0, true)
      const logs = (data.logs || []).map(log => ({
        ...log,
        result_summary: parseResultSummary(log)
      }))
      setHistory(logs)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  // Autocomplete suggestions: match search_word or result_summary
  const autocompleteSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return history.filter(item => {
      const word = (item.search_word || '').toLowerCase()
      const summary = (item.result_summary || '').toLowerCase()
      return word.includes(q) || summary.includes(q)
    }).slice(0, 8) // max 8 suggestions
  }, [searchQuery, history])

  // Filtered results for display
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history
    const q = searchQuery.toLowerCase().trim()
    return history.filter(item => {
      const word = (item.search_word || '').toLowerCase()
      const summary = (item.result_summary || '').toLowerCase()
      return word.includes(q) || summary.includes(q)
    })
  }, [searchQuery, history])

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value
    setSearchQuery(val)
    setSelectedIndex(-1)
    setShowAutocomplete(val.trim().length > 0)
  }, [])

  const handleSelectSuggestion = useCallback((item) => {
    setSearchQuery(item.search_word)
    setShowAutocomplete(false)
    setSelectedIndex(-1)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) {
      if (e.key === 'Escape') {
        setSearchQuery('')
        setShowAutocomplete(false)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < autocompleteSuggestions.length) {
        handleSelectSuggestion(autocompleteSuggestions[selectedIndex])
      } else {
        setShowAutocomplete(false)
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
      setSelectedIndex(-1)
    }
  }, [showAutocomplete, autocompleteSuggestions, selectedIndex, handleSelectSuggestion])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setShowAutocomplete(false)
    setSelectedIndex(-1)
    searchInputRef.current?.focus()
  }, [])

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!query.trim() || !text) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="history-search-highlight">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  const handleDelete = async (logId) => {
    if (!tokens?.access_token) return

    setDeletingId(logId)
    try {
      await authService.deleteDictionaryLog(tokens.access_token, logId)
      setHistory(prev => prev.filter(h => h.id !== logId))
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUseSearch = (item) => {
    navigate('/dictionary', { state: { searchTerm: item.search_word, targetLang: item.target_lang } })
  }

  const getLangName = (code) => {
    const langMap = {
      'en': 'English',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
    }
    return langMap[code] || code?.toUpperCase()
  }

  return (
    <PageLayout title="Favorite Words">
      <PageBox>
        {/* Back button */}
        <button
          onClick={() => navigate('/dictionary')}
          className="mb-4 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 text-text-light dark:text-text-dark rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
        >
          ← Back to Dictionary
        </button>

        {/* Search bar with autocomplete */}
        {!loading && history.length > 0 && (
          <div className="history-search-container">
            <div className="history-search-input-wrapper">
              <span className="material-symbols-outlined history-search-icon">search</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery.trim() && setShowAutocomplete(true)}
                placeholder="Search your favorite words..."
                className="history-search-input"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="history-search-clear"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              )}

              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <div ref={autocompleteRef} className="history-autocomplete-dropdown">
                  {autocompleteSuggestions.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`history-autocomplete-item ${idx === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="material-symbols-outlined history-autocomplete-item-icon">star</span>
                      <div className="history-autocomplete-item-content">
                        <span className="history-autocomplete-word">
                          {highlightMatch(item.search_word, searchQuery)}
                        </span>
                        {item.result_summary && (
                          <span className="history-autocomplete-summary">
                            {highlightMatch(item.result_summary, searchQuery)}
                          </span>
                        )}
                      </div>
                      <span className="history-autocomplete-lang">
                        {getLangName(item.source_lang)} → {getLangName(item.target_lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* No results in autocomplete */}
              {showAutocomplete && searchQuery.trim() && autocompleteSuggestions.length === 0 && (
                <div ref={autocompleteRef} className="history-autocomplete-dropdown">
                  <div className="history-autocomplete-empty">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.5 }}>search_off</span>
                    <span>No matching words found</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* History List */}
        {!loading && (
          <div className="dictionary-history-full">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark">
                <span className="material-symbols-outlined text-4xl mb-2 block">
                  {searchQuery.trim() ? 'search_off' : 'star'}
                </span>
                <p>{searchQuery.trim()
                  ? `No favorites matching "${searchQuery}"`
                  : 'No favorite words yet.'
                }</p>
                {!searchQuery.trim() && (
                  <p className="text-sm mt-1">
                    Click the star icon when searching to save your favorite words.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="dictionary-history-card-compact"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg truncate">
                          {searchQuery.trim()
                            ? highlightMatch(item.search_word, searchQuery)
                            : item.search_word
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleUseSearch(item)}
                          className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Search again"
                        >
                          <span className="material-symbols-outlined text-lg">search</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {deletingId === item.id ? 'hourglass_empty' : 'delete'}
                          </span>
                        </button>
                      </div>
                    </div>
                    {item.result_summary && (
                      <div className="text-sm text-text-muted-light dark:text-text-muted-dark line-clamp-2">
                        {searchQuery.trim()
                          ? highlightMatch(item.result_summary, searchQuery)
                          : item.result_summary
                        }
                      </div>
                    )}
                    <div className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">
                      {getLangName(item.source_lang)} → {getLangName(item.target_lang)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4 text-center">
              {searchQuery.trim()
                ? `${filteredHistory.length} of ${history.length} favorite words`
                : `Total ${history.length} favorite words`
              }
            </p>
          </div>
        )}
      </PageBox>
    </PageLayout>
  )
}

export default DictionaryHistoryView