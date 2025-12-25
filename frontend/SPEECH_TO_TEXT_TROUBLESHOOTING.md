# Speech-to-Text 문제 해결 가이드

## 문제 1: Play 버튼을 눌렀는데 텍스트가 나타나지 않음

### 수정된 내용

## 문제 2: 15초 정도 지나면 성능이 떨어지는 것 같음

### 원인
Web Speech API는 **자동으로 약 15초 후에 종료**됩니다. 이것은 브라우저의 제한사항입니다.

### 해결책
`onend` 이벤트를 감지하고 자동으로 재시작하는 로직을 추가했습니다.

**수정 전**:
```javascript
recognition.onend = () => {
  console.log('Speech recognition ended')
  setStatusMessage('')
}
// ❌ 15초 후 종료되면 그대로 멈춤
```

**수정 후**:
```javascript
recognition.onend = () => {
  console.log('Speech recognition ended')
  
  // Auto-restart if still recording
  if (isRecordingRef.current) {
    console.log('Auto-restarting recognition...')
    setTimeout(() => {
      if (isRecordingRef.current && recognitionRef.current) {
        recognitionRef.current.start()
      }
    }, 100)
  }
}
// ✅ 15초 후 자동으로 재시작하여 계속 인식
```

### 테스트 방법
1. `/speech-to-text-test` 페이지 접속
2. Start 버튼 클릭
3. 30초 이상 계속 말하기
4. Debug Log에서 다음 확인:
   - `⚠️ AUTO-RESTART #1 - API timeout detected at 15.2s` (정확한 시간 표시)
   - `⚠️ AUTO-RESTART #2 - API timeout detected at 30.4s`
5. 화면 상단에 재시작 횟수 표시: `🔄 Restarts: 2`

### 수정된 내용 (문제 1)

#### 1. useEffect Dependency 문제 수정
**문제**: `useEffect`의 dependency array에 `isRecording`이 포함되어 있어서, 녹음을 시작할 때마다 recognition 객체가 재생성되었습니다.

**수정 전**:
```javascript
useEffect(() => {
  // ... recognition 초기화
}, [selectedLanguage, isRecording])  // ❌ isRecording이 변경될 때마다 재생성
```

**수정 후**:
```javascript
useEffect(() => {
  // ... recognition 초기화
}, [selectedLanguage])  // ✅ 언어 변경시에만 재생성
```

#### 2. 디버깅 로그 추가
- `onresult` 이벤트에서 받은 데이터를 콘솔에 출력
- Final/Interim transcript를 구분해서 로깅

#### 3. 테스트 페이지 생성
- `/speech-to-text-test` 경로에 디버그 모드 페이지 추가
- 모든 이벤트를 화면에 표시하는 Debug Log 추가

## 테스트 방법

### 1. 기본 페이지 테스트
1. 브라우저에서 `http://localhost:5173/speech-to-text` 접속
2. Chrome 또는 Edge 브라우저 사용 (필수)
3. F12를 눌러 개발자 도구 열기
4. Console 탭 확인
5. Start 버튼 클릭
6. 마이크 권한 허용
7. 영어로 말하기 (예: "Hello, how are you?")
8. Console에서 다음 로그 확인:
   - "Speech recognition started"
   - "Speech recognition result: ..."
   - "Interim transcript: ..." (말하는 중)
   - "Final transcript: ..." (말이 끝났을 때)

### 2. 디버그 페이지 테스트
1. 브라우저에서 `http://localhost:5173/speech-to-text-test` 접속
2. Start 버튼 클릭
3. 화면 하단의 "Debug Log" 섹션 확인
4. 다음 로그가 순서대로 나타나는지 확인:
   - `[시간] Component mounted`
   - `[시간] Web Speech API supported`
   - `[시간] Recognition initialized with language: en-US`
   - `[시간] Start button clicked - recognition.start() called`
   - `[시간] Recognition started`
   - `[시간] Audio capture started`
   - `[시간] Sound detected`
   - `[시간] Speech detected`
   - `[시간] Interim: "hello"` (말하는 중)
   - `[시간] Final: "hello" (confidence: 0.95)` (말이 끝났을 때)

## 일반적인 문제 및 해결책

### 문제 1: "Web Speech API not supported" 메시지
**원인**: Firefox, Safari 등 지원하지 않는 브라우저 사용
**해결**: Chrome 또는 Edge 브라우저 사용

### 문제 2: "Microphone access denied" 에러
**원인**: 마이크 권한이 거부됨
**해결**:
1. 브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭
2. "마이크" 권한을 "허용"으로 변경
3. 페이지 새로고침

### 문제 3: "No speech detected" 에러
**원인**: 
- 마이크가 음소거되어 있음
- 마이크 볼륨이 너무 낮음
- 잘못된 마이크 선택

**해결**:
1. Windows 설정 → 시스템 → 소리 → 입력
2. 올바른 마이크 선택
3. 마이크 볼륨 확인 (50% 이상 권장)
4. "마이크 테스트" 기능으로 마이크 작동 확인

