// TranscriptDeduplicator - 오버랩 오디오로 인한 중복 텍스트 제거
// 유사도 기반 매칭으로 중복 부분 감지 및 제거

export class TranscriptDeduplicator {
  constructor(overlapThreshold = 0.7) {
    this.overlapThreshold = overlapThreshold
    this.lastText = ''
  }

  addText(newText) {
    if (!newText || newText.trim() === '') {
      return ''
    }

    if (!this.lastText) {
      this.lastText = newText
      return newText
    }

    const deduplicated = this.removeDuplicate(this.lastText, newText)
    this.lastText = this.lastText + ' ' + deduplicated

    return deduplicated
  }

  removeDuplicate(existing, newText) {
    const existingWords = existing.trim().split(/\s+/)
    const newWords = newText.trim().split(/\s+/)

    if (existingWords.length === 0) return newText
    if (newWords.length === 0) return ''

    let bestOverlap = 0
    let bestOverlapIndex = 0

    const maxOverlap = Math.min(existingWords.length, newWords.length, 20)

    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      const existingEnd = existingWords.slice(-overlap)
      const newStart = newWords.slice(0, overlap)

      const similarity = this.calculateSimilarity(existingEnd, newStart)

      if (similarity >= this.overlapThreshold) {
        bestOverlap = overlap
        bestOverlapIndex = overlap
        break
      }
    }

    if (bestOverlap > 0) {
      const uniqueWords = newWords.slice(bestOverlapIndex)
      return uniqueWords.join(' ')
    }

    return newText
  }

  calculateSimilarity(words1, words2) {
    if (words1.length !== words2.length) return 0

    let matches = 0
    for (let i = 0; i < words1.length; i++) {
      if (this.normalizeWord(words1[i]) === this.normalizeWord(words2[i])) {
        matches++
      }
    }

    return matches / words1.length
  }

  normalizeWord(word) {
    return word.toLowerCase().replace(/[^\w]/g, '')
  }

  reset() {
    this.lastText = ''
  }

  getLastText() {
    return this.lastText
  }
}
