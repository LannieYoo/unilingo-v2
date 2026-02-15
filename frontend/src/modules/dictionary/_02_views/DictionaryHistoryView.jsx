/**
 * DictionaryHistoryView
 * Dictionary search history full view page
 */

import { useState, useEffect, useRef } from 'react'
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
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const observerTarget = useRef(null)

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadHistory(1)
    }
  }, [isAuthenticated, tokens?.access_token])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loadingMore, loading])

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/dictionary" replace />
  }

  const loadHistory = async (pageNum) => {
    if (!tokens?.access_token) return
    
    setLoading(true)
    setError(null)
    try {
      const limit = 20
      const offset = (pageNum - 1) * limit
      const data = await authService.getDictionaryLogs(tokens.access_token, limit + 1, offset)
      console.log('[DictionaryHistory] API response:', data.logs)
      const favorites = (data.logs || [])
        .filter(log => log.is_favorite)
        .map(log => {
          // search_results에서 번역 추출
          let resultSummary = null
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
                resultSummary = firstResult.simpleTranslation
              }
              // 2. meanings의 첫 번째 정의의 translation 사용
              else if (firstResult.meanings && firstResult.meanings.length > 0) {
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
          
          return {
            ...log,
            result_summary: resultSummary
          }
        })
      console.log('[DictionaryHistory] Favorites:', favorites)
      
      if (favorites.length <= limit) {
        setHasMore(false)
        setHistory(favorites)
      } else {
        setHasMore(true)
        setHistory(favorites.slice(0, limit))
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!tokens?.access_token || loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const limit = 20
      const offset = (nextPage - 1) * limit
      const data = await authService.getDictionaryLogs(tokens.access_token, limit + 1, offset)
      const favorites = (data.logs || [])
        .filter(log => log.is_favorite)
        .map(log => {
          // search_results에서 번역 추출
          let resultSummary = null
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
                resultSummary = firstResult.simpleTranslation
              }
              // 2. meanings의 첫 번째 정의의 translation 사용
              else if (firstResult.meanings && firstResult.meanings.length > 0) {
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
          
          return {
            ...log,
            result_summary: resultSummary
          }
        })
      
      if (favorites.length <= limit) {
        setHasMore(false)
        setHistory(prev => [...prev, ...favorites])
      } else {
        setHasMore(true)
        setHistory(prev => [...prev, ...favorites.slice(0, limit)])
      }
      setPage(nextPage)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleDelete = async (logId) => {
    if (!tokens?.access_token) return
    
    setDeletingId(logId)
    try {
      await authService.deleteDictionaryLog(tokens.access_token, logId)
      setHistory(history.filter(h => h.id !== logId))
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUseSearch = (item) => {
    // Navigate to dictionary with the search term
    navigate('/dictionary', { state: { searchTerm: item.search_word, targetLang: item.target_lang } })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('en-US')
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
            {history.length === 0 ? (
              <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark">
                <span className="material-symbols-outlined text-4xl mb-2 block">
                  star
                </span>
                <p>No favorite words yet.</p>
                <p className="text-sm mt-1">
                  Click the star icon when searching to save your favorite words.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="dictionary-history-card-compact"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg truncate">{item.search_word}</div>
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
                        {item.result_summary}
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
              Total {history.length} favorite words
            </p>

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="py-4 text-center">
                {loadingMore && (
                  <div className="flex justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            )}

            {/* End message */}
            {!hasMore && history.length > 0 && (
              <div className="py-4 text-center text-sm text-text-muted-light dark:text-text-muted-dark">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <p className="mt-1">You've reached the end</p>
              </div>
            )}
          </div>
        )}
      </PageBox>
    </PageLayout>
  )
}

export default DictionaryHistoryView