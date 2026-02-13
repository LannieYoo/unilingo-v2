/**
 * useModelCache Hook
 * Vosk 모델 캐시 관리 (Cache API 사용)
 */

import { useState, useEffect, useCallback } from 'react'
import { MODEL_URLS } from '../_08_constants'

const CACHE_NAME = 'vosk-models-cache-v1'

// 모델 정보 (크기 포함) - key는 selectedLang 값과 일치해야 함
export const MODEL_INFO = {
  'en-us': { name: 'English (US)', size: '40MB', sizeBytes: 40 * 1024 * 1024 },
  'en-us-lg': { name: 'English (US) High Accuracy', size: '128MB', sizeBytes: 128 * 1024 * 1024, large: true, recommended: true },
  'en-in': { name: 'English (Indian)', size: '1GB', sizeBytes: 1024 * 1024 * 1024, large: true, recommended: true },
  'ar-sa': { name: 'Arabic', size: '318MB', sizeBytes: 318 * 1024 * 1024 },
  'ko-kr': { name: 'Korean', size: '82MB', sizeBytes: 82 * 1024 * 1024 },
  'zh-cn': { name: 'Chinese', size: '42MB', sizeBytes: 42 * 1024 * 1024 },
  'ja-jp': { name: 'Japanese', size: '48MB', sizeBytes: 48 * 1024 * 1024 },
  'es-es': { name: 'Spanish', size: '39MB', sizeBytes: 39 * 1024 * 1024 },
  'fr-fr': { name: 'French', size: '41MB', sizeBytes: 41 * 1024 * 1024 },
  'de-de': { name: 'German', size: '45MB', sizeBytes: 45 * 1024 * 1024 },
}

export function useModelCache() {
  const [cachedModels, setCachedModels] = useState({})
  const [downloadingModel, setDownloadingModel] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isChecking, setIsChecking] = useState(true)

  // 캐시된 모델 목록 확인
  const checkCachedModels = useCallback(async () => {
    setIsChecking(true)
    try {
      const cache = await caches.open(CACHE_NAME)
      const cached = {}
      
      for (const [lang, url] of Object.entries(MODEL_URLS)) {
        const response = await cache.match(url)
        cached[lang] = !!response
      }
      
      setCachedModels(cached)
    } catch (error) {
      console.error('Failed to check cached models:', error)
    } finally {
      setIsChecking(false)
    }
  }, [])

  // 초기 로드 시 캐시 확인
  useEffect(() => {
    checkCachedModels()
  }, [checkCachedModels])

  // 모델 다운로드 (캐시에 저장)
  const downloadModel = useCallback(async (lang) => {
    const url = MODEL_URLS[lang]
    if (!url) return false

    setDownloadingModel(lang)
    setDownloadProgress(0)

    try {
      const cache = await caches.open(CACHE_NAME)
      
      // 이미 캐시되어 있는지 확인
      const existing = await cache.match(url)
      if (existing) {
        setCachedModels(prev => ({ ...prev, [lang]: true }))
        setDownloadingModel(null)
        return true
      }

      // 다운로드 with progress
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')

      const reader = response.body.getReader()
      const contentLength = MODEL_INFO[lang]?.sizeBytes || 50 * 1024 * 1024
      
      let receivedLength = 0
      const chunks = []
      let lastProgressUpdate = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        chunks.push(value)
        receivedLength += value.length
        
        // 진행률 계산 (100%까지 허용)
        const progress = Math.min(Math.round((receivedLength / contentLength) * 100), 100)
        
        // 진행률이 변경되었을 때만 업데이트 (성능 최적화)
        if (progress !== lastProgressUpdate) {
          setDownloadProgress(progress)
          lastProgressUpdate = progress
        }
      }

      // Blob으로 합치기
      const blob = new Blob(chunks)
      const cacheResponse = new Response(blob, {
        headers: response.headers
      })

      // 캐시에 저장
      await cache.put(url, cacheResponse)
      
      // 완료 상태 업데이트
      setDownloadProgress(100)
      setCachedModels(prev => ({ ...prev, [lang]: true }))
      
      // 약간의 지연 후 다운로드 상태 초기화 (사용자가 100% 보도록)
      setTimeout(() => {
        setDownloadingModel(null)
      }, 500)
      
      return true
    } catch (error) {
      console.error('Failed to download model:', error)
      setDownloadingModel(null)
      setDownloadProgress(0)
      return false
    }
  }, [])

  // 모델 삭제
  const deleteModel = useCallback(async (lang) => {
    const url = MODEL_URLS[lang]
    if (!url) return false

    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.delete(url)
      setCachedModels(prev => ({ ...prev, [lang]: false }))
      return true
    } catch (error) {
      console.error('Failed to delete model:', error)
      return false
    }
  }, [])

  // 모든 캐시 삭제
  const clearAllCache = useCallback(async () => {
    try {
      await caches.delete(CACHE_NAME)
      setCachedModels({})
      return true
    } catch (error) {
      console.error('Failed to clear cache:', error)
      return false
    }
  }, [])

  // 다운로드되지 않은 모델 목록
  const uncachedModels = Object.entries(MODEL_URLS)
    .filter(([lang]) => !cachedModels[lang])
    .map(([lang]) => lang)

  // 다운로드된 모델 목록
  const downloadedModels = Object.entries(cachedModels)
    .filter(([, cached]) => cached)
    .map(([lang]) => lang)

  return {
    cachedModels,
    uncachedModels,
    downloadedModels,
    downloadingModel,
    downloadProgress,
    isChecking,
    downloadModel,
    deleteModel,
    clearAllCache,
    checkCachedModels,
    isModelCached: (lang) => !!cachedModels[lang],
  }
}

export default useModelCache
