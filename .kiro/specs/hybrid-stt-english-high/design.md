# Design Document: Whisper WebAssembly STT for English

## Overview

This design implements a browser-based Speech-to-Text system using whisper.cpp WebAssembly for the "English" model selection. The system runs entirely in the browser, achieving high accent recognition (Middle Eastern and Indian English) without server dependency, enabling 2+ hour continuous recording with no text loss.

**Key Design Decisions:**
- **Whisper WebAssembly**: Runs OpenAI Whisper model directly in browser (no server needed)
- **Model caching**: Downloads model once, caches in IndexedDB for offline use
- **Real-time streaming**: Processes audio in 3-second chunks with sliding window
- **Web Workers**: Offloads processing to background thread for smooth UI
- **Zero server load**: Each user's browser handles processing independently

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ Language Selector│────────▶│ Mode Router             │  │
│  └──────────────────┘         │ - English → Whisper     │  │
│                                │ - Others → Vosk         │  │
│                                └────────┬────────────────┘  │
│                                         │                    │
│                    ┌────────────────────┴─────────┐         │
│                    │                              │         │
│           ┌────────▼────────┐          ┌─────────▼──────┐  │
│           │ Whisper STT Hook│          │ Vosk Hook      │  │
│           │ (new)           │          │ (existing)     │  │
│           └────────┬────────┘          └────────────────┘  │
│                    │                                        │
│      ┌─────────────┴──────────────┐                        │
│      │                            │                        │
│  ┌───▼──────────┐      ┌──────────▼────────┐              │
│  │ Model        │      │ Audio Capture     │              │
│  │ Manager      │      │ Manager           │              │
│  │              │      │                   │              │
│  │ - Download   │      │ - Microphone      │              │
│  │ - Cache      │      │ - 16kHz sampling  │              │
│  │ - IndexedDB  │      │ - 30ms chunks     │              │
│  └───┬──────────┘      └──────────┬────────┘              │
│      │                            │                        │
│      │ (model ready)              │ (audio chunks)         │
│      └────────────┬───────────────┘                        │
│                   │                                        │
│            ┌──────▼──────────┐                             │
│            │ Whisper Worker  │                             │
│            │ (Web Worker)    │                             │
│            │                 │                             │
│            │ - WASM init     │                             │
│            │ - Audio buffer  │                             │
│            │ - Transcribe    │                             │
│            └──────┬──────────┘                             │
│                   │                                        │
│                   │ (transcribed text)                     │
│                   ▼                                        │
│            ┌──────────────────┐                            │
│            │ Transcript       │                            │
│            │ Manager          │                            │
│            │                  │                            │
│            │ - Append text    │                            │
│            │ - Deduplicate    │                            │
│            │ - Display        │                            │
│            └──────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     IndexedDB (Browser Storage)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Whisper Models Cache                                 │  │
│  │                                                       │  │
│  │ - base.en.bin (~140MB)                               │  │
│  │ - tiny.en.bin (~75MB)                                │  │
│  │ - small.en.bin (~240MB)                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. useWhisperSTT Hook
**Location**: `frontend/src/modules/stt_stream/_04_hooks/useWhisperSTT.js`

**Purpose**: Manages Whisper-based STT with model download, initialization, and real-time transcription

**Interface**:
```javascript
export function useWhisperSTT() {
  return {
    // Control methods
    start: () => Promise<boolean>,
    stop: () => Promise<void>,
    toggle: () => Promise<void>,
    
    // Model management
    downloadModel: (modelSize: 'tiny' | 'base' | 'small') => Promise<void>,
    deleteModel: () => Promise<void>,
    
    // State
    isRunning: boolean,
    isModelReady: boolean,
    isDownloading: boolean,
    downloadProgress: number, // 0-100
    
    // Transcript
    transcript: string,
    interimTranscript: string,
    
    // Statistics
    stats: {
      processedSeconds: number,
      queuedBuffers: number,
      cpuUsage: number,
      memoryUsage: number
    }
  }
}
```

**Key Responsibilities**:
- Check if model is cached
- Download and cache model if needed
- Initialize Whisper Web Worker
- Capture and buffer audio
- Send audio to worker for processing
- Receive and display transcribed text

