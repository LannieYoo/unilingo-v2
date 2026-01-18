// AudioBufferManager - 오디오 버퍼링 및 관리
// Rolling buffer로 최근 10초 오디오 유지, WAV 변환 지원

export class AudioBufferManager {
  constructor(maxDurationSeconds = 10) {
    this.maxDuration = maxDurationSeconds
    this.sampleRate = 16000
    this.chunks = []
    this.totalSamples = 0
  }

  addChunk(audioData, timestamp) {
    if (!audioData || audioData.length === 0) return

    this.chunks.push({
      data: new Float32Array(audioData),
      timestamp: timestamp,
      samples: audioData.length
    })

    this.totalSamples += audioData.length
    this.trim()
  }

  extractSegment(startTime, endTime) {
    if (this.chunks.length === 0) return null

    const startSample = Math.floor(startTime * this.sampleRate)
    const endSample = Math.floor(endTime * this.sampleRate)
    const segmentLength = endSample - startSample

    if (segmentLength <= 0) return null

    const firstChunkTime = this.chunks[0].timestamp
    const relativeStartTime = startTime - firstChunkTime
    const relativeEndTime = endTime - firstChunkTime

    if (relativeStartTime < 0 || relativeEndTime > this.maxDuration) {
      return null
    }

    const relativeStartSample = Math.floor(relativeStartTime * this.sampleRate)
    const relativeEndSample = Math.floor(relativeEndTime * this.sampleRate)

    const segment = new Float32Array(relativeEndSample - relativeStartSample)
    let segmentOffset = 0
    let currentSample = 0

    for (const chunk of this.chunks) {
      const chunkEnd = currentSample + chunk.samples

      if (chunkEnd > relativeStartSample && currentSample < relativeEndSample) {
        const copyStart = Math.max(0, relativeStartSample - currentSample)
        const copyEnd = Math.min(chunk.samples, relativeEndSample - currentSample)
        const copyLength = copyEnd - copyStart

        segment.set(
          chunk.data.subarray(copyStart, copyEnd),
          segmentOffset
        )
        segmentOffset += copyLength
      }

      currentSample = chunkEnd

      if (currentSample >= relativeEndSample) break
    }

    return segment
  }

  toWAV(audioData, sampleRate = 16000) {
    if (!audioData || audioData.length === 0) {
      throw new Error('No audio data to convert')
    }

    const numChannels = 1
    const bitsPerSample = 16
    const bytesPerSample = bitsPerSample / 8
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = audioData.length * bytesPerSample
    const bufferSize = 44 + dataSize

    const buffer = new ArrayBuffer(bufferSize)
    const view = new DataView(buffer)

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, bufferSize - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    let offset = 44
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  trim() {
    const maxSamples = this.maxDuration * this.sampleRate

    while (this.totalSamples > maxSamples && this.chunks.length > 0) {
      const removed = this.chunks.shift()
      this.totalSamples -= removed.samples
    }
  }

  getStatus() {
    return {
      size: this.totalSamples,
      duration: this.totalSamples / this.sampleRate,
      chunks: this.chunks.length
    }
  }

  clear() {
    this.chunks = []
    this.totalSamples = 0
  }
}
