# Implementation Plan: Whisper WebAssembly STT for English

## Overview

Implement a browser-based Speech-to-Text system using whisper.cpp WebAssembly for English model. The system runs entirely in the browser with high accent recognition (Middle Eastern and Indian English), no server dependency, and 2+ hour continuous recording capability.

## Tasks

- [x] 1. Whisper 모델 다운로드 및 캐싱 구현
  - IndexedDB 기반 모델 캐싱 시스템 구현
  - 모델 다운로드 진행률 표시
  - 모델 검증 및 관리
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.1 WhisperModelManager 클래스 생성
  - `frontend/src/modules/stt_stream/_07_utils/WhisperModelManager.js` 생성
  - IndexedDB 초기화 및 연결
  - `isModelCached(modelSize)` 메서드
  - `downloadModel(modelSize, onProgress)` 메서드 (fetch with progress)
  - `getCachedModel(modelSize)` 메서드
  - `deleteModel(modelSize)` 메서드
  - `getStorageInfo()` 메서드
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.2 WhisperModelManager 유닛 테스트 작성
  - **Property 1: Model Caching (Round-trip)**
  - **Property 2: Model Download Progress**
  - **Property 20: Storage Quota Check**
  - IndexedDB 모킹 테스트
  - _Requirements: 1.4, 1.3, 8.1_

- [ ] 2. Whisper Web Worker 구현
  - whisper.cpp WASM을 Web Worker에서 실행
  - 모델 초기화 및 오디오 처리
  - 메시지 기반 통신
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 whisper.worker.js 생성
  - `frontend/src/modules/stt_stream/_07_utils/whisper.worker.js` 생성
  - whisper.wasm.js import
  - 메시지 핸들러 구현 (init, transcribe, stop)
  - Whisper context 초기화
  - 오디오 처리 및 transcription
  - 에러 처리 및 재시도 로직
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.2 Worker 통합 테스트 작성
  - **Property 3: WASM Initialization Timeout**
  - **Property 11: Error Recovery**
  - **Property 12: WASM Crash Recovery**
  - Worker 메시지 통신 테스트
  - _Requirements: 2.4, 7.1, 7.2_

- [ ] 3. 오디오 캡처 및 버퍼링 구현
  - AudioWorklet 기반 오디오 캡처
  - 슬라이딩 윈도우 버퍼링
  - 16kHz 리샘플링
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.1 AudioCaptureManager 클래스 생성
  - `frontend/src/modules/stt_stream/_07_utils/AudioCaptureManager.js` 생성
  - AudioWorklet 초기화
  - 마이크 권한 요청
  - `start(onBuffer)` 메서드
  - `stop()` 메서드
  - 슬라이딩 윈도우 버퍼 (3초, 0.5초 오버랩)
  - `getCurrentBuffer()` 메서드
  - `getStatus()` 메서드
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 3.2 AudioCaptureManager 유닛 테스트 작성
  - **Property 4: Audio Capture Continuity**
  - **Property 5: Buffer Size Consistency**
  - AudioWorklet 모킹 테스트
  - _Requirements: 3.5, 3.3_

- [ ] 4. 텍스트 중복 제거 구현
  - 오버랩 오디오로 인한 중복 텍스트 제거
  - 유사도 기반 매칭
  - _Requirements: 5.1, 5.2_

- [ ] 4.1 TranscriptDeduplicator 클래스 생성
  - `frontend/src/modules/stt_stream/_07_utils/TranscriptDeduplicator.js` 생성
  - `addText(newText)` 메서드
  - 단어 기반 유사도 계산
  - 중복 부분 제거 알고리즘
  - `reset()` 메서드
  - _Requirements: 5.1, 5.2_

- [ ]* 4.2 TranscriptDeduplicator 유닛 테스트 작성
  - **Property 8: Text Deduplication**
  - 다양한 오버랩 시나리오 테스트
  - _Requirements: 5.1_

- [ ] 5. useWhisperSTT Hook 구현
  - Whisper STT 전체 흐름 관리
  - 모델 다운로드, 초기화, 녹음, 처리
  - 상태 관리
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.4, 5.5_

- [ ] 5.1 useWhisperSTT hook 생성
  - `frontend/src/modules/stt_stream/_04_hooks/useWhisperSTT.js` 생성
  - WhisperModelManager 초기화
  - Worker 생성 및 통신
  - AudioCaptureManager 초기화
  - TranscriptDeduplicator 초기화
  - `start()` 메서드 (모델 확인 → 다운로드 → 초기화 → 녹음)
  - `stop()` 메서드
  - `toggle()` 메서드
  - `downloadModel(modelSize)` 메서드
  - `deleteModel()` 메서드
  - 상태 관리 (isRunning, isModelReady, isDownloading, downloadProgress)
  - Transcript 관리 (transcript, interimTranscript)
  - 통계 관리 (stats)
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.4, 5.5_

- [ ]* 5.2 useWhisperSTT hook 통합 테스트 작성
  - **Property 6: Processing Queue Order**
  - **Property 9: Chronological Order**
  - **Property 10: No Text Loss**
  - 전체 플로우 테스트 (다운로드 → 녹음 → 처리)
  - _Requirements: 4.3, 5.4, 5.5_

