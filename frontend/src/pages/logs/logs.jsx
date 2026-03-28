import { useState, useRef } from 'react'
import './logs.css'

function Logs() {
  const [logAnalysis, setLogAnalysis] = useState(null)
  const [isAnalyzingLog, setIsAnalyzingLog] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // 로그 파일 업로드 및 분석 함수
  const handleLogFileUpload = async (file) => {
    if (!file) return
    
    setIsAnalyzingLog(true)
    setLogAnalysis(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const apiUrl = import.meta.env.VITE_API_URL || '/api/logs/analyze'
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogAnalysis(data.data)
      } else {
        const errorData = await response.json()
        alert(`로그 분석 실패: ${errorData.error?.message || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('Log analysis error:', error)
      alert(`로그 분석 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setIsAnalyzingLog(false)
    }
  }

  return (
    <div className="logs-page">
      <div className="logs-container">
        <h1 className="logs-title">📊 로그 파일 분석</h1>
        <p className="logs-subtitle">
          홈페이지가 구동되지 않을 때 로그 파일을 업로드하면 문제를 분석해드립니다.
        </p>
        
        <div
          className={`log-drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            const files = e.dataTransfer.files
            if (files.length > 0) {
              handleLogFileUpload(files[0])
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleLogFileUpload(e.target.files[0])
              }
            }}
          />
          <div className="drop-zone-content">
            <div className="drop-zone-icon">📁</div>
            <p className="drop-zone-text">
              {isDragOver ? '여기에 파일을 놓으세요' : '로그 파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="drop-zone-hint">.log 또는 .txt 파일 지원</p>
          </div>
        </div>

        {isAnalyzingLog && (
          <div className="analyzing-indicator">
            <div className="spinner"></div>
            <span>로그 파일 분석 중...</span>
          </div>
        )}

        {logAnalysis && (
          <div className="log-analysis-result">
            <h2 className="analysis-title">분석 결과</h2>
            
            {/* 요약 */}
            <div className="analysis-summary">
              <div className="summary-item">
                <span className="summary-label">총 라인 수:</span>
                <span className="summary-value">{logAnalysis.summary.total_lines}</span>
              </div>
              <div className="summary-item error">
                <span className="summary-label">에러:</span>
                <span className="summary-value">{logAnalysis.summary.error_count}</span>
              </div>
              <div className="summary-item warning">
                <span className="summary-label">경고:</span>
                <span className="summary-value">{logAnalysis.summary.warning_count}</span>
              </div>
              <div className="summary-item info">
                <span className="summary-label">정보:</span>
                <span className="summary-value">{logAnalysis.summary.info_count}</span>
              </div>
            </div>

            {/* 추천 사항 */}
            {logAnalysis.recommendations && logAnalysis.recommendations.length > 0 && (
              <div className="recommendations">
                <h3 className="recommendations-title">💡 추천 사항</h3>
                <ul className="recommendations-list">
                  {logAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 에러 목록 */}
            {logAnalysis.errors && logAnalysis.errors.length > 0 && (
              <div className="errors-section">
                <h3 className="errors-title">❌ 에러 목록 (최대 10개)</h3>
                <div className="errors-list">
                  {logAnalysis.errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="error-item">
                      <div className="error-header">
                        <span className="error-line">라인 {error.line}</span>
                        {error.timestamp && (
                          <span className="error-time">{error.timestamp}</span>
                        )}
                      </div>
                      <div className="error-message">{error.message}</div>
                      {error.module && (
                        <div className="error-details">
                          모듈: {error.module} / 함수: {error.function}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 에러 패턴 */}
            {Object.keys(logAnalysis.error_patterns || {}).length > 0 && (
              <div className="error-patterns">
                <h3 className="patterns-title">🔍 에러 패턴</h3>
                <div className="patterns-list">
                  {Object.entries(logAnalysis.error_patterns).map(([pattern, count]) => (
                    <div key={pattern} className="pattern-item">
                      <span className="pattern-name">{pattern}</span>
                      <span className="pattern-count">{count}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Logs

