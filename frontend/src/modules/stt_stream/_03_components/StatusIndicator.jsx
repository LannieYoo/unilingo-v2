/**
 * StatusIndicator Component
 * Status display component
 */

import { STATUS } from '../_08_constants'

export function StatusIndicator({ status, loadProgress = 0 }) {
  if (status === STATUS.LOADING) {
    return (
      <div className="stt-stream-loading">
        <span>Loading model... {loadProgress}%</span>
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
        Listening...
      </span>
    )
  }

  if (status === STATUS.ERROR) {
    return (
      <span className="stt-stream-status-error">Error - Check microphone</span>
    )
  }

  if (status === STATUS.READY) {
    return (
      <span className="stt-stream-status-ready">✓ Model ready</span>
    )
  }

  return null
}

export default StatusIndicator
