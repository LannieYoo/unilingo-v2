# 실시간 음성 인식 + 번역 가이드

## 개요

음성을 인식하면서 동시에 선택한 언어로 실시간 번역해주는 기능입니다.

## 접속 방법

### 웹 브라우저
```
http://localhost:5173/speech-to-text-translate
```

### 메뉴에서 접근
상단 메뉴에서 **Speech to Text** 클릭

## 주요 기능

### 1. 실시간 음성 인식
- Web Speech API 사용
- 자동 구두점 추가
- 자동 재시작 (15초 타임아웃 해결)

### 2. 실시간 번역
- 백엔드 API 사용
- 문장 단위로 즉시 번역
- 3단계 폴백 시스템 (Google Direct → MyMemory → Google Proxy)

### 3. 2개 창 분할
- 왼쪽: 원본 텍스트
- 오른쪽: 번역된 텍스트
- 각각 독립적인 스크롤

## 지원 언어

### 음성 인식 (Source Language)
- English (US)
- English (UK)
- 한국어
- 中文 (简体)

### 번역 (Target Language)
- 한국어 (기본값)
- 中文 (简体)
- English

## 사용 방법

### 기본 사용법

1. **언어 선택**
   - Source Language: 말할 언어 선택
   - Target Language: 번역할 언어 선택 (기본: 한국어)

2. **Start 버튼 클릭**
   - 마이크 권한 허용
   - "Listening..." 상태 확인

3. **말하기**
   - 명확하게 발음
   - 문장 단위로 말하고 1-2초 멈추기
   - 왼쪽에 원본, 오른쪽에 번역 표시

4. **Stop 버튼 클릭**
   - 녹음 중지

### 예시 시나리오

#### 시나리오 1: 영어 → 한국어
```
1. Source Language: English (US)
2. Target Language: 한국어
3. Start 클릭
4. 말하기: "Hello, how are you?"
5. 결과:
   - 왼쪽: "Hello, how are you?"
   - 오른쪽: "안녕하세요, 어떻게 지내세요?"
```

#### 시나리오 2: 한국어 → 중국어
```
1. Source Language: 한국어
2. Target Language: 中文 (简体)
3. Start 클릭
4. 말하기: "안녕하세요 만나서 반갑습니다"
5. 결과:
   - 왼쪽: "안녕하세요 만나서 반갑습니다."
   - 오른쪽: "你好，很高兴见到你。"
```

#### 시나리오 3: 중국어 → 영어
```
1. Source Language: 中文 (简体)
2. Target Language: English
3. Start 클릭
4. 말하기: "你好 我叫李明"
5. 결과:
   - 왼쪽: "你好 我叫李明."
   - 오른쪽: "Hello, my name is Li Ming."
```

## 기능 상세

### 자동 구두점
- 첫 글자 자동 대문자
- 질문 감지 → 물음표 추가
- 일반 문장 → 마침표 추가

### 스마트 스크롤
- 맨 아래에 있을 때: 자동 스크롤
- 위로 스크롤했을 때: 자동 스크롤 비활성화
- 다시 맨 아래로: 자동 스크롤 재활성화

### 번역 상태 표시
- 🔄 Translating...: 번역 중
- 번역 완료 시 자동으로 오른쪽 창에 표시

## 백엔드 API 요구사항

### 필수 조건
백엔드 서버가 실행 중이어야 합니다:

```bash
cd backend
python app.py
```

서버 주소: `http://localhost:8000`

### API 엔드포인트
```
POST /api/translate
Content-Type: application/json

{
  "text": "Hello",
  "source_lang": "en",
  "target_lang": "ko"
}
```

### 응답 형식
```json
{
  "translated_text": "안녕하세요",
  "source_lang": "en",
  "target_lang": "ko",
  "provider": "google_direct",
  "cached": false
}
```

## 성능 최적화

### 번역 캐싱
- 동일한 문장은 캐시에서 즉시 반환
- 캐시 TTL: 24시간
- 네트워크 요청 최소화

### 문장 단위 번역
- 문장이 완성될 때마다 번역
- Interim result는 번역하지 않음
- 효율적인 API 사용

## 문제 해결

### 문제 1: 번역이 안 됨
**원인**: 백엔드 서버가 실행되지 않음

**증상**:
- 페이지 상단에 "⚠️ Backend server is not running" 경고 표시
- 번역 창에 "[Backend server not running]" 메시지

**해결**:
```bash
cd backend
python app.py
```

**확인**:
- 페이지 상단에 "✅ Backend server is online and ready" 표시되면 정상

### 문제 2: "[Translation Error: ...]" 표시
**원인**: 
- 백엔드 서버 연결 실패
- 번역 API 오류

**해결**:
1. 백엔드 서버 상태 확인
2. 브라우저 콘솔에서 에러 확인
3. 네트워크 탭에서 API 요청 확인

### 문제 3: 번역이 느림
**원인**: 
- 네트워크 지연
- 외부 API 응답 지연

**해결**:
- 안정적인 인터넷 연결 사용
- 캐시 활용 (동일한 문장 재사용)

### 문제 4: 음성 인식이 안 됨
**원인**: Web Speech API 문제

**해결**:
- Chrome 또는 Edge 브라우저 사용
- 마이크 권한 확인
- `/speech-to-text-test` 페이지에서 디버깅

## 제한사항

### 언어 조합
- Source와 Target이 같으면 번역하지 않음
- 지원하지 않는 언어 조합은 에러 발생

### 번역 품질
- 짧은 문장: 높은 정확도
- 긴 문장: 문맥에 따라 다름
- 전문 용어: 정확도 낮을 수 있음

### 네트워크 의존성
- 음성 인식: 인터넷 필요 (Web Speech API)
- 번역: 인터넷 필요 (백엔드 API)
- 오프라인 사용 불가

## 향후 개선 계획

### 1단계: UI 개선
- 번역 진행률 표시
- 에러 메시지 개선
- 언어 자동 감지

### 2단계: 기능 추가
- 번역 히스토리 저장
- 즐겨찾기 언어 조합
- 음성 출력 (TTS)

### 3단계: 성능 개선
- 배치 번역 (여러 문장 한 번에)
- 로컬 캐시 확대
- WebSocket 실시간 번역

## 비교

| 기능 | 일반 STT | STT + 번역 |
|------|---------|-----------|
| 음성 인식 | ✅ | ✅ |
| 자동 구두점 | ✅ | ✅ |
| 번역 | ❌ | ✅ |
| 2개 창 | ❌ | ✅ |
| 백엔드 필요 | ❌ | ✅ |

## 사용 팁

### 최고의 결과를 위해
1. **명확한 발음**: 또박또박 말하기
2. **문장 단위**: 문장 끝에 1-2초 멈추기
3. **조용한 환경**: 배경 소음 최소화
4. **안정적인 인터넷**: 빠른 번역을 위해

### 효율적인 사용
1. **자주 사용하는 언어 조합**: 캐시 활용
2. **짧은 문장**: 빠른 번역
3. **명확한 문맥**: 정확한 번역

## 참고 자료

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Translation API Documentation](../backend/README.md)
- [Speech-to-Text Troubleshooting](./SPEECH_TO_TEXT_TROUBLESHOOTING.md)
