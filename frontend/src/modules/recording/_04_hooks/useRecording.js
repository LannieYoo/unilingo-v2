/**
 * useRecording Hook
 * 오디오 녹음 기능 훅
 */

import { useState, useRef, useCallback } from 'react'

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState([])
  const [error, setError] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        const timestamp = new Date().toISOString()
        
        setRecordings(prev => [...prev, {
          id: Date.now(),
          url: audioUrl,
          timestamp,
          blob: audioBlob,
        }])

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access error:', err)
      setError('Microphone access permission is required.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const downloadRecording = useCallback((recording) => {
    const a = document.createElement('a')
    a.href = recording.url
    a.download = `recording_${recording.timestamp.slice(0, 19).replace(/:/g, '-')}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const deleteRecording = useCallback((id) => {
    setRecordings(prev => {
      const recording = prev.find(r => r.id === id)
      if (recording) {
        URL.revokeObjectURL(recording.url)
      }
      return prev.filter(r => r.id !== id)
    })
  }, [])

  return {
    isRecording,
    recordings,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    downloadRecording,
    deleteRecording,
  }
}

export default useRecording
