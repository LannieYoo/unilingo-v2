/**
 * useAI Hook
 * 
 * React hook for on-device AI features powered by Transformers.js.
 * Runs inference in a Web Worker to avoid blocking the UI.
 * 
 * Features:
 *   - checkGrammar(text) → corrected text
 *   - getSimilarWords(word, candidates) → ranked similar words
 *   - suggestWords(maskedText) → fill-mask suggestions
 * 
 * Also provides model loading state and progress for UI indicators.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

let sharedWorker = null
let workerRefCount = 0
let requestId = 0

function getSharedWorker() {
  if (!sharedWorker) {
    sharedWorker = new Worker(
      new URL('../workers/aiWorker.js', import.meta.url),
      { type: 'module' }
    )
  }
  workerRefCount++
  return sharedWorker
}

function releaseSharedWorker() {
  workerRefCount--
  if (workerRefCount <= 0 && sharedWorker) {
    sharedWorker.terminate()
    sharedWorker = null
    workerRefCount = 0
  }
}

export function useAI() {
  const workerRef = useRef(null)
  const callbacksRef = useRef(new Map())
  const [modelStates, setModelStates] = useState({})
  // modelStates: { [task]: { loading: bool, progress: number, ready: bool } }

  useEffect(() => {
    const worker = getSharedWorker()
    workerRef.current = worker

    const handleMessage = (e) => {
      const { type, id, result, error, task, progress } = e.data

      switch (type) {
        case 'result': {
          const cb = callbacksRef.current.get(id)
          if (cb) {
            callbacksRef.current.delete(id)
            cb.resolve(result)
          }
          break
        }
        case 'error': {
          const cb = callbacksRef.current.get(id)
          if (cb) {
            callbacksRef.current.delete(id)
            cb.reject(new Error(error))
          }
          break
        }
        case 'model-loading':
          setModelStates(prev => ({
            ...prev,
            [task]: { loading: true, progress: 0, ready: false }
          }))
          break
        case 'model-progress':
          setModelStates(prev => ({
            ...prev,
            [task]: { loading: true, progress: progress || 0, ready: false }
          }))
          break
        case 'model-ready':
          setModelStates(prev => ({
            ...prev,
            [task]: { loading: false, progress: 100, ready: true }
          }))
          break
      }
    }

    worker.addEventListener('message', handleMessage)

    return () => {
      worker.removeEventListener('message', handleMessage)
      // Reject any pending callbacks
      callbacksRef.current.forEach(cb => cb.reject(new Error('Worker destroyed')))
      callbacksRef.current.clear()
      releaseSharedWorker()
    }
  }, [])

  const sendRequest = useCallback((action, payload) => {
    return new Promise((resolve, reject) => {
      const id = ++requestId
      callbacksRef.current.set(id, { resolve, reject })
      workerRef.current?.postMessage({ id, action, payload })
    })
  }, [])

  /**
   * Check and correct English grammar.
   * @param {string} text - English text to check
   * @returns {Promise<string>} Corrected text
   */
  const checkGrammar = useCallback(async (text) => {
    if (!text?.trim()) return text
    return sendRequest('grammar', { text: text.trim() })
  }, [sendRequest])

  /**
   * Find semantically similar words using embeddings.
   * @param {string} word - Target word
   * @param {string[]} candidates - List of candidate words to rank
   * @returns {Promise<Array<{word: string, similarity: number}>>}
   */
  const getSimilarWords = useCallback(async (word, candidates) => {
    if (!word?.trim() || !candidates?.length) return []
    return sendRequest('similar', { word: word.trim(), candidates })
  }, [sendRequest])

  /**
   * Suggest words for a [MASK] token in context.
   * @param {string} text - Text with [MASK] placeholder
   * @returns {Promise<Array<{word: string, score: number, sequence: string}>>}
   */
  const suggestWords = useCallback(async (text) => {
    if (!text?.includes('[MASK]')) return []
    return sendRequest('fillmask', { text })
  }, [sendRequest])

  /**
   * Preload a model to avoid delay on first use.
   * @param {'grammar'|'similar'|'fillmask'} task
   */
  const preloadModel = useCallback(async (task) => {
    return sendRequest('preload', { task })
  }, [sendRequest])

  return {
    checkGrammar,
    getSimilarWords,
    suggestWords,
    preloadModel,
    modelStates,
    isModelLoading: Object.values(modelStates).some(s => s.loading),
  }
}
