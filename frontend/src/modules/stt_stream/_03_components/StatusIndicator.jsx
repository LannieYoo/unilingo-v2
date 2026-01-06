/**
 * StatusIndicator Component
 * 상태 표시 컴포넌트
 */

import { STATUS } from '../_08_constants'

export function StatusIndicator({ status, loadProgress = 0 }) {
  if (status === STATUS.LOADING) {
    return (
      <div className="stt-stream-loading">
        <span>모델 로딩 중... {loadProgress}%</span>
        <div className="stt-stream-progress">
          <div 
            className="stt-stream-progress-bar" 
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      </div>
    )
  }

  if (status === STATUS.LISTENING) {
    return (
      <span className="stt-stream-status-listening">
        <span className="stt-stream-pulse"></span>
        실시간 인식 중...
      </span>
    )
  }

  if (status === STATUS.ERROR) {
    return (
      <span className="stt-stream-status-error">오류 - 마이크 확인</span>
    )
  }

  if (status === STATUS.READY) {
    return (
      <span className="stt-stream-status-ready">✓ 모델 준비 완료</span>
    )
  }

  return null
}

export default StatusIndicator
