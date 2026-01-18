// MissingSegmentProcessor - Missing segment 감지 및 처리
// 백엔드 Vosk 처리 요청 및 큐 관리

export class MissingSegmentProcessor {
  constructor(audioBuffer, backendUrl, minDuration = 0.5) {
    this.audioBuffer = audioBuffer
    this.backendUrl = backendUrl
    this.minDuration = minDuration
    this.queue = []
    this.processing = false
    this.concurrentRequests = 0
    this.maxConcurrentRequests = 2
  }

  async processMissingSegment(startTime, endTime) {
    const duration = endTime - startTime

    console.log('[MissingSegment] Processing request:', {
      startTime: startTime.toFixed(3),
      endTime: endTime.toFixed(3),
      duration: duration.toFixed(3)
    })

    if (duration < this.minDuration) {
      console.log('[MissingSegment] Duration too short, skipping')
      return null
    }

    return new Promise((resolve) => {
      const request = { 
        startTime, 
        endTime,
        resolve
      }
      
      this.queue.push(request)
      console.log('[MissingSegment] Added to queue. Queue size:', this.queue.length)

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      if (this.concurrentRequests >= this.maxConcurrentRequests) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      const request = this.queue.shift()
      await this.processRequest(request)
    }

    this.processing = false
  }

  async processRequest(request) {
    this.concurrentRequests++

    try {
      console.log('[MissingSegment] Extracting audio segment...')
      
      const audioSegment = this.audioBuffer.extractSegment(
        request.startTime,
        request.endTime
      )

      if (!audioSegment) {
        console.log('[MissingSegment] Failed to extract audio segment')
        request.resolve(null)
        return
      }

      console.log('[MissingSegment] Audio segment extracted, size:', audioSegment.length)
      console.log('[MissingSegment] Converting to WAV...')

      const wavBlob = this.audioBuffer.toWAV(audioSegment, 16000)
      const base64Audio = await this.blobToBase64(wavBlob)

      console.log('[MissingSegment] Sending to backend:', this.backendUrl)

      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio.split(',')[1],
          start_time: request.startTime,
          end_time: request.endTime,
          language: 'en-us'
        })
      })

      if (!response.ok) {
        console.error('[MissingSegment] Backend request failed:', response.status)
        throw new Error(`Backend request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('[MissingSegment] Backend response:', result)

      request.resolve({
        text: result.text || '',
        startTime: result.start_time,
        endTime: result.end_time
      })

    } catch (error) {
      console.error('[MissingSegment] Processing failed:', error)
      request.resolve(null)
    } finally {
      this.concurrentRequests--
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  getQueueSize() {
    return this.queue.length
  }

  clearQueue() {
    this.queue = []
  }
}
