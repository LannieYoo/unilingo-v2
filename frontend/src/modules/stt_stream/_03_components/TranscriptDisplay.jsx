/**
 * TranscriptDisplay Component
 * Speech recognition result display component
 */

import { forwardRef } from 'react'

export const TranscriptDisplay = forwardRef(function TranscriptDisplay(
  { finalText, interimText, fullText, onScroll },
  ref
) {
  return (
    <div className="stt-stream-output">
      <div 
        ref={ref}
        className="stt-stream-text-display"
        onScroll={onScroll}
      >
        <span className="stt-stream-final">{finalText}</span>
        {interimText && (
          <span className="stt-stream-interim">{interimText}</span>
        )}
      </div>
      {fullText && (
        <div className="stt-stream-info">
          {fullText.length} chars
        </div>
      )}
    </div>
  )
})

export default TranscriptDisplay
