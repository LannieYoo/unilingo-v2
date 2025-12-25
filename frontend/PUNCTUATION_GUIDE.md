# 구두점 자동 추가 가이드

## 문제: 쉼표, 마침표 등 구두점이 자동으로 추가되지 않음

### 원인
Web Speech API는 기본적으로 **구두점을 자동으로 추가하지 않습니다**. 이것은 API의 제한사항입니다.

### 언어별 지원 현황

#### ✅ 자동 구두점 지원 (일부)
- **영어 (en-US, en-GB)**: 부분적으로 지원
  - 문장 끝에 마침표 자동 추가 (가끔)
  - 질문 형태에 물음표 추가 (가끔)
  - 일관성 없음

#### ❌ 자동 구두점 미지원
- **한국어 (ko-KR)**: 지원 안 함
- **중국어 (zh-CN)**: 지원 안 함
- 대부분의 언어

### 해결 방법

#### 방법 1: 음성으로 구두점 말하기 (권장)

영어에서는 구두점을 말로 표현할 수 있습니다:

| 말하기 | 결과 |
|--------|------|
| "Hello comma how are you" | "Hello, how are you" |
| "What is your name question mark" | "What is your name?" |
| "I love coding period" | "I love coding." |
| "Wow exclamation mark" | "Wow!" |
| "Open parenthesis note close parenthesis" | "(note)" |

**예시**:
```
말하기: "Hello comma my name is John period I am a developer period"
결과: "Hello, my name is John. I am a developer."
```

**한계**: 한국어, 중국어 등에서는 작동하지 않음

#### 방법 2: 수동으로 편집

1. 음성 인식 완료
2. Stop 버튼 클릭
3. 텍스트를 복사해서 편집기에 붙여넣기
4. 수동으로 구두점 추가

#### 방법 3: 자동 구두점 추가 스크립트 (향후 구현 가능)

간단한 규칙 기반 구두점 추가:
- 문장 끝 감지 → 마침표 추가
- 질문 단어 감지 (what, where, when, who, why, how) → 물음표 추가
- 긴 문장 → 쉼표 추가

**예시 코드** (향후 구현):
```javascript
function addPunctuation(text) {
  // 문장 끝에 마침표 추가
  text = text.replace(/([a-z])\s+([A-Z])/g, '$1. $2')
  
  // 질문에 물음표 추가
  text = text.replace(/(what|where|when|who|why|how)[^.?!]*$/gi, '$&?')
  
  // 첫 글자 대문자
  text = text.charAt(0).toUpperCase() + text.slice(1)
  
  return text
}
```

#### 방법 4: Google Cloud Speech-to-Text API (유료)

Google Cloud Speech-to-Text API는 **자동 구두점 지원**:

```javascript
const config = {
  encoding: 'LINEAR16',
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  enableAutomaticPunctuation: true  // ✅ 자동 구두점
}
```

**장점**:
- 모든 언어에서 자동 구두점
- 높은 정확도
- 일관성 있음

**단점**:
- 비용 발생 ($0.006/15초)
- 월 60분 무료

### 비교표

| 방법 | 정확도 | 비용 | 언어 지원 | 자동화 |
|------|--------|------|-----------|--------|
| 음성으로 말하기 | 중간 | 무료 | 영어만 | 수동 |
| 수동 편집 | 높음 | 무료 | 모든 언어 | 수동 |
| 규칙 기반 스크립트 | 낮음 | 무료 | 제한적 | 자동 |
| Google Cloud API | 높음 | 유료 | 모든 언어 | 자동 |

### 권장 사항

#### 영어 사용자
1. **짧은 텍스트**: 음성으로 구두점 말하기
   - "Hello comma how are you question mark"
2. **긴 텍스트**: 수동 편집
   - 음성 인식 → 복사 → 편집기에서 구두점 추가

#### 한국어/중국어 사용자
1. **모든 경우**: 수동 편집
   - Web Speech API는 한국어/중국어 구두점 미지원
   - 음성 인식 후 수동으로 추가

#### 프로덕션 환경
- **Google Cloud Speech-to-Text API** 사용 권장
- 자동 구두점 + 높은 정확도
- 월 60분 무료로 테스트 가능

### 향후 개선 계획

#### 1단계: 규칙 기반 구두점 추가 (무료)
- 문장 끝 감지
- 질문 감지
- 쉼표 추가 (긴 문장)

#### 2단계: AI 기반 구두점 추가 (무료)
- 로컬 AI 모델 사용
- 문맥 이해
- 높은 정확도

#### 3단계: Google Cloud API 통합 (유료 옵션)
- 완벽한 자동 구두점
- 모든 언어 지원
- 사용자 선택 가능

### 테스트 예시

#### 영어 - 구두점 말하기
```
입력: "Hello comma my name is John period What is your name question mark"
출력: "Hello, my name is John. What is your name?"
```

#### 영어 - 자동 구두점 (불안정)
```
입력: "Hello my name is John What is your name"
출력: "Hello my name is John What is your name" (구두점 없음)
또는: "Hello my name is John. What is your name?" (가끔 추가됨)
```

#### 한국어 - 구두점 없음
```
입력: "안녕하세요 제 이름은 홍길동입니다 당신의 이름은 무엇인가요"
출력: "안녕하세요 제 이름은 홍길동입니다 당신의 이름은 무엇인가요" (구두점 없음)
```

### 결론

- Web Speech API는 **구두점 자동 추가를 지원하지 않음**
- 영어에서는 **음성으로 구두점 말하기** 가능
- 한국어/중국어는 **수동 편집 필요**
- 완벽한 자동 구두점이 필요하면 **Google Cloud API** 사용

### 참고 자료

- [Web Speech API Specification](https://wicg.github.io/speech-api/)
- [Google Cloud Speech-to-Text - Automatic Punctuation](https://cloud.google.com/speech-to-text/docs/automatic-punctuation)
- [Speech Recognition Punctuation Commands](https://support.google.com/accessibility/android/answer/6151848)
