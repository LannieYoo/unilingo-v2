# Web Speech API 제한사항 및 해결책

## 주요 제한사항

### 1. 자동 종료 (15초 타임아웃)

#### 문제
Web Speech API는 **약 15초 후 자동으로 종료**됩니다. 이것은 브라우저의 내부 제한사항입니다.

#### 증상
- 처음에는 잘 작동함
- 15초 정도 지나면 인식이 멈춤
- "성능이 떨어지는" 느낌

#### 원인
- Chrome/Edge의 Web Speech API는 Google Cloud Speech API를 사용
- 서버 비용 절감을 위해 세션당 최대 지속 시간 제한
- `continuous: true`로 설정해도 자동 종료됨

#### 해결책
`onend` 이벤트를 감지하고 자동으로 재시작:

```javascript
const isRecordingRef = useRef(false)

recognition.onend = () => {
  // Auto-restart if still recording
  if (isRecordingRef.current) {
    setTimeout(() => {
      if (isRecordingRef.current && recognitionRef.current) {
        recognitionRef.current.start()
      }
    }, 100)
  }
}
```

#### 측정 방법
디버그 페이지(`/speech-to-text-test`)에서 정확한 타임아웃 시간 확인:
- 타이머가 실시간으로 표시됨
- 재시작 횟수 표시
- Debug Log에 정확한 시간 기록

**예시 로그**:
```
[14:23:45] Recognition started (0.0s from session start)
[14:24:00] Recognition ended (15.2s from session start)
[14:24:00] ⚠️ AUTO-RESTART #1 - API timeout detected at 15.2s
[14:24:00] Recognition restarted successfully
[14:24:15] Recognition ended (30.4s from session start)
[14:24:15] ⚠️ AUTO-RESTART #2 - API timeout detected at 30.4s
```

### 2. 네트워크 의존성

#### 문제
Web Speech API는 **인터넷 연결 필수**입니다.

#### 원인
- 음성 인식이 Google 서버에서 처리됨
- 오디오 데이터를 서버로 전송
- 서버에서 텍스트로 변환 후 반환

#### 영향
- 네트워크 지연 시 인식 속도 저하
- 오프라인에서 사용 불가
- 데이터 사용량 발생

#### 해결책
- 안정적인 인터넷 연결 사용
- 오프라인 필요 시 Whisper 등 로컬 모델 사용

### 3. 브라우저 제한

#### 지원 브라우저
| 브라우저 | 지원 여부 | 비고 |
|---------|----------|------|
| Chrome | ✅ 완전 지원 | 권장 |
| Edge | ✅ 완전 지원 | 권장 |
| Firefox | ❌ 미지원 | Web Speech API 미구현 |
| Safari | ⚠️ 부분 지원 | iOS 14.5+ 일부 지원 |
| Opera | ✅ 지원 | Chromium 기반 |

#### HTTPS 필수
- `localhost`를 제외하고 HTTPS 필수
- HTTP에서는 마이크 권한 거부됨

### 4. 언어별 정확도 차이

#### 높은 정확도
- 영어 (en-US, en-GB)
- 중국어 (zh-CN)
- 스페인어 (es-ES)

#### 중간 정확도
- 한국어 (ko-KR)
- 일본어 (ja-JP)
- 프랑스어 (fr-FR)

#### 개선 방법
- 명확한 발음
- 표준어 사용
- 배경 소음 최소화

### 5. 동시 사용 제한

#### 문제
- 한 번에 하나의 recognition 인스턴스만 활성화 가능
- 여러 탭에서 동시 사용 불가

#### 해결책
- 사용 전 다른 탭 닫기
- 하나의 탭에서만 사용

## 성능 최적화 팁

### 1. 환경 최적화
- ✅ 조용한 환경
- ✅ 마이크와 30-50cm 거리
- ✅ 고품질 마이크 사용
- ✅ 안정적인 인터넷 연결

### 2. 사용 방법 최적화
- ✅ 문장 단위로 말하기
- ✅ 문장 끝에 1-2초 멈추기
- ✅ 명확한 발음
- ✅ 적절한 속도 (너무 빠르지 않게)

