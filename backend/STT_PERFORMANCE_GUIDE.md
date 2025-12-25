# Speech-to-Text 성능 개선 가이드

## 현재 문제점

10문장 중 1문장만 인식되는 문제는 다음 원인들 때문입니다:

1. **Whisper의 근본적 한계**
   - Whisper는 배치 처리용으로 설계됨
   - 실시간 스트리밍에 최적화되지 않음
   - 짧은 오디오 세그먼트 처리가 약함

2. **세그먼트 타이밍**
   - 기존: 10초마다 전송 (너무 김)
   - 개선: 3초마다 전송 (여전히 느림)

3. **환각 필터링**
   - 너무 공격적인 필터링으로 실제 음성도 제거

## 적용된 개선사항

### 1. 프론트엔드 최적화
```javascript
// 세그먼트 길이: 10초 → 3초
// 최소 오디오 크기: 8000 bytes → 3000 bytes
```

### 2. 백엔드 최적화
```python
# VAD (Voice Activity Detection) 파라미터 조정
'threshold': 0.3,  # 더 민감하게 (0.5 → 0.3)
'min_speech_duration_ms': 100,  # 더 짧은 음성 허용 (250 → 100)
'min_silence_duration_ms': 500   # 더 빠른 반응 (2000 → 500)

# 처리 속도 개선
'beam_size': 3,  # 5 → 3
'best_of': 3,    # 5 → 3
```

### 3. 환각 필터링 완화
- 명백한 환각만 필터링
- 짧은 텍스트는 통과시킴

## 더 나은 솔루션

### 옵션 1: Web Speech API (브라우저 내장) ⭐ 추천

**장점**:
- 완전 실시간 (지연 없음)
- 무료
- 서버 불필요
- 매우 정확

**단점**:
- Chrome/Edge만 지원
- 인터넷 연결 필요

**구현**:
```javascript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  setTranscribedText(prev => prev + ' ' + transcript);
};

recognition.start();
```

### 옵션 2: Google Cloud Speech-to-Text API

**장점**:
- 최고 수준의 정확도
- 실시간 스트리밍 지원
- 자동 구두점
- 다양한 언어/방언

**단점**:
- 비용 발생 ($0.006/15초)
- 월 60분 무료

**구현**:
```python
from google.cloud import speech

client = speech.SpeechClient()
config = speech.RecognitionConfig(
    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
    sample_rate_hertz=16000,
    language_code="en-US",
    enable_automatic_punctuation=True
)

streaming_config = speech.StreamingRecognitionConfig(
    config=config,
    interim_results=True
)
```

### 옵션 3: AssemblyAI

**장점**:
- 실시간 WebSocket 지원
- 높은 정확도
- 간단한 API
- 월 5시간 무료

**단점**:
- 비용 발생 ($0.00025/초)

**구현**:
```python
import assemblyai as aai

aai.settings.api_key = "your-api-key"
transcriber = aai.RealtimeTranscriber(
    on_data=lambda transcript: print(transcript.text),
    on_error=lambda error: print(error)
)

transcriber.connect()
transcriber.stream(audio_data)
```

### 옵션 4: Deepgram

**장점**:
- 매우 빠른 실시간 처리
- 높은 정확도
- WebSocket 지원
- 합리적인 가격

**단점**:
- 비용 발생 ($0.0043/분)

## 권장 솔루션

### 단기 (즉시 적용 가능)

**Web Speech API 하이브리드**:
```javascript
// 1. 먼저 Web Speech API 시도 (실시간)
if ('webkitSpeechRecognition' in window) {
  useWebSpeechAPI();
} else {
  // 2. 지원 안되면 Faster-Whisper 사용
  useFasterWhisper();
}
```

### 장기 (최고 품질)

**Google Cloud Speech-to-Text**:
- 프로덕션 환경에서 가장 안정적
- 월 60분 무료로 테스트 가능
- 이후 사용량 기반 과금

## 성능 비교

| 솔루션 | 지연시간 | 정확도 | 비용 | 실시간 |
|--------|---------|--------|------|--------|
| Web Speech API | <100ms | ⭐⭐⭐⭐⭐ | 무료 | ✅ |
| Faster-Whisper | 1-3초 | ⭐⭐⭐⭐ | 무료 | ⚠️ |
| Google Cloud | <500ms | ⭐⭐⭐⭐⭐ | 유료 | ✅ |
| AssemblyAI | <500ms | ⭐⭐⭐⭐⭐ | 유료 | ✅ |
| Deepgram | <300ms | ⭐⭐⭐⭐⭐ | 유료 | ✅ |

## 즉시 테스트 가능한 코드

### Web Speech API 버전 (frontend/src/pages/speech-to-text/speech-to-text-webspeech.jsx)

```javascript
import { useState, useEffect, useRef } from 'react'

function SpeechToTextWebSpeech() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setTranscribedText(prev => prev + finalTranscript)
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'}
      </button>
      <textarea value={transcribedText} readOnly rows={15} />
    </div>
  )
}

export default SpeechToTextWebSpeech
```

## 결론

**즉시 개선**: 위의 최적화 적용 (이미 완료)
**최고 성능**: Web Speech API 사용 (Chrome/Edge)
**프로덕션**: Google Cloud Speech-to-Text

Whisper는 배치 처리용이므로 실시간 타이핑 느낌을 원한다면 다른 솔루션이 필요합니다.
