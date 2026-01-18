/**
 * DownloadOverlay Component
 * 모델 다운로드 중 화면을 막는 오버레이
 */

import { MODEL_INFO } from '../_04_hooks'

// Whisper 모델 정보
const WHISPER_MODEL_INFO = {
  'Whisper (base.en)': { name: 'Whisper Base English', size: '~140MB' },
  'Whisper (tiny.en)': { name: 'Whisper Tiny English', size: '~75MB' },
  'Whisper (small.en)': { name: 'Whisper Small English', size: '~240MB' },
}

export function DownloadOverlay({ isVisible, modelLang, progress, statusMessage }) {
  if (!isVisible) return null

  const isWhisper = modelLang?.startsWith('Whisper')
  const info = isWhisper ? WHISPER_MODEL_INFO[modelLang] : MODEL_INFO[modelLang]

  return (
    <div className="download-overlay">
      <div className="download-overlay-content">
        <div className="download-overlay-icon">{isWhisper ? '🤖' : '⬇️'}</div>
        <h3 className="download-overlay-title">
          {isWhisper ? 'Loading Whisper Model' : 'Downloading Model'}
        </h3>
        <p className="download-overlay-model">
          {info?.name || modelLang} ({info?.size || 'Unknown size'})
        </p>
        
        <div className="download-overlay-progress">
          <div className="download-overlay-progress-bar">
            <div 
              className="download-overlay-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="download-overlay-progress-text">{progress}%</span>
        </div>
        
        {statusMessage && (
          <p className="download-overlay-status">{statusMessage}</p>
        )}
        
        <p className="download-overlay-hint">
          {isWhisper ? (
            <>
              Loading AI model for high-accuracy speech recognition.<br />
              First load may take 1-2 minutes. Cached for future use.
            </>
          ) : (
            <>
              Please wait while the model is being downloaded.<br />
              This may take a few minutes for large models.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default DownloadOverlay
