Kiro Task Spec
Web Speech API Only STT
Reduce perceived loss and duplication using pending interim + overlap merge on new session first final
Chrome only
No Web Audio, no MediaRecorder, no server STT

Goal
- Keep STT fully in-browser using Web Speech API (SpeechRecognition)
- Handle Web Speech timeouts/onend by auto-restart
- Reduce missing words and duplicates across restarts
  - store last interim as pending when session ends
  - when next session produces its first final, overlap-merge with pending
- Provide debuggable logs and a simple debug panel
- Do not use existing STT code paths; create a new route
  http://localhost:3000/stt-stream


1. New Route (React)

Add new page route only
- Path: /stt-stream
- Component: SttStreamWebSpeechPage

Do not modify existing STT page behavior
All new code lives under:
src/stt_webspeech_stream


2. Folder Layout

src/stt_webspeech_stream
  ui
    SttStreamWebSpeechPage.jsx
    DebugPanel.jsx
  app
    WebSpeechController.js
    overlapMerge.js
    normalize.js
    idleRestart.js
    debugLogger.js
  store
    TranscriptStore.js
    DebugStore.js


3. High-level flow

Mermaid flowchart

```mermaid
flowchart LR
  UI[React /stt-stream] --> CTRL[WebSpeechController]
  CTRL --> SR[SpeechRecognition instance]
  SR -->|onresult interim| STORE[TranscriptStore interim]
  SR -->|onresult final| STORE[TranscriptStore final append]
  SR -->|onend onerror| CTRL
  CTRL -->|save pendingInterim| PENDING[pendingInterim buffer]
  CTRL -->|restart recognition| SR
  SR -->|first final after restart| MERGE[overlapMerge pending + firstFinal]
  MERGE --> STORE
  CTRL --> DBG[DebugLogger DebugStore]
  DBG --> UI