- [ ] 6. UI 통합 및 모드 라우팅
  - SttStreamView에 Whisper 모드 추가
  - English 선택 시 Whisper 활성화
  - 다른 언어는 기존 Vosk 유지
  - _Requirements: 1.1, 1.2_

- [ ] 6.1 LANGUAGE_OPTIONS 업데이트
  - `frontend/src/modules/stt_stream/_08_constants/index.js` 수정
  - English 옵션을 Whisper 모드로 변경
  - `{ value: 'en-us', label: 'English', usesWhisper: true }` 추가
  - _Requirements: 1.1_

- [ ] 6.2 SttStreamView에 Whisper 모드 라우팅 추가
  - `frontend/src/modules/stt_stream/_02_views/SttStreamView.jsx` 수정
  - `useWhisperSTT` import
  - 언어 선택에 따른 hook 선택 로직
  - `selectedLang === 'en-us' ? useWhisperSTT() : useVoskRecognition()`
  - Whisper 모드 안내 메시지 표시
  - _Requirements: 1.1, 1.2_

- [ ] 7. 모델 다운로드 UI 구현
  - 모델 다운로드 프롬프트
  - 진행률 표시
  - 모델 관리 UI
  - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3, 9.1, 9.2_

- [ ] 7.1 ModelDownloadManager 컴포넌트 업데이트
  - `frontend/src/modules/stt_stream/_03_components/ModelDownloadManager.jsx` 수정
  - Whisper 모델 지원 추가
  - 모델 크기 및 정보 표시
  - 다운로드 진행률 표시 (percentage, MB)
  - 모델 삭제 버튼
  - 스토리지 사용량 표시
  - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.3, 9.1_

- [ ] 7.2 다운로드 프롬프트 모달 추가
  - 모델 미다운로드 시 프롬프트 표시
  - 모델 크기 및 다운로드 시간 안내
  - 확인/취소 버튼
  - _Requirements: 1.2, 9.1_

- [ ] 8. 상태 표시 및 피드백 UI
  - 처리 상태 표시
  - 큐 상태 표시
  - 통계 표시
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [ ] 8.1 Whisper 상태 인디케이터 추가
  - SttStreamView에 상태 표시 추가
  - "Loading model..." (초기화 중)
  - "Processing..." (처리 중)
  - "Processing lag: X buffers queued" (큐 경고)
  - _Requirements: 9.2, 9.3, 9.4_

- [ ] 8.2 통계 표시 추가
  - SttStreamView에 통계 표시 추가
  - "Processed: X seconds | Queue: Y buffers"
  - CPU 사용률 표시 (선택적)
  - 메모리 사용량 표시 (선택적)
  - _Requirements: 9.5_

- [ ] 9. 에러 처리 및 복구 로직
  - 다양한 에러 시나리오 처리
  - Graceful fallback
  - 사용자 피드백
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9.1 에러 처리 로직 구현
  - useWhisperSTT에 에러 핸들러 추가
  - 모델 다운로드 실패 처리
  - WASM 초기화 실패 처리
  - WASM 크래시 복구
  - 메모리 부족 처리
  - 마이크 연결 해제 처리
  - 처리 타임아웃 처리
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9.2 Fallback to Vosk 구현
  - 브라우저 호환성 체크
  - Whisper 지원 불가 시 Vosk로 fallback
  - 사용자에게 안내 메시지 표시
  - _Requirements: 10.3, 10.4, 10.5_

- [ ]* 9.3 에러 처리 테스트 작성
  - **Property 11: Error Recovery**
  - **Property 12: WASM Crash Recovery**
  - **Property 16: Fallback to Vosk**
  - 다양한 에러 시나리오 테스트
  - _Requirements: 7.1, 7.2, 10.5_

- [ ] 10. 브라우저 호환성 체크
  - WebAssembly SIMD 지원 확인
  - 필수 API 지원 확인
  - 호환성 안내 메시지
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.1 브라우저 호환성 체크 함수 생성
  - `frontend/src/modules/stt_stream/_07_utils/browserCompatibility.js` 생성
  - `isWhisperSupported()` 함수
  - WebAssembly 체크
  - WebAssembly SIMD 체크
  - IndexedDB 체크
  - Web Workers 체크
  - AudioWorklet 체크
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 10.2 호환성 안내 메시지 추가
  - 지원되지 않는 브라우저 감지 시 메시지 표시
  - 지원 브라우저 목록 표시 (Chrome 90+, Edge 90+)
  - Vosk fallback 안내
  - _Requirements: 10.4, 10.5_

- [ ]* 10.3 호환성 테스트 작성
  - **Property 15: Browser Compatibility Detection**
  - 다양한 브라우저 환경 모킹 테스트
  - _Requirements: 10.3_

- [ ] 11. 성능 최적화
  - 메모리 관리
  - CPU 사용률 최적화
  - 버퍼 크기 동적 조정
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 11.1 메모리 관리 최적화
  - 처리 완료된 버퍼 즉시 해제
  - Worker 메모리 모니터링
  - 메모리 부족 시 경고
  - _Requirements: 6.3, 7.3_

