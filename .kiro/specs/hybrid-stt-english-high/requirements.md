# Requirements Document

## Introduction

English 모델 선택 시 whisper.cpp WebAssembly 기반 STT 시스템을 구현한다. 브라우저에서 Whisper 모델을 직접 실행하여 높은 악센트 인식률을 확보하고, 서버 부하 없이 2시간 이상 연속 사용이 가능하도록 한다. 텍스트 유실 없이 안정적인 실시간 음성 인식을 제공한다.

## Glossary

- **Whisper**: OpenAI의 고성능 음성 인식 모델
- **whisper.cpp**: Whisper 모델의 C++ 구현체 (WebAssembly 지원)
- **WebAssembly (WASM)**: 브라우저에서 네이티브 수준 성능으로 실행되는 바이너리 형식
- **English Mode**: Whisper 기반 영어 음성 인식 모드 (중동/인도 영어 포함)
- **Model Download**: 브라우저에서 Whisper 모델을 다운로드하여 로컬 실행
- **Real-time Streaming**: 실시간 오디오 스트리밍 및 인식
- **Offline Processing**: 브라우저 로컬에서 처리 (서버 불필요)

## Requirements

### Requirement 1: Whisper 모델 다운로드 및 초기화

**User Story:** As a user, I want to download the Whisper model once, so that I can use high-quality speech recognition offline.

#### Acceptance Criteria

1. WHEN a user selects "English" from the language dropdown, THE System SHALL check if the Whisper model is already downloaded
2. WHEN the model is not downloaded, THE System SHALL display a download prompt with model size information
3. WHEN the user confirms download, THE System SHALL download the Whisper model (base.en, ~140MB) with progress indication
4. WHEN the download completes, THE System SHALL cache the model in IndexedDB for future use
5. WHEN the model is already cached, THE System SHALL load it directly without re-downloading

### Requirement 2: Whisper WebAssembly 초기화

**User Story:** As a system, I want to initialize whisper.cpp WebAssembly, so that I can process audio in the browser.

#### Acceptance Criteria

1. WHEN the Whisper model is ready, THE System SHALL load whisper.cpp WebAssembly module
2. WHEN WASM loads successfully, THE System SHALL initialize the Whisper context with the model
3. WHEN initialization fails, THE System SHALL display an error message and suggest browser compatibility check
4. THE System SHALL complete initialization within 10 seconds
5. THE System SHALL display initialization progress to the user

### Requirement 3: 실시간 오디오 캡처 및 버퍼링

**User Story:** As a user, I want continuous audio capture, so that my speech is recognized in real-time.

#### Acceptance Criteria

1. WHEN recording starts, THE System SHALL capture audio from the microphone at 16kHz sample rate
2. WHEN audio is captured, THE System SHALL buffer it in 30ms chunks
3. WHEN the buffer reaches 3 seconds, THE System SHALL send it to Whisper for processing
4. THE System SHALL maintain a sliding window buffer to avoid audio gaps
5. THE System SHALL continue capturing for 2+ hours without stopping

### Requirement 4: Whisper 실시간 인식

**User Story:** As a user, I want real-time speech recognition with high accuracy, so that my Middle Eastern and Indian English is recognized correctly.

#### Acceptance Criteria

1. WHEN Whisper receives an audio buffer, THE System SHALL process it and return transcribed text
2. WHEN transcription completes, THE System SHALL append the text to the transcript
3. WHEN processing takes longer than 3 seconds, THE System SHALL queue the next buffer
4. THE System SHALL display interim results while processing (if available)
5. THE System SHALL handle continuous speech without text loss

### Requirement 5: 텍스트 유실 방지

**User Story:** As a user, I want no text loss during long recordings, so that I can capture complete conversations.

#### Acceptance Criteria

1. WHEN audio buffers overlap, THE System SHALL deduplicate the overlapping portions
2. WHEN processing is delayed, THE System SHALL queue buffers and process sequentially
3. WHEN the queue exceeds 5 buffers, THE System SHALL display a "processing lag" warning
4. THE System SHALL maintain chronological order of all transcribed segments
5. THE System SHALL never drop audio data during recording

### Requirement 6: 성능 최적화

**User Story:** As a user, I want smooth performance, so that the browser doesn't freeze or lag.

#### Acceptance Criteria

1. WHEN processing audio, THE System SHALL use Web Workers to avoid blocking the main thread
2. WHEN the CPU is busy, THE System SHALL adjust buffer size dynamically (3-5 seconds)
3. WHEN memory usage exceeds 500MB, THE System SHALL release processed buffers
4. THE System SHALL process 3-second audio within 2 seconds (real-time factor < 0.67)
5. THE System SHALL display CPU usage indicator to the user

### Requirement 7: 에러 처리 및 복구

**User Story:** As a user, I want the system to handle errors gracefully, so that my recording doesn't crash.

#### Acceptance Criteria

1. WHEN Whisper processing fails, THE System SHALL retry up to 3 times before skipping the segment
2. WHEN WASM crashes, THE System SHALL restart the Whisper context and continue
3. WHEN the browser runs out of memory, THE System SHALL display an error and stop recording gracefully
4. WHEN the microphone disconnects, THE System SHALL pause and wait for reconnection
5. THE System SHALL log all errors to the debug panel without stopping the recording

### Requirement 8: 모델 관리

**User Story:** As a user, I want to manage downloaded models, so that I can free up storage space.

#### Acceptance Criteria

1. THE System SHALL display the current model size and storage usage
2. THE System SHALL provide a button to delete the cached model
3. WHEN the user deletes the model, THE System SHALL clear it from IndexedDB
4. THE System SHALL support multiple model sizes (tiny, base, small) with different accuracy/speed tradeoffs
5. THE System SHALL allow the user to switch models and re-download

### Requirement 9: 사용자 피드백

**User Story:** As a user, I want to see the system status, so that I know what's happening.

#### Acceptance Criteria

1. WHEN downloading the model, THE System SHALL display download progress (percentage and MB)
2. WHEN initializing Whisper, THE System SHALL display "Loading model..." with a spinner
3. WHEN processing audio, THE System SHALL display a subtle processing indicator
4. WHEN the queue is building up, THE System SHALL display "Processing lag: X buffers queued"
5. THE System SHALL display statistics: "Processed: X seconds | Queue: Y buffers"

### Requirement 10: 브라우저 호환성

**User Story:** As a user, I want the system to work on my browser, so that I don't need to switch browsers.

#### Acceptance Criteria

1. THE System SHALL support Chrome 90+ (with WebAssembly SIMD)
2. THE System SHALL support Edge 90+
3. THE System SHALL detect browser compatibility on startup
4. WHEN the browser is not supported, THE System SHALL display a clear error message with supported browser list
5. THE System SHALL fall back to Vosk if Whisper is not supported
