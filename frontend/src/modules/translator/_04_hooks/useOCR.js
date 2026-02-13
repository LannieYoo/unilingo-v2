/**
 * useOCR hook
 * Tesseract.js를 사용한 이미지 텍스트 추출
 */

import { useState } from 'react'
import { createWorker } from 'tesseract.js'

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const extractText = async (imageFile, language = 'eng+kor') => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const { data: { text } } = await worker.recognize(imageFile)
      await worker.terminate()

      setIsProcessing(false)
      setProgress(100)
      return text.trim()
    } catch (err) {
      console.error('OCR Error:', err)
      setError(err.message || 'Failed to extract text from image')
      setIsProcessing(false)
      throw err
    }
  }

  return {
    extractText,
    isProcessing,
    progress,
    error,
  }
}
