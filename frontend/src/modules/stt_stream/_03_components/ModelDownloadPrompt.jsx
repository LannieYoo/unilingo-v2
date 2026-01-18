/**
 * ModelDownloadPrompt Component
 * 모델 다운로드 전 사용자 확인 모달
 */

export function ModelDownloadPrompt({ isOpen, onConfirm, onCancel, modelInfo }) {
  if (!isOpen) return null

  return (
    <div className="model-prompt-overlay" onClick={onCancel}>
      <div className="model-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="model-prompt-header">
          <h3>Download Speech Recognition Model</h3>
          <button className="model-prompt-close" onClick={onCancel}>✕</button>
        </div>
        
        <div className="model-prompt-content">
          <div className="model-prompt-icon">📥</div>
          
          <div className="model-prompt-info">
            <p className="model-prompt-title">
              {modelInfo?.name || 'Whisper base.en'} Model Required
            </p>
            <p className="model-prompt-description">
              This model provides high-accuracy speech recognition for English with support for various accents.
            </p>
          </div>
          
          <div className="model-prompt-details">
            <div className="model-prompt-detail-item">
              <span className="model-prompt-detail-label">Size:</span>
              <span className="model-prompt-detail-value">{modelInfo?.size || '140MB'}</span>
            </div>
            <div className="model-prompt-detail-item">
              <span className="model-prompt-detail-label">Download time:</span>
              <span className="model-prompt-detail-value">2-5 minutes</span>
            </div>
            <div className="model-prompt-detail-item">
              <span className="model-prompt-detail-label">Storage:</span>
              <span className="model-prompt-detail-value">Browser cache (offline use)</span>
            </div>
          </div>
          
          <div className="model-prompt-features">
            <p className="model-prompt-features-title">Features:</p>
            <ul>
              <li>✓ High accuracy for US, UK, Indian, Middle Eastern English</li>
              <li>✓ Works offline after download</li>
              <li>✓ 2+ hour continuous recording</li>
              <li>✓ One-time download</li>
            </ul>
          </div>
        </div>
        
        <div className="model-prompt-actions">
          <button className="model-prompt-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="model-prompt-btn primary" onClick={onConfirm}>
            Download Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModelDownloadPrompt
