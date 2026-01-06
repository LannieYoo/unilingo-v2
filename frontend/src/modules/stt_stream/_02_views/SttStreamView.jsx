/**
 * SttStreamView
 * Vosk 기반 실시간 STT + 번역 뷰
 */

import { useEffect, useRef } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranscriptStore } from '../_05_stores'
import { useVoskRecognition, useAutoScroll, useTranslation, useTimer, TRANSLATION_LANGUAGES } from '../_04_hooks'
import {
  DebugPanel,
  LanguageSelect,
  StatusIndicator,
  ActionButton,
} from '../_03_components'
import { downloadAsFile, generateFileName, detectLanguage } from '../_07_utils'
import { STATUS } from '../_08_constants'
import '../_10_styles/stt-stream.css'

export function SttStreamView() {
  const {
    finalText,
    interimText,
    status,
    selectedLang,
    loadProgress,
    isSupported,
    showDebug,
    setSelectedLang,
    setShowDebug,
    clear,
    getFullText
  } = useTranscriptStore()

  const {
    loadModel,
    toggle,
    setLanguage,
    isRunning,
    isLoading
  } = useVoskRecognition()

  const {
    translatedText,
    targetLang,
    isTranslating,
    setTargetLang,
    addSentenceToTranslate,
    clearTranslation,
  } = useTranslation()

  const {
    formattedTime,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer
  } = useTimer()

  const fullText = getFullText()
  
  const { containerRef: leftRef, handleScroll: handleLeftScroll } = useAutoScroll([finalText, interimText])
  const { containerRef: rightRef, handleScroll: handleRightScroll } = useAutoScroll([translatedText])

  const prevFinalTextRef = useRef('')

  // STT 상태에 따라 타이머 제어
  useEffect(() => {
    if (isRunning) {
      startTimer()
    } else {
      stopTimer()
    }
  }, [isRunning, startTimer, stopTimer])

  useEffect(() => {
    if (!finalText || finalText === prevFinalTextRef.current) return
    
    const newPart = finalText.slice(prevFinalTextRef.current.length).trim()
    prevFinalTextRef.current = finalText
    
    if (newPart) {
      const sentences = newPart.split(/(?<=[.!?。！？])\s*/).filter(s => s.trim())
      // STT 모델의 선택된 언어를 원본 언어로 사용 (더 정확함)
      const sourceLang = selectedLang
      
      sentences.forEach(sentence => {
        if (sentence.trim()) {
          addSentenceToTranslate(sentence.trim(), sourceLang)
        }
      })
    }
  }, [finalText, selectedLang, addSentenceToTranslate])

  const handleLanguageChange = async (newLang) => {
    setSelectedLang(newLang)
    await setLanguage(newLang)
  }

  const handleClear = () => {
    clear()
    clearTranslation()
    resetTimer()
    prevFinalTextRef.current = ''
  }

  const handleDownload = () => {
    const content = `=== Original ===\n${finalText || fullText}\n\n=== Translation (${targetLang}) ===\n${translatedText}`
    if (!content) return
    downloadAsFile(content, generateFileName('stt-translated'))
  }

  return (
    <PageLayout title="Speech to Text" fullHeight>
      <PageBox noPadding flex>
        {/* 컨트롤 버튼 (상단) */}
        <div className="stt-controls-bar">
          <StatusIndicator status={status} loadProgress={loadProgress} />
          
          <div className="stt-buttons-group">
            {status === STATUS.INIT && (
              <ActionButton
                variant="primary"
                onClick={loadModel}
                disabled={!isSupported || isLoading}
              >
                Load Model
              </ActionButton>
            )}
            
            <ActionButton
              variant={isRunning ? 'recording' : 'default'}
              onClick={toggle}
              disabled={!isSupported || isLoading}
            >
              {isRunning ? 'Stop' : 'Start'}
            </ActionButton>
            
            <ActionButton
              variant="secondary"
              onClick={handleDownload}
              disabled={isRunning || !fullText}
            >
              Download
            </ActionButton>
            
            <ActionButton
              variant="secondary"
              onClick={handleClear}
              disabled={isRunning || !fullText}
            >
              Clear
            </ActionButton>
            
            <ActionButton
              variant="debug"
              className={showDebug ? 'active' : ''}
              onClick={() => setShowDebug(!showDebug)}
            >
              Debug
            </ActionButton>
          </div>
        </div>

        {/* 양쪽 패널 */}
        <div className="stt-dual-panels">
          {/* 좌측: 원문 */}
          <div className="stt-panel stt-panel-left">
            <div className="stt-panel-header">
              <LanguageSelect
                value={selectedLang}
                onChange={handleLanguageChange}
                disabled={isRunning || isLoading}
                label=""
              />
              <span className="stt-char-count">
                {(finalText || '').length} chars • {formattedTime}
              </span>
            </div>
            <div 
              className="stt-panel-content"
              ref={leftRef}
              onScroll={handleLeftScroll}
            >
              {finalText && <span className="stt-final-text">{finalText}</span>}
              {interimText && <span className="stt-interim-text">{interimText}</span>}
              {!finalText && !interimText && (
                <span className="stt-placeholder">Speech recognition results will appear here...</span>
              )}
            </div>
          </div>

          {/* 스왑 버튼 */}
          <div className="stt-swap-button">
            <span>↔</span>
          </div>

          {/* 우측: 번역 */}
          <div className="stt-panel stt-panel-right">
            <div className="stt-panel-header">
              <select
                className="stt-target-lang-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                {TRANSLATION_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <span className="stt-char-count">
                {isTranslating ? (
                  <span className="stt-translating-badge">Translating...</span>
                ) : (
                  `${(translatedText || '').length} chars`
                )}
              </span>
            </div>
            <div 
              className="stt-panel-content"
              ref={rightRef}
              onScroll={handleRightScroll}
            >
              {translatedText ? (
                <span className="stt-translated-text">{translatedText}</span>
              ) : (
                <span className="stt-placeholder">Translation will appear here...</span>
              )}
            </div>
          </div>
        </div>
      </PageBox>

      {!isSupported && (
        <div className="stt-warning-box">
          ⚠️ Microphone access is not supported in this browser.
        </div>
      )}

      <div className="stt-stream-notes">
        📝 First run requires model download (~50MB) • Offline speech recognition • Auto translation
      </div>

      <DebugPanel isOpen={showDebug} onClose={() => setShowDebug(false)} />
    </PageLayout>
  )
}

export default SttStreamView
