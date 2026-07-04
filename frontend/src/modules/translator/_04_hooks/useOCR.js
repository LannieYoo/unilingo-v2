/**
 * Browser-local OCR hook.
 *
 * Runs on-device with tesseract.js/WASM, so it does not use the Linux GPU
 * model server. Subtitle images get several canvas preprocessing passes and
 * the best OCR result is selected.
 */

import { useState } from 'react'
import { createWorker } from 'tesseract.js'

const MAX_OCR_DIMENSION = 2200

function clamp(value) {
  return Math.max(0, Math.min(255, value))
}

function getOcrLanguage(language) {
  if (!language || language === 'eng') return 'eng+kor'
  if (language.includes('eng') || language.includes('kor')) return language
  return `${language}+eng`
}

function getImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    image.src = url
  })
}

function createScaledCanvas(image) {
  const scale = Math.min(3, Math.max(1.5, MAX_OCR_DIMENSION / Math.max(image.width, image.height)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function cloneCanvas(source) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  canvas.getContext('2d').drawImage(source, 0, 0)
  return canvas
}

function toHighContrastCanvas(source) {
  const canvas = cloneCanvas(source)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const histogram = new Array(256).fill(0)

  for (let i = 0; i < imageData.data.length; i += 4) {
    const gray = clamp((imageData.data[i] * 0.299) + (imageData.data[i + 1] * 0.587) + (imageData.data[i + 2] * 0.114))
    const enhanced = clamp((gray - 128) * 1.9 + 128)
    histogram[Math.round(enhanced)] += 1
  }

  const total = canvas.width * canvas.height
  let sum = 0
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i]

  let sumB = 0
  let wB = 0
  let bestVariance = 0
  let threshold = 150
  for (let i = 0; i < 256; i += 1) {
    wB += histogram[i]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += i * histogram[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) ** 2
    if (variance > bestVariance) {
      bestVariance = variance
      threshold = i
    }
  }

  for (let i = 0; i < imageData.data.length; i += 4) {
    const gray = clamp((imageData.data[i] * 0.299) + (imageData.data[i + 1] * 0.587) + (imageData.data[i + 2] * 0.114))
    const enhanced = clamp((gray - 128) * 1.9 + 128)
    const value = enhanced < threshold ? 0 : 255
    imageData.data[i] = value
    imageData.data[i + 1] = value
    imageData.data[i + 2] = value
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function toSubtitleMaskCanvas(source) {
  const canvas = cloneCanvas(source)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max === 0 ? 0 : (max - min) / max
    const isColoredCaption = saturation > 0.24 && max > 95
    const isWhiteCaption = r > 172 && g > 172 && b > 172 && saturation < 0.28
    const value = isColoredCaption || isWhiteCaption ? 0 : 255
    imageData.data[i] = value
    imageData.data[i + 1] = value
    imageData.data[i + 2] = value
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

async function buildOcrCandidates(imageFile) {
  if (typeof document === 'undefined') return [{ label: 'original', source: imageFile }]
  const image = await getImageFromFile(imageFile)
  const scaled = createScaledCanvas(image)
  const candidates = [
    { label: 'subtitle-mask', canvas: toSubtitleMaskCanvas(scaled) },
    { label: 'high-contrast', canvas: toHighContrastCanvas(scaled) },
    { label: 'scaled', canvas: scaled },
  ]
  return [
    { label: 'original', source: imageFile },
    ...await Promise.all(candidates.map(async (candidate) => ({
      label: candidate.label,
      source: await canvasToBlob(candidate.canvas),
    }))),
  ].filter((candidate) => candidate.source)
}

function scoreOcrText(text = '') {
  const cleaned = text.trim()
  if (!cleaned) return 0
  const words = cleaned.match(/[A-Za-z가-힣]{2,}/g) || []
  const readableWords = words.filter((word) => /[가-힣]/.test(word) || /[aeiouy]/i.test(word) || word.length <= 3)
  const usefulChars = (cleaned.match(/[A-Za-z가-힣0-9]/g) || []).length
  const noisyChars = (cleaned.match(/[=|_\\/[{}<>~^`]/g) || []).length
  return usefulChars + readableWords.length * 8 - noisyChars * 5
}

function normalizeOcrText(text = '') {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[|]{2,}/g, ' ')
    .trim()
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const extractText = async (imageFile, language = 'eng+kor') => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const ocrLanguage = getOcrLanguage(language)
      const candidates = await buildOcrCandidates(imageFile)
      let activeCandidateIndex = 0
      const worker = await createWorker(ocrLanguage, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const candidateProgress = (activeCandidateIndex + m.progress) / candidates.length
            setProgress(Math.min(99, Math.round(candidateProgress * 100)))
          }
        },
      })

      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '6',
        user_defined_dpi: '300',
      })

      let bestText = ''
      let bestScore = -Infinity
      for (let i = 0; i < candidates.length; i += 1) {
        activeCandidateIndex = i
        const { data: { text } } = await worker.recognize(candidates[i].source)
        const normalized = normalizeOcrText(text)
        const score = scoreOcrText(normalized)
        if (score > bestScore) {
          bestScore = score
          bestText = normalized
        }
      }
      await worker.terminate()

      setProgress(100)
      return bestText
    } catch (err) {
      console.error('OCR Error:', err)
      setError(err.message || 'Failed to extract text from image')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    extractText,
    isProcessing,
    progress,
    error,
  }
}
