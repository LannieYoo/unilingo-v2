/**
 * ModelDownloadManager Component
 * 모델 다운로드 상태 표시 및 관리 UI (Vosk + Whisper 지원)
 */

import { useState } from 'react'
import { useModelCache, MODEL_INFO } from '../_04_hooks'
import { LANGUAGE_OPTIONS } from '../_08_constants'

export function ModelDownloadManager({ selectedLang, whisperHook }) {
  const {
    cachedModels,
    downloadingModel,
    downloadProgress,
    isChecking,
    downloadModel,
    deleteModel,
  } = useModelCache()

  const [expandedView, setExpandedView] = useState(false)

  // Check if selected language uses Whisper
  const langOption = LANGUAGE_OPTIONS.find(l => l.value === selectedLang)
  const usesWhisper = langOption?.usesWhisper || false

  // Whisper 모드인 경우
  if (usesWhisper && whisperHook) {
    const { isModelReady, isDownloading, downloadProgress: whisperProgress, downloadModel: whisperDownload } = whisperHook

    return (
      <div className="model-download-manager whisper-mode">
        <div className="model-download-summary">
          <div className="model-download-status">
            {isModelReady ? (
              <span className="model-cached">
                ✓ Whisper base.en model ready (140MB)
              </span>
            ) : (
              <span className="model-not-cached">
                ⚠ Whisper base.en model requires download (140MB, takes 2-5 minutes)
              </span>
            )}
          </div>
          
          {!isModelReady && !isDownloading && (
            <button
              className="model-download-btn primary"
              onClick={() => whisperDownload('base.en')}
            >
              Download Whisper Model (140MB)
            </button>
          )}
          
          {isDownloading && (
            <div className="model-download-progress-inline">
              <div className="model-progress-bar">
                <div 
                  className="model-progress-fill"
                  style={{ width: `${whisperProgress}%` }}
                />
              </div>
              <span className="model-progress-text">{whisperProgress}%</span>
            </div>
          )}
        </div>
        
        <div className="model-download-hint">
          💡 Whisper provides high accuracy for various English accents (US, UK, Indian, Middle Eastern)
        </div>
      </div>
    )
  }

  // Vosk 모드 (기존 로직)
  const isCurrentCached = cachedModels[selectedLang]
  const currentInfo = MODEL_INFO[selectedLang]

  const uncachedCount = LANGUAGE_OPTIONS.filter(
    lang => !lang.usesWhisper && !cachedModels[lang.value]
  ).length

  const handleDownload = async (lang) => {
    await downloadModel(lang)
  }

  const handleDelete = async (lang) => {
    if (window.confirm(`Delete ${MODEL_INFO[lang]?.name || lang} model from cache?`)) {
      await deleteModel(lang)
    }
  }

  if (isChecking) {
    return (
      <div className="model-download-manager">
        <div className="model-download-checking">
          Checking cached models...
        </div>
      </div>
    )
  }

  return (
    <div className="model-download-manager">
      <div className="model-download-summary">
        <div className="model-download-status">
          {isCurrentCached ? (
            <span className="model-cached">
              ✓ {currentInfo?.name || selectedLang} model cached
            </span>
          ) : (
            <span className="model-not-cached">
              ⚠ {currentInfo?.name || selectedLang} model requires download (takes 2-5 minutes)
              {currentInfo?.large && <span className="model-large-badge">Large</span>}
            </span>
          )}
        </div>
        
        {!isCurrentCached && !downloadingModel && (
          <button
            className="model-download-btn primary"
            onClick={() => handleDownload(selectedLang)}
          >
            Download ({currentInfo?.size || '~40MB'})
          </button>
        )}
        
        {downloadingModel === selectedLang && (
          <div className="model-download-progress-inline">
            <div className="model-progress-bar">
              <div 
                className="model-progress-fill"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <span className="model-progress-text">{downloadProgress}%</span>
          </div>
        )}
        
        <button
          className="model-manage-btn"
          onClick={() => setExpandedView(!expandedView)}
        >
          {expandedView ? 'Hide' : 'Manage'} ({uncachedCount} not downloaded)
        </button>
      </div>

      {expandedView && (
        <div className="model-download-expanded">
          <div className="model-download-header">
            <h4>Speech Recognition Models</h4>
            <p className="model-download-hint">
              Models require one-time download (2-5 minutes). Once downloaded, they work offline. English uses Whisper (browser-based, no download needed for UI).
            </p>
          </div>
          
          <div className="model-list">
            {LANGUAGE_OPTIONS.filter(lang => !lang.usesWhisper).map(lang => {
              const info = MODEL_INFO[lang.value]
              const isCached = cachedModels[lang.value]
              const isDownloading = downloadingModel === lang.value
              const isSelected = selectedLang === lang.value
              const isLarge = info?.large || lang.large
              
              return (
                <div 
                  key={lang.value}
                  className={`model-item ${isSelected ? 'selected' : ''} ${isCached ? 'cached' : ''} ${isLarge ? 'large' : ''}`}
                >
                  <div className="model-item-info">
                    <span className="model-item-name">
                      {lang.label}
                      {info?.recommended && <span className="model-recommended" title="Recommended for better accuracy">★</span>}
                      {isLarge && <span className="model-large-tag">Large</span>}
                    </span>
                    <span className="model-item-size">{info?.size || '~40MB'}</span>
                  </div>
                  
                  <div className="model-item-actions">
                    {isDownloading ? (
                      <div className="model-item-progress">
                        <div className="model-progress-bar small">
                          <div 
                            className="model-progress-fill"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <span>{downloadProgress}%</span>
                      </div>
                    ) : isCached ? (
                      <>
                        <span className="model-cached-badge">✓ Cached</span>
                        <button
                          className="model-delete-btn"
                          onClick={() => handleDelete(lang.value)}
                          title="Delete from cache"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        className="model-download-btn"
                        onClick={() => handleDownload(lang.value)}
                        disabled={!!downloadingModel}
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelDownloadManager
