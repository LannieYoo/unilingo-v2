/**
 * DictionaryTooltip Component
 * 인라인 사전 툴팁
 */

import { useEffect, useRef, useCallback, useState } from 'react'

export function DictionaryTooltip({ 
  word, 
  position, 
  dictionaryData, 
  translation, 
  isFavorited,
  isLoading, 
  onClose,
  onToggleFavorite
}) {
  const tooltipRef = useRef(null)
  const audioRef = useRef(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // 툴팁 위치 조정
  useEffect(() => {
    if (tooltipRef.current) {
      const tooltip = tooltipRef.current
      const rect = tooltip.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let newX = position.x
      let newY = position.y
      let newShowAbove = position.showAbove
      
      // 수평 위치 조정
      const halfWidth = rect.width / 2
      if (newX - halfWidth < 10) {
        newX = halfWidth + 10
      } else if (newX + halfWidth > viewportWidth - 10) {
        newX = viewportWidth - halfWidth - 10
      }
      
      // 수직 위치 조정
      if (position.showAbove) {
        // 위에 표시할 때 상단 경계 체크
        const topPosition = viewportHeight - position.y
        if (topPosition + rect.height > viewportHeight - 10) {
          // 위에도 공간이 부족하면 아래로
          newShowAbove = false
          newY = position.y
        }
      } else {
        // 아래에 표시할 때 하단 경계 체크
        if (position.y + rect.height > viewportHeight - 10) {
          // 아래 공간이 부족하면 위로
          newShowAbove = true
          newY = position.y
        }
      }
      
      setAdjustedPosition({
        x: newX,
        y: newY,
        showAbove: newShowAbove
      })
    }
  }, [position, dictionaryData, isLoading])

  // 발음 재생
  const playPronunciation = useCallback((audioUrl) => {
    if (!audioUrl) return
    
    // 기존 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    // 새 오디오 재생
    audioRef.current = new Audio(audioUrl)
    audioRef.current.play().catch(err => {
      console.error('Audio play error:', err)
    })
  }, [])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  if (!word) return null

  // 발음 정보 추출
  const getPhonetics = () => {
    if (!dictionaryData || !dictionaryData.phonetics) return { us: null, uk: null }
    
    const phonetics = dictionaryData.phonetics
    let usPhonetic = null
    let ukPhonetic = null
    
    // 미국식 발음 찾기
    const usEntry = phonetics.find(p => 
      p.text && (p.text.includes('US') || p.text.includes('ˈ') || p.audio?.includes('-us'))
    )
    if (usEntry) {
      usPhonetic = { text: usEntry.text, audio: usEntry.audio }
    }
    
    // 영국식 발음 찾기
    const ukEntry = phonetics.find(p => 
      p.text && (p.text.includes('UK') || p.audio?.includes('-uk') || p.audio?.includes('-gb'))
    )
    if (ukEntry) {
      ukPhonetic = { text: ukEntry.text, audio: ukEntry.audio }
    }
    
    // 구분이 없으면 첫 번째를 미국식으로
    if (!usPhonetic && !ukPhonetic && phonetics.length > 0 && phonetics[0].text) {
      usPhonetic = { text: phonetics[0].text, audio: phonetics[0].audio }
    }
    
    // 두 번째가 있으면 영국식으로
    if (!ukPhonetic && phonetics.length > 1 && phonetics[1].text) {
      ukPhonetic = { text: phonetics[1].text, audio: phonetics[1].audio }
    }
    
    return { us: usPhonetic, uk: ukPhonetic }
  }

  const phonetics = getPhonetics()
  
  // 단어 클릭 시 발음 재생 핸들러
  const playWordPronunciation = () => {
    if (phonetics.us?.audio) {
      playPronunciation(phonetics.us.audio)
    } else if (phonetics.uk?.audio) {
      playPronunciation(phonetics.uk.audio)
    }
  }

  return (
    <div 
      ref={tooltipRef}
      className={`dictionary-tooltip ${adjustedPosition.showAbove ? 'show-above' : ''}`}
      style={{
        left: `${adjustedPosition.x}px`,
        [adjustedPosition.showAbove ? 'bottom' : 'top']: adjustedPosition.showAbove 
          ? `${window.innerHeight - adjustedPosition.y}px`
          : `${adjustedPosition.y}px`
      }}
    >
      <div className="dictionary-tooltip-header">
        <div className="dictionary-tooltip-header-left">
          <div className="dictionary-tooltip-word-section">
            <h3 
              className="dictionary-tooltip-word dictionary-tooltip-word-clickable" 
              onClick={playWordPronunciation}
              style={{ cursor: 'pointer' }}
              title="Click to hear pronunciation"
            >
              {word}
            </h3>
            {translation && (
              <div className="dictionary-tooltip-translation">
                {translation}
              </div>
            )}
          </div>
          <button
            className={`dictionary-tooltip-favorite ${isFavorited ? 'favorited' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorited ? 'Saved to Dictionary History' : 'Save to Dictionary History'}
            disabled={isLoading}
          >
            {isFavorited ? '★' : '☆'}
          </button>
        </div>
        <div className="dictionary-tooltip-header-right">
          {(phonetics.us || phonetics.uk) && (
            <div className="dictionary-tooltip-phonetics">
              {phonetics.us && (
                <div className="dictionary-tooltip-phonetic-item">
                  <img 
                    src="https://flagcdn.com/w40/us.png" 
                    alt="US" 
                    className="dictionary-tooltip-flag-icon dictionary-tooltip-flag-clickable" 
                    width="24" 
                    height="16"
                    onClick={() => phonetics.us.audio && playPronunciation(phonetics.us.audio)}
                    style={{ cursor: phonetics.us.audio ? 'pointer' : 'default' }}
                    title="Play US pronunciation"
                  />
                  <span className="dictionary-tooltip-phonetic-text">{phonetics.us.text}</span>
                </div>
              )}
              {phonetics.uk && (
                <div className="dictionary-tooltip-phonetic-item">
                  <img 
                    src="https://flagcdn.com/w40/gb.png" 
                    alt="UK" 
                    className="dictionary-tooltip-flag-icon dictionary-tooltip-flag-clickable" 
                    width="24" 
                    height="16"
                    onClick={() => phonetics.uk.audio && playPronunciation(phonetics.uk.audio)}
                    style={{ cursor: phonetics.uk.audio ? 'pointer' : 'default' }}
                    title="Play UK pronunciation"
                  />
                  <span className="dictionary-tooltip-phonetic-text">{phonetics.uk.text}</span>
                </div>
              )}
            </div>
          )}
          <button 
            className="dictionary-tooltip-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="dictionary-tooltip-loading">
          Loading...
        </div>
      )}

      {!isLoading && (
        <>
          {dictionaryData && (
            <div className="dictionary-tooltip-content">
              {dictionaryData.meanings && dictionaryData.meanings.length > 0 && (
                <div className="dictionary-tooltip-meanings">
                  {dictionaryData.meanings.slice(0, 2).map((meaning, idx) => (
                    <div key={idx} className="dictionary-tooltip-meaning">
                      <div className="dictionary-tooltip-pos">
                        {meaning.partOfSpeech}
                      </div>
                      {meaning.definitions && meaning.definitions.length > 0 && (
                        <ol className="dictionary-tooltip-definitions">
                          {meaning.definitions.slice(0, 2).map((def, defIdx) => (
                            <li key={defIdx}>
                              {def.translatedDefinition || def.definition}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isLoading && !dictionaryData && !translation && (
            <div className="dictionary-tooltip-error">
              No definition found
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DictionaryTooltip
