/**
 * DictionaryHistoryView
 * Dictionary search history full view page
 */

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadHistory()
    }
  }, [isAuthenticated, tokens?.access_token])

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/dictionary" replace />
  }

  const loadHistory = async () => {
    if (!tokens?.access_token) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await authService.getDictionaryLogs(tokens.access_token, 100)
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
    <PageLayout title="Dictionary History">
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
                  book
                </span>
                <p>No dictionary search history.</p>
                <p className="text-sm mt-1">
                  Your dictionary searches will be saved automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="dictionary-history-card"
                  >
                    <div className="dictionary-history-card-header">
                      <div className="flex items-center gap-2">
                        <span className="dictionary-history-card-lang">
                          {getLangName(item.source_lang)} → {getLangName(item.target_lang)}
                        </span>
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUseSearch(item)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded transition-colors"
                        >
                          Search Again
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
                    <div className="dictionary-history-card-content">
                      <div className="dictionary-history-card-text">
                        <span className="dictionary-history-card-label">
                          {item.source === 'stt' ? 'STT Term' : 'Search Term'}
                        </span>
                        <p className="dictionary-history-card-search">{item.search_word}</p>
                      </div>
                      {item.result_summary && (
                        <div className="dictionary-history-card-text">
                          <span className="dictionary-history-card-label">Result</span>
                          <p className="dictionary-history-card-result">{item.result_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-4 text-center">
              Total {history.length} search records
            </p>
          </div>
        )}
      </PageBox>
    </PageLayout>
  )
}

export default DictionaryHistoryView