#### 2. WhisperModelManager Class
**Location**: `frontend/src/modules/stt_stream/_07_utils/WhisperModelManager.js`

**Purpose**: Manages Whisper model download, caching, and retrieval

**Interface**:
```javascript
class WhisperModelManager {
  constructor()
  
  // Check if model is cached
  async isModelCached(modelSize: string): Promise<boolean>
  
  // Download model with progress callback
  async downloadModel(
    modelSize: string,
    onProgress: (percent: number, loaded: number, total: number) => void
  ): Promise<ArrayBuffer>
  
  // Get cached model
  async getCachedModel(modelSize: string): Promise<ArrayBuffer>
  
  // Delete cached model
  async deleteModel(modelSize: string): Promise<void>
  
  // Get storage info
  async getStorageInfo(): Promise<{
    used: number,
    available: number,
    models: Array<{ name: string, size: number }>
  }>
}
```

**Model URLs**:
```javascript
const MODEL_URLS = {
  'tiny.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
  'base.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
  'small.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin'
}
```

#### 3. WhisperWorker (Web Worker)
**Location**: `frontend/src/modules/stt_stream/_07_utils/whisper.worker.js`

**Purpose**: Runs whisper.cpp WebAssembly in background thread

**Interface**:
```javascript
// Messages from main thread
{
  type: 'init',
  modelData: ArrayBuffer,
  modelSize: string
}

{
  type: 'transcribe',
  audioData: Float32Array,
  sampleRate: number
}

{
  type: 'stop'
}

// Messages to main thread
{
  type: 'ready'
}

{
  type: 'progress',
  percent: number
}

{
  type: 'result',
  text: string,
  processingTime: number
}

{
  type: 'error',
  message: string
}
```

**WASM Integration**:
```javascript
// Load whisper.cpp WASM
importScripts('whisper.wasm.js')

// Initialize Whisper context
const ctx = Module.whisper_init_from_buffer(modelData)

// Transcribe audio
const result = Module.whisper_full(ctx, audioData, sampleRate)
const text = Module.whisper_get_text(result)
```

#### 4. AudioCaptureManager Class
**Location**: `frontend/src/modules/stt_stream/_07_utils/AudioCaptureManager.js`

**Purpose**: Captures audio from microphone and manages buffering

**Interface**:
```javascript
class AudioCaptureManager {
  constructor(
    sampleRate: number = 16000,
    chunkDuration: number = 30, // ms
    bufferDuration: number = 3000 // ms
  )
  
  // Start capturing
  async start(onBuffer: (audioData: Float32Array) => void): Promise<void>
  
  // Stop capturing
  stop(): void
  
  // Get current buffer
  getCurrentBuffer(): Float32Array
  
  // Get status
  getStatus(): {
    isCapturing: boolean,
    bufferSize: number,
    bufferDuration: number
  }
}
```

**Implementation Details**:
- Uses `AudioWorklet` for efficient audio processing
- Maintains sliding window buffer (3 seconds)
- Sends buffer to callback when full
- Overlaps buffers by 0.5 seconds to avoid gaps

#### 5. TranscriptDeduplicator Class
**Location**: `frontend/src/modules/stt_stream/_07_utils/TranscriptDeduplicator.js`

**Purpose**: Removes duplicate text from overlapping audio buffers

**Interface**:
```javascript
class TranscriptDeduplicator {
  constructor(overlapThreshold: number = 0.7)
  
  // Add new text and deduplicate
  addText(newText: string): string
  
  // Reset state
  reset(): void
}
```

**Algorithm**:
```javascript
// Compare last N words of existing transcript with first N words of new text
// If similarity > threshold, remove duplicate portion
function deduplicate(existing, newText) {
  const existingWords = existing.split(' ')
  const newWords = newText.split(' ')
  
  for (let overlap = Math.min(existingWords.length, newWords.length); overlap > 0; overlap--) {
    const existingEnd = existingWords.slice(-overlap).join(' ')
    const newStart = newWords.slice(0, overlap).join(' ')
    
    if (similarity(existingEnd, newStart) > threshold) {
      return newWords.slice(overlap).join(' ')
    }
  }
  
  return newText
}
```

## Data Models