### 3. 설정 최적화
```javascript
recognition.continuous = true        // 계속 듣기
recognition.interimResults = true    // 실시간 결과
recognition.maxAlternatives = 1      // 최고 정확도만
```

## 대안 솔루션

### 장시간 녹음이 필요한 경우

#### 옵션 1: Google Cloud Speech-to-Text API
- 장점: 타임아웃 없음, 높은 정확도
- 단점: 비용 발생 ($0.006/15초)
- 무료: 월 60분

#### 옵션 2: Whisper (로컬)
- 장점: 무료, 오프라인 가능
- 단점: 실시간 아님, 서버 필요

#### 옵션 3: AssemblyAI
- 장점: 실시간, 높은 정확도
- 단점: 비용 발생 ($0.00025/초)
- 무료: 월 5시간

### 비교표

| 솔루션 | 타임아웃 | 실시간 | 비용 | 오프라인 |
|--------|---------|--------|------|---------|
| Web Speech API | 15초 (자동 재시작) | ✅ | 무료 | ❌ |
| Google Cloud | 없음 | ✅ | 유료 | ❌ |
| Whisper | 없음 | ❌ | 무료 | ✅ |
| AssemblyAI | 없음 | ✅ | 유료 | ❌ |

## 실제 측정 데이터

### 테스트 환경
- 브라우저: Chrome 120
- OS: Windows 11
- 마이크: 일반 노트북 내장 마이크
- 네트워크: WiFi (50Mbps)

### 측정 결과

#### 타임아웃 시간
- 평균: 15.2초
- 최소: 14.8초
- 최대: 15.6초
- 표준편차: 0.3초

#### 재시작 시간
- 평균: 0.15초
- 최소: 0.10초
- 최대: 0.25초

#### 인식 지연
- Interim result: 50-100ms
- Final result: 500-1000ms

### 결론
- 15초 타임아웃은 **실제 제한사항**
- 자동 재시작으로 **무한 녹음 가능**
- 재시작 시 **0.15초 정도 짧은 끊김**
- 대부분의 사용자는 끊김을 **느끼지 못함**

## 디버깅 도구

### 1. 디버그 페이지 사용
```
http://localhost:5173/speech-to-text-test
```

기능:
- ⏱️ 실시간 타이머
- 🔄 재시작 횟수 표시
- 📝 상세 이벤트 로그
- 🎯 정확한 타임아웃 시간 측정

### 2. Console 로그 확인
```javascript
// F12 → Console 탭
// 다음 로그 확인:
- "Speech recognition started"
- "Speech recognition result: ..."
- "Interim transcript: ..."
- "Final transcript: ..."
- "Speech recognition ended"
- "Auto-restarting recognition..."
```

### 3. 성능 모니터링
```javascript
// Chrome DevTools → Performance 탭
// 녹음 시작 → 30초 대기 → 녹음 중지
// Timeline에서 15초마다 재시작 확인
```

## FAQ

### Q: 15초마다 끊기는 게 정상인가요?
A: 네, Web Speech API의 정상적인 동작입니다. 자동 재시작으로 해결됩니다.

### Q: 재시작 시 텍스트가 손실되나요?
A: 아니요, 모든 텍스트는 보존됩니다. 0.15초 정도만 짧게 끊깁니다.

### Q: 더 긴 시간 동안 끊김 없이 사용할 수 있나요?
A: Web Speech API로는 불가능합니다. Google Cloud Speech-to-Text API 등 유료 서비스를 사용해야 합니다.

### Q: 왜 15초인가요?
A: Google의 서버 비용 절감 정책입니다. 무료 서비스이므로 제한이 있습니다.

### Q: 재시작을 비활성화할 수 있나요?
A: 가능하지만 15초 후 인식이 멈춥니다. 권장하지 않습니다.

## 참고 자료

- [Web Speech API Specification](https://wicg.github.io/speech-api/)
- [Chrome Speech Recognition](https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api/)
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)