- [ ] 11.2 동적 버퍼 크기 조정
  - CPU 사용률에 따라 버퍼 크기 조정 (3-5초)
  - 처리 지연 시 버퍼 크기 증가
  - _Requirements: 6.2_

- [ ]* 11.3 성능 테스트 작성
  - **Property 7: Real-time Factor**
  - **Property 13: Memory Cleanup**
  - **Property 17: Queue Size Limit**
  - 처리 속도 측정
  - 메모리 사용량 측정
  - _Requirements: 6.4, 6.3, 5.3_

- [ ] 12. whisper.cpp WASM 통합
  - whisper.wasm.js 다운로드 및 설정
  - CDN 또는 로컬 호스팅
  - 버전 관리
  - _Requirements: 2.1, 2.2_

- [ ] 12.1 whisper.wasm.js 설정
  - `frontend/public/` 디렉토리에 whisper.wasm.js 추가
  - 또는 CDN 링크 설정
  - Worker에서 importScripts로 로드
  - _Requirements: 2.1_

- [ ] 12.2 WASM 초기화 테스트
  - 샘플 오디오로 transcription 테스트
  - 모델 로딩 시간 측정
  - 처리 속도 측정
  - _Requirements: 2.2, 2.4_

- [ ] 13. 기존 Hybrid 모드 코드 제거
  - 사용하지 않는 컴포넌트 정리
  - 백엔드 엔드포인트 제거
  - _Requirements: N/A (cleanup)_

- [ ] 13.1 프론트엔드 코드 정리
  - `useHybridSTT.js` 삭제 (또는 백업)
  - `WebSpeechManager.js` 삭제
  - `MissingSegmentProcessor.js` 삭제
  - 관련 import 제거
  - _Requirements: N/A_

- [ ] 13.2 백엔드 코드 정리
  - `/api/stt/process-missing` 엔드포인트 제거 (또는 주석 처리)
  - `vosk_processor.py` 제거 (또는 백업)
  - 관련 import 제거
  - _Requirements: N/A_

- [ ] 14. Checkpoint - 통합 테스트 및 검증
  - 모든 컴포넌트가 통합되어 작동하는지 확인
  - 사용자에게 질문이 있으면 물어보기

- [ ] 15. 문서화 및 배포 준비
  - README 업데이트
  - 환경 변수 설정 가이드
  - 배포 체크리스트
  - _Requirements: All_

- [ ] 15.1 README 업데이트
  - Whisper 모드 설명 추가
  - 브라우저 요구사항 추가
  - 모델 다운로드 가이드 추가
  - 성능 최적화 팁 추가

- [ ] 15.2 환경 변수 설정
  - `.env.example` 업데이트
  - `VITE_WHISPER_MODEL_URL` 추가
  - `VITE_WHISPER_DEFAULT_MODEL` 추가

- [ ] 15.3 배포 체크리스트 작성
  - whisper.wasm.js 호스팅 확인
  - 모델 다운로드 URL 확인
  - 브라우저 호환성 테스트
  - 수동 테스트 (중동/인도 악센트)

- [ ] 16. Final Checkpoint - 전체 시스템 검증
  - 모든 테스트 통과 확인
  - 수동 테스트 완료 확인
  - 사용자에게 최종 확인 요청

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Whisper 모드는 English 전용, 다른 언어는 기존 Vosk 유지
- base.en 모델(140MB)을 기본값으로 사용
- 성능 부족 시 small.en 모델로 업그레이드 가능

## Implementation Priority

### Phase 1: Core Functionality (Tasks 1-5)
- 모델 다운로드 및 캐싱
- Worker 구현
- 오디오 캡처
- 중복 제거
- Hook 통합

### Phase 2: UI Integration (Tasks 6-8)
- 모드 라우팅
- 다운로드 UI
- 상태 표시

### Phase 3: Error Handling & Optimization (Tasks 9-11)
- 에러 처리
- 브라우저 호환성
- 성능 최적화

### Phase 4: Cleanup & Documentation (Tasks 12-16)
- WASM 통합
- 코드 정리
- 문서화
- 배포 준비

## Estimated Timeline

- Phase 1: 3-4 days
- Phase 2: 1-2 days
- Phase 3: 2-3 days
- Phase 4: 1 day
- **Total: 7-10 days**

## Testing Strategy Summary

### Unit Tests (Optional)
- WhisperModelManager: 모델 다운로드/캐싱/삭제
- AudioCaptureManager: 오디오 캡처/버퍼링
- TranscriptDeduplicator: 중복 제거 알고리즘
- useWhisperSTT: Hook 상태 관리

### Property-Based Tests (Optional)
- 20개 correctness properties
- 각 property당 100+ iterations
- 자동화된 edge case 발견

### Integration Tests
- End-to-end 플로우 테스트
- 브라우저 호환성 테스트
- 장시간 녹음 테스트 (2+ hours)

### Manual Tests
- 중동 악센트 테스트
- 인도 악센트 테스트
- 다양한 브라우저 테스트
- 성능 측정
