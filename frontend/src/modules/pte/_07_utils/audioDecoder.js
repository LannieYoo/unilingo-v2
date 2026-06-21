/**
 * audioDecoder.js
 * 
 * Decodes a recorded audio Blob (WebM/MP4) to raw Float32 PCM samples at 16kHz mono.
 * Used by WASM SenseVoice and Server Whisper engines for Read Aloud analysis.
 * 
 * Also provides WAV encoding for server upload.
 */

const TARGET_SAMPLE_RATE = 16000

/**
 * Decode an audio Blob to Float32 PCM at 16kHz mono.
 * Uses OfflineAudioContext for accurate resampling.
 * 
 * @param {Blob} audioBlob - Recorded audio blob (WebM, MP4, etc.)
 * @returns {Promise<Float32Array>} Raw PCM samples at 16kHz mono
 */
export async function decodeBlobToPCM(audioBlob) {
  const arrayBuffer = await audioBlob.arrayBuffer()

  // Use OfflineAudioContext to decode and resample in one step
  // First decode at native sample rate
  const tempCtx = new (window.AudioContext || window.webkitAudioContext)()
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer)
  await tempCtx.close()

  const nativeRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  const targetLength = Math.ceil(duration * TARGET_SAMPLE_RATE)

  // If already 16kHz mono, just return the data
  if (nativeRate === TARGET_SAMPLE_RATE && audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }

  // Use OfflineAudioContext for high-quality resampling
  const offlineCtx = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start()

  const resampled = await offlineCtx.startRendering()
  return resampled.getChannelData(0)
}

/**
 * Encode Float32 PCM samples to WAV format for server upload.
 * 
 * @param {Float32Array} samples - PCM samples at 16kHz
 * @returns {Blob} WAV audio blob
 */
export function encodeWAV(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // WAV header
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)                    // Subchunk1Size
  view.setUint16(20, 1, true)                     // PCM format
  view.setUint16(22, 1, true)                     // Mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true)    // Sample rate
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true) // Byte rate
  view.setUint16(32, 2, true)                     // Block align
  view.setUint16(34, 16, true)                    // Bits per sample
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // Convert float32 to int16
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Convert audio Blob directly to WAV Blob for server upload.
 * Convenience wrapper that decodes then re-encodes.
 * 
 * @param {Blob} audioBlob - Recorded audio blob
 * @returns {Promise<Blob>} WAV audio blob at 16kHz mono
 */
export async function blobToWAV(audioBlob) {
  const pcm = await decodeBlobToPCM(audioBlob)
  return encodeWAV(pcm)
}
