/**
 * DebugStore - 디버그 로그 상태 관리
 */

class DebugStore {
  constructor() {
    this.logs = []
    this.maxLogs = 100
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify() {
    this.listeners.forEach(listener => listener(this.getLogs()))
  }

  getLogs() {
    return [...this.logs]
  }

  addLog(type, message, data = null) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type, // 'info' | 'warn' | 'error' | 'event' | 'result'
      message,
      data
    }
    
    this.logs.push(entry)
    
    // 최대 로그 수 유지
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
    
    this.notify()
  }

  clear() {
    this.logs = []
    this.notify()
  }
}

// 싱글톤 인스턴스
export const debugStore = new DebugStore()
export default DebugStore