### 문제 4: Interim text는 나타나지만 Final text가 안 나타남
**원인**: 말을 멈추지 않고 계속 말함
**해결**: 
- 문장을 말한 후 1-2초 정도 멈추기
- 브라우저가 자동으로 문장의 끝을 감지함

### 문제 5: 한국어/중국어가 인식되지 않음
**원인**: 
- 언어 선택이 잘못됨
- 브라우저의 언어 모델이 설치되지 않음

**해결**:
1. 언어 드롭다운에서 올바른 언어 선택
2. Chrome 설정 → 언어 → 해당 언어 추가
3. 페이지 새로고침

### 문제 6: 텍스트가 중간에 끊김
**원인**: `continuous: false` 설정
**해결**: 이미 `continuous: true`로 설정되어 있음 (수정 완료)

## 브라우저별 지원 현황

| 브라우저 | 지원 여부 | 비고 |
|---------|----------|------|
| Chrome | ✅ 완전 지원 | 권장 |
| Edge | ✅ 완전 지원 | 권장 |
| Firefox | ❌ 미지원 | Web Speech API 미구현 |
| Safari | ⚠️ 부분 지원 | iOS 14.5+ 일부 지원 |
| Opera | ✅ 지원 | Chromium 기반 |

## 성능 최적화 팁

1. **조용한 환경에서 사용**: 배경 소음이 적을수록 정확도 향상
2. **마이크와의 거리**: 30-50cm 거리 유지
3. **명확한 발음**: 또박또박 말하기
4. **문장 단위로 말하기**: 긴 문장보다는 짧은 문장으로 나누기
5. **언어 선택 정확히**: 말하는 언어와 선택한 언어 일치시키기

## 추가 디버깅

### Console에서 확인할 사항
```javascript
// 1. Web Speech API 지원 확인
console.log('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

// 2. 마이크 권한 확인
navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Microphone permission:', result.state)
})

// 3. 미디어 장치 확인
navigator.mediaDevices.enumerateDevices().then(devices => {
  const microphones = devices.filter(d => d.kind === 'audioinput')
  console.log('Available microphones:', microphones)
})
```

## 문제가 계속되면

1. 브라우저 캐시 삭제
2. 브라우저 재시작
3. 컴퓨터 재시작
4. 다른 마이크로 테스트
5. 다른 브라우저로 테스트 (Chrome/Edge)

## 문제 3: 중간에 텍스트가 씹히거나 사라짐

### 원인
`event.resultIndex`만 사용하면 일부 결과가 누락될 수 있음

### 해결책
모든 결과를 처리하도록 수정:

**수정 전**:
```javascript
for (let i = event.resultIndex; i < event.results.length; i++) {
  // ❌ 일부 결과 누락 가능
}
```

**수정 후**:
```javascript
for (let i = 0; i < event.results.length; i++) {
  // ✅ 모든 결과 처리
}
```

## 문제 4: 구두점이 자동으로 추가되지 않음

### 원인
Web Speech API는 기본적으로 구두점을 추가하지 않음

### 해결책
간단한 규칙 기반 자동 구두점 추가:

```javascript
const addBasicPunctuation = (text) => {
  let result = text.trim()
  
  // 첫 글자 대문자
  result = result.charAt(0).toUpperCase() + result.slice(1)
  
  // 질문이면 물음표, 아니면 마침표
  const questionWords = /^(what|where|when|who|why|how)/i
  if (questionWords.test(result)) {
    result += '?'
  } else {
    result += '.'
  }
  
  return result
}
```

### 기능
- ✅ 첫 글자 자동 대문자
- ✅ 질문 감지 → 물음표 추가
- ✅ 일반 문장 → 마침표 추가
- ✅ 문장 사이 자동 띄어쓰기

### 예시
```
입력: "hello how are you"
출력: "Hello how are you."

입력: "what is your name"
출력: "What is your name?"
```

## 문제 5: 텍스트가 많아지면 스크롤이 자동으로 안 내려감

### 원인
textarea에 텍스트가 추가되어도 자동으로 스크롤되지 않음

### 해결책
`useEffect`를 사용하여 텍스트가 변경될 때마다 자동으로 맨 아래로 스크롤:

```javascript
const textareaRef = useRef(null)

// Auto-scroll textarea to bottom when text changes
useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.scrollTop = textareaRef.current.scrollHeight
  }
}, [transcribedText, interimText])

<textarea ref={textareaRef} ... />
```

### 결과
- ✅ 새로운 텍스트가 추가될 때마다 자동으로 맨 아래로 스크롤
- ✅ 실시간으로 타이핑되는 텍스트를 항상 볼 수 있음
- ✅ 수동으로 위로 스크롤해서 이전 텍스트도 확인 가능

## 참고 자료

- [Web Speech API MDN 문서](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Chrome Speech Recognition](https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api/)