### WhisperModel
```typescript
interface WhisperModel {
  name: string              // 'tiny.en', 'base.en', 'small.en'
  size: number              // Size in bytes
  url: string               // Download URL
  accuracy: string          // 'Good', 'Better', 'Best'
  speed: string             // 'Fast', 'Medium', 'Slow'
  recommended: boolean      // Is this the recommended model
}
```

### TranscriptSegment
```typescript
interface TranscriptSegment {
  id: string              // Unique identifier
  text: string            // Transcribed text
  timestamp: number       // Timestamp (seconds)
  processingTime: number  // Time taken to process (seconds)
}
```

### WhisperStats
```typescript
interface WhisperStats {
  processedSeconds: number      // Total audio processed
  queuedBuffers: number         // Buffers waiting to be processed
  cpuUsage: number              // Estimated CPU usage (0-100)
  memoryUsage: number           // Memory usage in MB
  averageProcessingTime: number // Average time per buffer
  realTimeFactor: number        // Processing time / audio duration
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Model Caching (Round-trip)
*For any* Whisper model, downloading then retrieving from cache should return the same model data.
**Validates: Requirements 1.4**

### Property 2: Model Download Progress
*For any* model download, the progress percentage should monotonically increase from 0 to 100.
**Validates: Requirements 1.3**

### Property 3: WASM Initialization Timeout
*For any* WASM initialization, it should complete within 10 seconds or fail with an error.
**Validates: Requirements 2.4**

### Property 4: Audio Capture Continuity
*For any* recording session, audio capture should continue for 2+ hours without stopping.
**Validates: Requirements 3.5**

### Property 5: Buffer Size Consistency
*For any* audio buffer, the duration should be 3 seconds ± 100ms.
**Validates: Requirements 3.3**

### Property 6: Processing Queue Order
*For any* sequence of audio buffers, they should be processed in chronological order (FIFO).
**Validates: Requirements 4.3**

### Property 7: Real-time Factor
*For any* 3-second audio buffer, processing time should be less than 2 seconds (real-time factor < 0.67).
**Validates: Requirements 6.4**

### Property 8: Text Deduplication
*For any* overlapping audio buffers, duplicate text should be removed from the transcript.
**Validates: Requirements 5.1**

### Property 9: Chronological Order
*For any* set of transcript segments, they should be ordered by timestamp.
**Validates: Requirements 5.4**

### Property 10: No Text Loss
*For any* recording session, all captured audio should be transcribed (no dropped buffers).
**Validates: Requirements 5.5**

### Property 11: Error Recovery
*For any* Whisper processing error, the system should retry up to 3 times before skipping.
**Validates: Requirements 7.1**

### Property 12: WASM Crash Recovery
*For any* WASM crash, the system should restart the worker and continue processing.
**Validates: Requirements 7.2**

### Property 13: Memory Cleanup
*For any* processed buffer, memory should be released within 1 second.
**Validates: Requirements 6.3**

### Property 14: Model Deletion
*For any* cached model, deleting it should free up storage space immediately.
**Validates: Requirements 8.3**

### Property 15: Browser Compatibility Detection
*For any* browser, the system should detect WebAssembly SIMD support correctly.
**Validates: Requirements 10.3**

### Property 16: Fallback to Vosk
*For any* unsupported browser, the system should fall back to Vosk without crashing.
**Validates: Requirements 10.5**

### Property 17: Queue Size Limit
*For any* processing queue, if size exceeds 5 buffers, a warning should be displayed.
**Validates: Requirements 5.3**

### Property 18: Download Cancellation
*For any* ongoing model download, cancelling should stop the download and clean up partial data.
**Validates: Requirements 8.2**

### Property 19: Worker Message Ordering
*For any* sequence of messages to the worker, responses should maintain the same order.
**Validates: Requirements 4.3**

### Property 20: Storage Quota Check
*For any* model download attempt, if storage is insufficient, an error should be shown before downloading.
**Validates: Requirements 8.1**

## Error Handling

### Frontend Error Scenarios

1. **Model Download Failure**
   - **Detection**: Network error or timeout during download
   - **Handling**: Display error message, offer retry
   - **Recovery**: Allow user to retry or select smaller model

2. **WASM Initialization Failure**
   - **Detection**: Worker fails to load or initialize within 10 seconds
   - **Handling**: Display error, check browser compatibility
   - **Recovery**: Fall back to Vosk if browser unsupported

3. **WASM Runtime Crash**
   - **Detection**: Worker terminates unexpectedly
   - **Handling**: Restart worker, reload model
   - **Recovery**: Resume from last successful buffer

4. **Out of Memory**
   - **Detection**: Browser memory limit exceeded
   - **Handling**: Stop recording, display error
   - **Recovery**: Suggest closing other tabs or using smaller model

5. **Microphone Disconnection**
   - **Detection**: Audio stream ends unexpectedly
   - **Handling**: Pause recording, display notification
   - **Recovery**: Resume when microphone reconnects

6. **Processing Timeout**
   - **Detection**: Worker doesn't respond within 10 seconds
   - **Handling**: Terminate worker, restart
   - **Recovery**: Retry current buffer up to 3 times

7. **Storage Quota Exceeded**
   - **Detection**: IndexedDB write fails
   - **Handling**: Display error, suggest deleting old models
   - **Recovery**: Allow user to free up space

### Error Messages

```javascript
const ERROR_MESSAGES = {
  MODEL_DOWNLOAD_FAILED: 'Failed to download Whisper model. Please check your internet connection and try again.',
  WASM_INIT_FAILED: 'Failed to initialize Whisper. Your browser may not support WebAssembly SIMD.',
  WASM_CRASHED: 'Whisper processing crashed. Restarting...',
  OUT_OF_MEMORY: 'Browser ran out of memory. Please close other tabs or use a smaller model.',
  MIC_DISCONNECTED: 'Microphone disconnected. Please reconnect and resume recording.',
  PROCESSING_TIMEOUT: 'Processing is taking too long. Retrying...',
  STORAGE_FULL: 'Not enough storage space. Please delete unused models.',
  BROWSER_UNSUPPORTED: 'Your browser is not supported. Please use Chrome 90+ or Edge 90+.'
}
```

## Testing Strategy

### Unit Tests

**Frontend Unit Tests**:
- `WhisperModelManager`: Test download, caching, retrieval, deletion
- `AudioCaptureManager`: Test audio capture, buffering, sliding window
- `TranscriptDeduplicator`: Test deduplication algorithm
- `useWhisperSTT`: Test hook state management and lifecycle

### Property-Based Tests

Each correctness property should be implemented as a property-based test with minimum 100 iterations.

**Example Property Test** (Property 1: Model Caching Round-trip):
```javascript
// Feature: whisper-stt-english, Property 1: Model Caching Round-trip
test('model download and retrieval returns same data', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('tiny.en', 'base.en', 'small.en'),
      async (modelSize) => {
        const manager = new WhisperModelManager()
        
        // Download model
        const downloaded = await manager.downloadModel(modelSize, () => {})
        
        // Retrieve from cache
        const cached = await manager.getCachedModel(modelSize)
        
        // Should be identical
        expect(cached.byteLength).toBe(downloaded.byteLength)
        expect(new Uint8Array(cached)).toEqual(new Uint8Array(downloaded))
      }
    ),
    { numRuns: 100 }
  )
})
```

### Integration Tests

1. **End-to-End Whisper Test**:
   - Download model
   - Initialize WASM
   - Record 30 seconds
   - Verify transcript completeness

2. **Fallback Test**:
   - Simulate unsupported browser
   - Verify fallback to Vosk
   - Verify no crashes

3. **Long Recording Test**:
   - Record for 2+ hours
   - Verify no text loss
   - Verify memory stability

### Manual Testing Checklist

- [ ] Download tiny.en model, verify caching
- [ ] Download base.en model, verify progress
- [ ] Record 5 minutes, verify no text loss
- [ ] Test with Middle Eastern accent
- [ ] Test with Indian accent
- [ ] Disconnect microphone, verify recovery
- [ ] Close tab during recording, verify resume
- [ ] Test on Chrome 90+
- [ ] Test on Edge 90+
- [ ] Verify fallback on unsupported browser

## Performance Considerations

### Model Sizes and Trade-offs

| Model | Size | Accuracy | Speed | Recommended |
|-------|------|----------|-------|-------------|
| tiny.en | 75MB | Good | Fast (RTF 0.3) | Low-end devices |
| base.en | 140MB | Better | Medium (RTF 0.5) | **Default** |
| small.en | 240MB | Best | Slow (RTF 0.8) | High-end devices |

**RTF (Real-Time Factor)**: Processing time / Audio duration
- RTF < 1.0 = Real-time capable
- RTF 0.5 = Processes 1 second of audio in 0.5 seconds

### Memory Usage

- **WASM Module**: ~50MB
- **Model**: 75-240MB (depending on size)
- **Audio Buffer**: ~5MB (3 seconds at 16kHz)
- **Total**: 130-295MB

### CPU Usage

- **Tiny**: 20-30% (single core)
- **Base**: 40-60% (single core)
- **Small**: 70-90% (single core)

### Optimization Strategies

1. **Web Workers**: Offload processing to background thread
2. **AudioWorklet**: Efficient audio capture (replaces ScriptProcessorNode)
3. **Sliding Window**: Overlap buffers by 0.5s to avoid gaps
4. **Deduplication**: Remove duplicate text from overlaps
5. **Memory Management**: Release processed buffers immediately

## Security Considerations

1. **Model Integrity**:
   - Download models from trusted source (Hugging Face)
   - Verify model checksums (optional)
   - Use HTTPS for downloads

2. **Storage Security**:
   - Models stored in IndexedDB (browser-managed)
   - No sensitive data in models
   - User can delete models anytime

3. **Privacy**:
   - All processing happens locally (no server)
   - Audio never leaves the browser
   - No telemetry or tracking

## Deployment Notes

### Frontend Changes

- Add new hook: `useWhisperSTT.js`
- Add utility classes: `WhisperModelManager`, `AudioCaptureManager`, `TranscriptDeduplicator`
- Add Web Worker: `whisper.worker.js`
- Update `SttStreamView.jsx` to support Whisper mode
- Update `LANGUAGE_OPTIONS` to use Whisper for English

### Dependencies

**NPM Packages**:
```json
{
  "dependencies": {
    "@types/emscripten": "^1.39.6"
  }
}
```

**External Resources**:
- whisper.cpp WASM build: `https://cdn.jsdelivr.net/npm/whisper.wasm@latest/dist/whisper.wasm.js`
- Whisper models: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/`

### Configuration

**Frontend** (`.env`):
```
VITE_WHISPER_MODEL_URL=https://huggingface.co/ggerganov/whisper.cpp/resolve/main/
VITE_WHISPER_DEFAULT_MODEL=base.en
```

### Browser Requirements

**Minimum Requirements**:
- Chrome 90+ or Edge 90+
- WebAssembly SIMD support
- IndexedDB support
- Web Workers support
- AudioWorklet support

**Detection Code**:
```javascript
function isWhisperSupported() {
  return (
    typeof WebAssembly !== 'undefined' &&
    WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])) &&
    typeof Worker !== 'undefined' &&
    typeof indexedDB !== 'undefined' &&
    typeof AudioWorkletNode !== 'undefined'
  )
}
```

## Future Enhancements

1. **Multi-language Support**: Extend Whisper to other languages (not just English)
2. **Speaker Diarization**: Identify different speakers in the audio
3. **Punctuation Restoration**: Add punctuation to transcripts automatically
4. **Timestamp Alignment**: Provide word-level timestamps
5. **Custom Models**: Allow users to upload custom-trained Whisper models
6. **GPU Acceleration**: Use WebGPU for faster processing (when available)
7. **Streaming Mode**: Process audio in smaller chunks for lower latency
8. **Offline Mode**: Full offline support with pre-downloaded models

## Migration from Hybrid Mode

### Removed Components
- `useHybridSTT.js` → Replaced by `useWhisperSTT.js`
- `WebSpeechManager.js` → No longer needed
- `MissingSegmentProcessor.js` → No longer needed
- Backend `/api/stt/process-missing` → No longer needed
- Backend `vosk_processor.py` → No longer needed

### Kept Components
- `AudioBufferManager.js` → Reused for audio buffering
- `textFormatter.js` → Reused for punctuation
- `ModelDownloadManager.jsx` → Adapted for Whisper models
- `useModelCache.js` → Adapted for Whisper model caching

### Migration Steps
1. Remove hybrid mode code
2. Implement Whisper components
3. Update UI to show Whisper download
4. Test with sample audio
5. Deploy to production
