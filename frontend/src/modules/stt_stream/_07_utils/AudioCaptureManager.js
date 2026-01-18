// AudioCaptureManager - 마이크에서 오디오 캡처 및 버퍼링
// AudioWorklet 기반 효율적 오디오 처리

export class AudioCaptureManager {
  constructor(
    sampleRate = 16000,
    chunkDuration = 30,
    bufferDuration = 3000
  ) {
    this.sampleRate = sampleRate
    this.chunkDuration = chunkDuration
    this.bufferDuration = bufferDuration
    
    this.audioContext = null
    this.mediaStream = null
    this.source = null
    this.processor = null
    
    this.buffer = []
    this.bufferSize = Math.floor((bufferDuration / 1000) * sampleRate)
    this.chunkSize = Math.floor((chunkDuration / 1000) * sampleRate)
    
    this.isCapturing = false
    this.onBufferCallback = null
  }

  async start(onBuffer) {
    if (this.isCapturing) {
      console.warn('Already capturing')
      return
    }

    this.onBufferCallback = onBuffer

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      })

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream)

      // ScriptProcessorNode 사용 (AudioWorklet은 나중에 마이그레이션)
      const bufferSize = 4096
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

      this.processor.onaudioprocess = (e) => {
        if (!this.isCapturing) return

        const inputData = e.inputBuffer.getChannelData(0)
        const audioData = new Float32Array(inputData)

        this.addToBuffer(audioData)
      }

      this.source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.isCapturing = true

    } catch (error) {
      console.error('Failed to start audio capture:', error)
      throw error
    }
  }

  addToBuffer(audioData) {
    this.buffer.push(...audioData)

    if (this.buffer.length >= this.bufferSize) {
      const bufferToSend = new Float32Array(this.buffer.slice(0, this.bufferSize))
      
      if (this.onBufferCallback) {
        this.onBufferCallback(bufferToSend)
      }

      const overlap = Math.floor(this.sampleRate * 0.5)
      this.buffer = this.buffer.slice(this.bufferSize - overlap)
    }
  }

  stop() {
    this.isCapturing = false

    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.buffer = []
    this.onBufferCallback = null
  }

  getCurrentBuffer() {
    return new Float32Array(this.buffer)
  }

  getStatus() {
    return {
      isCapturing: this.isCapturing,
      bufferSize: this.buffer.length,
      bufferDuration: (this.buffer.length / this.sampleRate) * 1000
    }
  }
}
