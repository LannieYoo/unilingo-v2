from pathlib import Path

md = """# UniLingo STT Plan for Cursor (keep current folder structure)

## Summary
Goal
Build a stable, long-session STT feature (2+ hours) that is free to run, light on laptop CPU, and has high perceived accuracy for note-taking and general use.

Chosen approach
Default mode
Web Speech API SpeechRecognition single instance, always-on
Auto-restart watchdog
Text overlap merge to reduce duplicates and improve continuity

Enhanced mode
Rolling audio buffer (MediaRecorder ring buffer)
On restart events, re-transcribe only the suspected gap window using Vosk in a Web Worker
Merge the gap text back into the transcript
Vosk runs only on-demand, never continuously

## Constraints
Must keep existing repo structure and page paths unchanged
No paid cloud STT dependency
Avoid always-on on-device Whisper to prevent fan noise
Support 2+ hour continuous sessions
Suitable for sharing to friends with browser compatibility messaging

## Repo and folder structure rules
Do not move or rename these existing files
frontend/src/pages/speech-to-text/speech-to-text.jsx
frontend/src/pages/speech-to-text/speech-to-text-realtime.jsx
frontend/src/pages/speech-to-text/speech-to-text-test.jsx
frontend/src/pages/speech-to-text/speech-to-text-translate.jsx
frontend/src/pages/speech-to-text/speech-to-text.css

Allowed changes
You may edit the contents of the files above to wire in new modules
You must keep names and locations unchanged

Allowed new files
Additive modules only under this directory
frontend/src/pages/speech-to-text/stt

## Additive module layout (add only)
Create this folder tree without changing any other part of the repo

frontend/src/pages/speech-to-text/stt
  webSpeech
    createRecognition.js
    recognitionController.js
  merge
    textNormalize.js
    overlapMerge.js
    transcriptStore.js
  audio
    recorder.js
    ringBuffer.js
  vosk
    voskManager.js
    transcribeWindow.js
  workers
    voskWorker.js

Rationale
Keep the STT feature self-contained inside the speech-to-text page folder to minimize blast radius.

## Backup workflow before Cursor edits
Rule
Before any multi-file change, create a backup that is easy to roll back.

Option A Git (recommended)
Step 1 create branch
git checkout -b feat/stt-gap-repair

Step 2 backup commit
git add -A
git commit -m "backup: before STT refactor"

Step 3 commit each milestone
git add -A
git commit -m "milestone: <short description>"

Option B filesystem copy
mkdir -p backups/$(date +%Y%m%d_%H%M%S)/speech-to-text
cp -R frontend/src/pages/speech-to-text backups/$(date +%Y%m%d_%H%M%S)/speech-to-text/

## Default mode design (Web Speech only)
### Responsibilities
Realtime interim text for typing-like display
Final text commits to transcript
Auto-restart when recognition stops
Overlap merge to avoid duplicates after restart

### Web Speech controller behavior
SpeechRecognition instance
Set language
Set interimResults true
Set continuous true when supported

Lifecycle
start and stop methods
onend triggers restart after a short delay, default 200 ms
use backoff if repeated errors occur

Callbacks exposed to UI
onInterimText(text)
onFinalText(text)
onStatus(status)
onError(error)

## Enhanced mode design (gap repair with Vosk)
### Rolling audio buffer
MediaRecorder runs only when Enhanced is enabled
timesliceMs recommended 2000
Keep a ring buffer of last maxSeconds recommended 15
exportWindow(startMs, endMs) returns Blob for that window
Memory-only by default

### Gap detection trigger
When Web Speech ends and restarts, create a gap candidate window
Suggested default window
startMs = endMs - 2000
endMs = endMs + 1000

Guardrails
Rate limit repairs, for example once per 10 seconds
Shrink window if CPU spikes

### Vosk worker requirement
Vosk runs in a Web Worker
Model loads lazily when Enhanced is first enabled
Transcribe only when a gap window is requested
Return text plus window markers

### Merge policy for repaired text
If Vosk text is empty, ignore
If Vosk text is strongly redundant, ignore
Otherwise merge with overlap rules near the transcript tail
Do not insert far earlier content to avoid confusing jumps

## Text overlap merge specification
Normalization for matching only
Trim repeated spaces
Normalize line breaks
Keep display text unchanged by default for Korean

Overlap merge algorithm
Find the longest suffix of existingTextTail matching a prefix of newText in normalized space
If overlap length >= threshold, remove overlap from newText, then append
Recommended threshold
8 to 20 characters, tune with real examples

## Transcript store specification
Maintain two buffers
interimText
finalText

Methods
setInterim(text)
commitFinal(text)
getFinal()
getInterim()
getCombinedForDisplay()

Rules
Never append interim text as final
Final is append-only except for optional small tail patching in gap repair

## Implementation milestones for Cursor
### Milestone 0 baseline snapshot
Create branch and backup commit
Confirm current speech-to-text-realtime.jsx behavior
No UI changes yet

### Milestone 1 Web Speech controller
Add stt/webSpeech/createRecognition.js
Add stt/webSpeech/recognitionController.js
Wire controller into speech-to-text-realtime.jsx with minimal UI edits

### Milestone 2 transcript store and overlap merge
Add stt/merge/textNormalize.js
Add stt/merge/overlapMerge.js
Add stt/merge/transcriptStore.js
Switch UI display to store outputs

### Milestone 3 Enhanced mode audio ring buffer
Add stt/audio/recorder.js
Add stt/audio/ringBuffer.js
Add Enhanced toggle in speech-to-text-realtime.jsx

### Milestone 4 Vosk worker on-demand transcription
Add stt/workers/voskWorker.js
Add stt/vosk/voskManager.js
Add stt/vosk/transcribeWindow.js

### Milestone 5 gap repair integration
In recognitionController.js, add gap window detection on end
Export window from ringBuffer and send to Vosk worker
Merge Vosk result into transcript using overlap merge

### Milestone 6 distribution UX hardening
Add browser support detection and friendly guidance
Add status indicator Listening, Restarting, Stopped, Error
Add short privacy notice
Optional Vosk-only fallback if SpeechRecognition unavailable and model loads

## Testing checklist
Default mode
Speak 5 minutes, verify minimal duplicates
Pause speech to trigger restart, verify it resumes without user action
Run 2 hours, verify CPU stays reasonable and no memory growth runaway

Enhanced mode
Enable Enhanced and run 15 minutes, verify Vosk runs only on restart events
Trigger multiple restarts, verify occasional repaired text appears
Verify UI remains responsive while worker runs

Regression
Other pages under frontend/src/pages remain unchanged
Build and run frontend after each milestone

## Cursor prompt template for this repo
Keep the existing UniLingo folder structure and page file names unchanged.
Only add new modules under frontend/src/pages/speech-to-text/stt.
Before any multi-file edit, create a backup git commit on a new branch.
Implement Default mode first: single SpeechRecognition instance, auto-restart, transcriptStore, overlapMerge.
Do not add paid cloud STT dependencies.
Do not run Vosk continuously. Vosk must run only when Enhanced mode is enabled and a gap window is detected.
Minimize edits to speech-to-text-realtime.jsx: keep UI and only rewire STT logic.
After each milestone, run the app and fix any build errors before continuing.

## CRISP-DM alignment
Business Understanding
Free, long-running, low-load STT with high perceived accuracy for note-taking and general use

Data Understanding
Primary defects are missing text at restart boundaries and duplicated output when multiple recognizers run

Data Preparation
Text normalization and overlap matching, audio ring buffer for recent seconds

Modeling
Web Speech API as primary, Vosk on-demand only for gap repair windows

Evaluation
Measure duplicates per minute and missing phrases at restarts during long-session tests

Deployment
Browser support detection, Enhanced toggle, clear UX and privacy notice
"""

out = Path("/mnt/data/UniLingo_STT_Cursor_Plan_v2.md")
out.write_text(md, encoding="utf-8")
str(out)

