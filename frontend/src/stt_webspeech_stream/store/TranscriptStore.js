/**
 * TranscriptStore - 음성 인식 결과 상태 관리
 * - final: 확정된 텍스트
 * - interim: 임시 텍스트 (실시간 표시용)
 */

class TranscriptStore {
  constructor() {
    this.finalText = ''
    this.interimText = ''
    this.listeners = new Set()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify() {
    this.listeners.forEach(listener => listener(this.getState()))
  }

  getState() {
    return {
      finalText: this.finalText,
      interimText: this.interimText,
      fullText: this.finalText + this.interimText
    }
  }

  setInterim(text) {
    this.interimText = text
    this.notify()
  }

  appendFinal(text) {
    if (!text || !text.trim()) return
    
    const trimmed = text.trim()
    const needsSpace = this.finalText && !this.finalText.endsWith(' ')
    this.finalText += (needsSpace ? ' ' : '') + trimmed
    this.interimText = ''
    this.notify()
  }

  clear() {
    this.finalText = ''
    this.interimText = ''
    this.notify()
  }
}

// 싱글톤 인스턴스
export const transcriptStore = new TranscriptStore()
export default TranscriptStore
