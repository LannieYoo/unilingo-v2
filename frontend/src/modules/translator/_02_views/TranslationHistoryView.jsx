/**
 * TranslationHistoryView
 * Translation history full view page
 */

import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useAuthStore, authService } from '../../auth'
import '../_10_styles/translator.css'

export function TranslationHistoryView() {
  const { isAuthenticated, tokens } = useAuthStore()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'favorites'

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadHistory()
    }
  }, [isAuthenticated, tokens?.access_token, filter])

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/translator" replace />
  }

  const loadHistory = async () => {
    if (!tokens?.access_token) return
    
    setLoading(true)
    setError(null)
    try {
      let data
      if (filter === 'favorites') {
        data = await authService.getFavoriteTranslationLogs(tokens.access_token, 100)
      } else {
        data = await authService.getTranslationLogs(tokens.access_token, 100)
      }
      setHistory(data.logs || [])
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (logId) => {
    if (!tokens?.access_token) return
    
    setDeletingId(logId)
    try {
      await authService.deleteTranslationLog(tokens.access_token, logId)
      setHistory(history.filter(h => h.id !== logId))
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleFavorite = async (logId) => {
    if (!tokens?.access_token || togglingFavoriteId) return
    
    setTogglingFavoriteId(logId)
    try {
      const result = await authService.toggleTranslationFavorite(tokens.access_token, logId)
      if (filter === 'favorites' && !result.log.is_favorite) {
        // Remove from list if we're viewing favorites and it was unfavorited
        setHistory(history.filter(h => h.id !== logId))
      } else {
        setHistory(history.map(h => 
          h.id === logId ? { ...h, is_favorite: result.log.is_favorite } : h
        ))
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle favorite')
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  const handleUseTranslation = (item) => {
    // Navigate to translator with the source text
    navigate('/translator', { state: { sourceText: item.source_text } })
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
    }
    return langMap[code] || code?.toUpperCase()
  }

  return (
    <PageLayout 
      title="Translation History" 
      subtitle="View and manage your translation history"
    >
      <PageBox>
        {/* Back button */}
        <button
          onClick={() => navigate('/translator')}
          className="mb-4 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 text-text-light dark:text-text-dark rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
        >
          ← Back to Translator
        </button>

        {/* Filter Tabs */}
        <div className="translation-history-tabs">
          <button
            onClick={() => setFilter('all')}
            className={`translation-history-tab ${filter === 'all' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">list</span>
            All
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`translation-history-tab ${filter === 'favorites' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">star</span>
            Favorites
          </button>
        </div>

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
          <div className="translation-history-full">
            {history.length === 0 ? (
              <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark">
                <span className="material-symbols-outlined text-4xl mb-2 block">
                  {filter === 'favorites' ? 'star_outline' : 'translate'}
                </span>
                <p>{filter === 'favorites' ? 'No favorite translations.' : 'No translation history.'}</p>
                <p className="text-sm mt-1">
                  {filter === 'favorites' 
                    ? 'Star translations to add them to your favorites.' 
                    : 'Your translations will be saved automatically.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="translation-history-card"
                  >
                    <div className="translation-history-card-header">
                      <div className="flex items-center gap-2">
                        <span className="translation-history-card-lang">
                          {getLangName(item.source_lang)} → {getLangName(item.target_lang)}
                        </span>
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(item.id)}
                          disabled={togglingFavoriteId === item.id}
                          className={`translation-history-card-favorite ${item.is_favorite ? 'active' : ''}`}
                          title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <span className="material-symbols-outlined">
                            {item.is_favorite ? 'star' : 'star_outline'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleUseTranslation(item)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded transition-colors"
                        >
                          Use
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded transition-colors disabled:opacity-50"
                        >
                          {deletingId === item.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    <div className="translation-history-card-content">
                      <div className="translation-history-card-text">
                        <span className="translation-history-card-label">Source</span>
                        <p className="translation-history-card-source">{item.source_text}</p>
                      </div>
                      <div className="translation-history-card-text">
                        <span className="translation-history-card-label">Translation</span>
                        <p className="translation-history-card-target">{item.translated_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4 text-center">
              Total {history.length} translation records
            </p>
          </div>
        )}
      </PageBox>
    </PageLayout>
  )
}

export default TranslationHistoryView
