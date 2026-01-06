/**
 * RecordingView
 * 오디오 녹음 페이지 뷰
 */

import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useRecording } from '../_04_hooks'
import '../_10_styles/recording.css'

export function RecordingView() {
  const {
    isRecording,
    recordings,
    error,
    toggleRecording,
    downloadRecording,
    deleteRecording,
  } = useRecording()

  return (
    <PageLayout 
      title="Audio Recording" 
      subtitle="Record audio directly from your browser"
    >
      <PageBox>
        {/* 에러 메시지 */}
        {error && (
          <div className="recording-error">
            ⚠️ {error}
          </div>
        )}

        {/* 녹음 컨트롤 */}
        <div className="recording-controls">
          <button
            onClick={toggleRecording}
            className={`recording-btn ${isRecording ? 'recording-btn--active' : ''}`}
          >
            {isRecording ? '⏹ Stop Recording' : '▶ Start Recording'}
          </button>
        </div>

        {/* 녹음 중 인디케이터 */}
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-pulse"></span>
            Recording...
          </div>
        )}

        {/* 녹음 목록 */}
        <div className="recording-list">
          <h2 className="recording-list__title">Recordings</h2>
          
          {recordings.length === 0 ? (
            <div className="recording-list__empty">
              No recordings found. Click "Start Recording" to begin.
            </div>
          ) : (
            <div className="recording-list__grid">
              {recordings.map(recording => (
                <div key={recording.id} className="recording-item">
                  <div className="recording-item__player">
                    <audio controls src={recording.url} />
                  </div>
                  <div className="recording-item__info">
                    <div className="recording-item__time">
                      {new Date(recording.timestamp).toLocaleString('en-US')}
                    </div>
                    <div className="recording-item__actions">
                      <button
                        onClick={() => downloadRecording(recording)}
                        className="recording-item__btn recording-item__btn--download"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => deleteRecording(recording.id)}
                        className="recording-item__btn recording-item__btn--delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageBox>
    </PageLayout>
  )
}

export default RecordingView
