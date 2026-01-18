/**
 * TranslatorView
 * 번역 페이지 뷰
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranslator } from '../_04_hooks'
import { SOURCE_LANGUAGES, TARGET_LANGUAGES, LANG_MAP } from '../_08_constants'
import { useAuthStore, authService } from '../../auth'
import '../_10_styles/translator.css'

export function TranslatorView() {
  const {
    inputText,
    outputText,
    sourceLang,
    targetLang,
    isTranslating,
    setInputText,
    setSourceLang,
    setTargetLang,
    translate,
  } = useTranslator()

  const { isAuthenticated, tokens } = useAuthStore()
  const navigate = useNavigate()
  const [recentHistory, setRecentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, text }
  const [deletingId, setDeletingId] = useState(null)
  const [togglingFavoriteId, setTogglingFavoriteId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedText, setLastSavedText] = useState('')

  // Load recent history on mount
  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      loadRecentHistory()
    }
  }, [isAuthenticated, tokens?.access_token])

  const loadRecentHistory = async () => {
    if (!tokens?.access_token) return
    
    setLoadingHistory(true)
    try {
      const data = await authService.getRecentTranslationLogs(tokens.access_token, 5)
      setRecentHistory(data.logs || [])
    } catch (err) {
      // 401 에러는 무시 (비로그인 상태)
      if (err.response?.status !== 401) {
        console.error('Failed to load translation history:', err)
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSaveToHistory = async () => {
    if (!isAuthenticated || !tokens?.access_token) {
      return
    }
    
    if (!inputText?.trim() || !outputText?.trim()) {
      return
    }
    
    setIsSaving(true)
    try {
      await authService.createTranslationLog(tokens.access_token, {
        source_text: inputText,
        translated_text: outputText,
        source_lang: LANG_MAP[sourceLang] || 'en',
        target_lang: LANG_MAP[targetLang] || 'ko',
        provider: 'google',
      })
      setLastSavedText(outputText)
      // Reload history
      await loadRecentHistory()
    } catch (err) {
      console.error('Failed to save translation:', err)
      // 네트워크 에러 또는 서버 에러 시 사용자에게 알림
      if (err.response?.status === 500) {
        alert('Failed to save translation. Please check your internet connection and try again.')
      } else {
        alert('Failed to save translation. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleHistoryClick = useCallback((item) => {
    setInputText(item.source_text)
  }, [setInputText])

  const handleDeleteClick = (e, item) => {
    e.stopPropagation() // Prevent triggering handleHistoryClick
    setDeleteConfirm({ id: item.id, text: item.source_text })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !tokens?.access_token) return
    
    setDeletingId(deleteConfirm.id)
    try {
      await authService.deleteTranslationLog(tokens.access_token, deleteConfirm.id)
      setRecentHistory(recentHistory.filter(h => h.id !== deleteConfirm.id))
    } catch (err) {
      console.error('Failed to delete translation:', err)
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm(null)
  }

  const handleToggleFavorite = async (e, item) => {
    e.stopPropagation()
    if (!tokens?.access_token || togglingFavoriteId) return
    
    setTogglingFavoriteId(item.id)
    try {
      const result = await authService.toggleTranslationFavorite(tokens.access_token, item.id)
      setRecentHistory(recentHistory.map(h => 
        h.id === item.id ? { ...h, is_favorite: result.log.is_favorite } : h
      ))
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString('en-US')
  }

  const getLangName = (code) => {
    const langMap = {
      'en': 'EN',
      'ko': 'KO',
      'zh': 'ZH',
    }
    return langMap[code] || code?.toUpperCase()
  }

  const handleSwapLanguages = () => {
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
  }

  return (
    <PageLayout title="Translator">
      <PageBox>
        {/* 언어 선택 */}
        <div className="translator-lang-selectors">
          <div className="translator-lang-group">
            <label>Source Language</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="translator-lang-select"
            >
              {SOURCE_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleSwapLanguages}
            className="translator-swap-btn"
            title="Swap languages"
          >
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>
          
          <div className="translator-lang-group translator-target-lang-group">
            <label>Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="translator-lang-select"
            >
              {TARGET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 입력 */}
        <div className="translator-section translator-input-wrapper">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to translate... (Auto-translates as you type)"
            className="translator-textarea"
            rows={8}
          />
          {inputText && (
            <button
              onClick={() => setInputText('')}
              className="translator-clear-btn"
              title="Clear text"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* 번역 버튼 */}
        <div className="translator-btn-group">
          <button
            onClick={() => translate()}
            disabled={isTranslating || !inputText?.trim()}
            className="translator-btn"
          >
            {isTranslating ? 'Translating...' : 'Translate'}
          </button>
          
          {/* Save to History 버튼 */}
          {isAuthenticated && outputText && (
            <button
              onClick={handleSaveToHistory}
              disabled={isSaving || !outputText?.trim() || outputText === lastSavedText}
              className="translator-save-btn"
              title={outputText === lastSavedText ? 'Already saved' : 'Save to History'}
            >
              <span className="material-symbols-outlined">
                {outputText === lastSavedText ? 'bookmark' : 'bookmark_add'}
              </span>
              <span className="translator-save-btn-text">
                {isSaving ? 'Saving...' : outputText === lastSavedText ? 'Saved' : 'Save'}
              </span>
            </button>
          )}
        </div>

        {/* Target Language (모바일에서만 표시) */}
        <div className="translator-target-lang-mobile">
          <label>Target Language</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="translator-lang-select"
          >
            {TARGET_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* 출력 */}
        <div className="translator-section">
          <textarea
            value={outputText}
            readOnly
            placeholder="Translation result will appear here..."
            className="translator-textarea translator-textarea--output"
            rows={8}
          />
        </div>

        {/* 최근 번역 히스토리 */}
        {isAuthenticated && (
          <div className="translator-history">
            <div className="translator-history-header">
              <h3 className="translator-history-title">
                <span className="material-symbols-outlined">history</span>
                Recent Translations
              </h3>
              <button
                onClick={() => navigate('/translator/history')}
                className="translator-history-view-all"
              >
                View All
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="translator-history-loading">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : recentHistory.length === 0 ? (
              <p className="translator-history-empty">No translation history.</p>
            ) : (
              <div className="translator-history-list">
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="translator-history-item"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="translator-history-item-header">
                      <span className="translator-history-lang">
                        {getLangName(item.source_lang)} → {getLangName(item.target_lang)}
                      </span>
                      <div className="translator-history-actions">
                        <span className="translator-history-time">
                          {formatDate(item.created_at)}
                        </span>
                        <button
                          onClick={(e) => handleToggleFavorite(e, item)}
                          className={`translator-history-favorite ${item.is_favorite ? 'active' : ''}`}
                          title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          disabled={togglingFavoriteId === item.id}
                        >
                          <span className="material-symbols-outlined">
                            {item.is_favorite ? 'star' : 'star_outline'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, item)}
                          className="translator-history-delete"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    </div>
                    <div className="translator-history-text">
                      <span className="translator-history-source">{item.source_text}</span>
                      <span className="translator-history-arrow">→</span>
                      <span className="translator-history-target">{item.translated_text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="translator-modal-overlay" onClick={handleDeleteCancel}>
            <div className="translator-modal" onClick={(e) => e.stopPropagation()}>
              <h4>Delete Translation</h4>
              <p>Are you sure you want to delete this translation?</p>
              <p className="translator-modal-preview">"{deleteConfirm.text?.substring(0, 50)}{deleteConfirm.text?.length > 50 ? '...' : ''}"</p>
              <div className="translator-modal-actions">
                <button onClick={handleDeleteCancel} className="translator-modal-btn translator-modal-btn--cancel">
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm} 
                  className="translator-modal-btn translator-modal-btn--delete"
                  disabled={deletingId === deleteConfirm.id}
                >
                  {deletingId === deleteConfirm.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageBox>
    </PageLayout>
  )
}

export default TranslatorView
