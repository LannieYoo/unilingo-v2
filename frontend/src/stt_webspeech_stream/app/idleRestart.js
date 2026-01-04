/**
 * idleRestart - 유휴 상태 감지 및 재시작 관리
 * 
 * Web Speech API는 일정 시간 음성이 없으면 자동 종료됨
 * 이를 감지하고 자동 재시작
 */

import { debugLogger } from './debugLogger'

export class IdleRestartManager {
  constructor(options = {}) {
    this.idleTimeout = options.idleTimeout || 5000 // 5초 유휴 후 로그
    this.forceRestartTimeout = options.forceRestartTimeout || 10000 // 10초 유휴 후 강제 재시작
    this.maxRestarts = options.maxRestarts || 10 // 연속 재시작 제한
    this.restartCount = 0
    this.lastActivityTime = Date.now()
    this.idleTimer = null
    this.onForceRestart = options.onForceRestart || (() => {})
  }

  /**
   * 활동 기록 (음성 인식 결과 수신 시 호출)
   * restartCount는 리셋하지 않음 - 실제 final 결과가 올 때만 리셋
   */
  recordActivity() {
    this.lastActivityTime = Date.now()
  }

  /**
   * 성공적인 인식 기록 (final 결과 수신 시 호출)
   * 이때만 restartCount 리셋
   */
  recordSuccess() {
    this.lastActivityTime = Date.now()
    this.restartCount = 0
    debugLogger.info('IdleRestart: success recorded, restart count reset')
  }

  /**
   * 유휴 타이머 시작
   */
  startIdleTimer() {
    this.stopIdleTimer()
    
    this.idleTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTime
      
      if (idleTime > this.forceRestartTimeout) {
        debugLogger.warn('IdleRestart: force restart triggered', { idleTime })
        this.onForceRestart()
      } else if (idleTime > this.idleTimeout) {
        debugLogger.info('IdleRestart: idle detected', { idleTime })
      }
    }, 1000)
  }

  /**
   * 유휴 타이머 중지
   */
  stopIdleTimer() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
  }

  /**
   * 재시작 가능 여부 확인
   */
  canRestart() {
    if (this.restartCount >= this.maxRestarts) {
      debugLogger.warn('IdleRestart: max restarts reached', { restartCount: this.restartCount })
      return false
    }
    return true
  }

  /**
   * 재시작 기록
   */
  recordRestart() {
    this.restartCount++
    debugLogger.info('IdleRestart: restart recorded', { restartCount: this.restartCount })
  }

  /**
   * 리셋
   */
  reset() {
    this.restartCount = 0
    this.lastActivityTime = Date.now()
    this.stopIdleTimer()
  }
}

export default IdleRestartManager
