# 코딩 규칙

## 필수 사항

### 프론트엔드 import

- `common/` → 의존성 없음, 모든 레이어에서 import 가능
- `libs/` → `common/`만 import
- `modules/*/types/` → `common/`만 import
- `modules/*/services/` → `common/`, `libs/`, 같은 모듈의 `types/` import
- `modules/*/hooks/` → `common/`, 같은 모듈의 `services/`, `types/` import
- `modules/*/components/` → `common/`, `libs/`, 같은 모듈의 `types/` import (hooks/services import 금지)
- `modules/*/views/` → 같은 모듈의 `hooks/`, `components/` + `common/` + `libs/` import

### export

- `common/enum.ts` → 모든 열거형과 상수 매핑
- `common/helper.ts` → 모든 유틸리티 함수
- `common/types.ts` → 모든 타입 정의 (모듈별 분류)
- `common/stores.ts` → 모든 전역 상태 (모듈별 분류)
- `common/components/` → 공통 UI 컴포넌트 (비즈니스 로직 없음)
- `modules/*/components/` → 비즈니스 컴포넌트 (같은 모듈의 hooks 사용 가능)

### 코드

- 데이터는 API에서 가져오기
- 에러는 예외를 던지고, UI 레이어에서 처리
- TypeScript 엄격한 타입 사용
- 함수/변수는 camelCase, 컴포넌트는 PascalCase 사용
- 파일명은 기본 export와 일치
- 비동기 함수는 async/await 사용
- 조건부 렌더링은 early return 사용
- 복잡한 로직은 커스텀 hook으로 추출
- 백엔드 페이지네이션은 `paginate()` 함수 사용
- 프론트엔드 API 응답은 `keysToCamel()`로 snake_case → camelCase 변환
- 공통 UI 컴포넌트는 `common/components/`, 비즈니스 컴포넌트는 `modules/*/components/`에 배치
- `libs/shadcn/ui/` 기본 컴포넌트 우선 사용

### 주석

- 단일 라인 주석만 허용
- why를 설명하고, what은 설명하지 않음
- 파일 상단: 모듈 용도 설명
- TODO/FIXME: 처리 대기 사항 표시

### services 레이어

- API 호출과 데이터 변환만 담당
- `common/types`에서 타입 import

### hooks 레이어

- 상태 관리와 비즈니스 로직만 담당
- `common/types`에서 타입 import
- 반환 타입은 TypeScript가 자동 추론
- Options 파라미터는 인라인 타입 또는 `common/types.ts`에 배치
- 폼 기본값 생성 메서드 제공 (예: `getModelForm`)

### components 레이어

- UI 렌더링과 스타일 담당
- `common/types`에서 타입 import
- `className` 스타일 작성 가능
- Props를 통해서만 데이터 수신 (순수 표시 컴포넌트)
- i18n 직접 사용 가능 (`@/common/i18n`에서 import)

### views 레이어

- 페이지 레이아웃과 컴포넌트 조합만 담당
- `common/types`에서 타입 import
- hook 메서드를 호출하여 폼 초기 데이터 생성, Props로 컴포넌트에 전달

### 백엔드 import

- `common/` → 의존성 없음, 모든 레이어에서 import 가능
- `modules/*/dto.py` → `pydantic`만 import
- `modules/*/service.py` → `common/` import
- `modules/*/router.py` → `common/`, 같은 모듈의 `dto`, `service` import

### 백엔드 export

- `common/enum.py` → 모든 열거형과 상수
- `common/helper.py` → 모든 유틸리티 함수
- `common/errors.py` → 모든 에러 타입
- `common/response.py` → 통일된 응답 형식
- `common/auth.py` → 인증 관련
- `common/supabase.py` → 데이터베이스 연결
- `common/document.py` → 문서 저장소

### 백엔드 코드

- FastAPI 프레임워크 사용
- Pydantic으로 데이터 검증
- 함수/변수는 snake_case 사용
- 클래스명은 PascalCase 사용
- 비동기 함수는 async/await 사용
- 페이지네이션은 `paginate()` 함수 사용
- 응답은 `success_response()`로 래핑
- 에러는 `AppError` 예외 발생

### router 레이어

- 라우트 정의와 파라미터 파싱만 담당
- service를 호출하여 비즈니스 로직 처리
- `success_response()`로 데이터 반환

### service 레이어

- 비즈니스 로직만 담당
- `common/`에서 유틸리티 import
- `AppError`를 발생시켜 에러 처리

### dto 레이어

- 요청/응답 데이터 구조 정의만 담당
- Pydantic BaseModel 사용

---

## 금지 사항

### 프론트엔드 import

- `common/components/`에서 `services/` 또는 `hooks/` import
- `modules/admin/`과 `modules/member/` 간 상호 import
- 모듈 간 `common/` 외 내용 import
- 순환 의존성

### export

- 모듈 내에서 열거형/상수 분산 export
- 모듈 내에서 유틸리티 함수 분산 export
- `index.ts` 파일 사용 (구체적인 파일을 직접 import)

### 코드

- 하드코딩된 fallback 데이터
- 컴포넌트 내 상수 정의 (`enum.ts`에 배치해야 함)
- 모듈 내 유틸리티 함수 정의 (`helper.ts`에 배치해야 함)
- 모듈 내 `interface` 정의 (`common/types.ts`에 배치해야 함)
- TypeScript `enum` 키워드 사용 (`const` + `type` 패턴 사용)
- `any` 타입 사용
- 매직 문자열/숫자
- service 레이어에서 예외를 catch한 후 무시
- console.log 디버그 코드 커밋
- 주석 처리된 코드 커밋
- 3줄 이상 중복 코드
- 50줄 이상 함수
- 300줄 이상 파일
- 3단계 이상 중첩
- props 또는 state 직접 수정
- 컴포넌트 내에서 fetch/axios 직접 호출 (hooks/service를 통해야 함)
- 한영 혼합 네이밍

### 주석

- 여러 줄 주석 블록
- 함수 내부 주석
- what을 설명하는 주석 (코드 자체가 자명해야 함)
- 오래된 주석
- 주석 처리된 코드

### services 레이어

- `interface` 정의
- `const` 상수 정의
- 유틸리티 함수 정의
- `hooks/` 또는 `components/` import

### hooks 레이어

- `interface` 정의
- `const` 상수 정의
- 유틸리티 함수 정의
- `components/` 또는 `views/` import

### components 레이어

- `interface` 정의 (Props 타입 제외)
- `const` 상수 정의
- 유틸리티 함수 정의 (`common/helper.ts`에 배치해야 함)
- 기본값 생성 (View에서 Props로 전달해야 함)
- `views/` import
- `hooks/` import (데이터는 Props로 전달해야 함)
- `services/` import

### views 레이어

- `interface` 정의 (Props 타입 제외)
- `const` 상수 정의
- 유틸리티 함수 정의
- `className` 스타일 코드
- `services/` 직접 호출 (hooks를 통해야 함)

### 백엔드 import

- `modules/admin/`과 `modules/member/` 간 상호 import
- 모듈 간 `common/` 외 내용 import
- 순환 의존성

### 백엔드 코드

- 하드코딩된 설정값 (`common/config.py`에 배치해야 함)
- service 레이어에서 예외를 catch한 후 무시
- print 디버그 코드 커밋
- 주석 처리된 코드 커밋
- 50줄 이상 함수
- 500줄 이상 파일
- 3단계 이상 중첩
- 데이터베이스 원시 데이터 직접 반환 (형식 변환해야 함)
- router 레이어에서 비즈니스 로직 작성

### router 레이어

- 비즈니스 로직 코드
- 데이터베이스 직접 조작
- 복잡한 데이터 처리

### service 레이어

- HTTP 응답 직접 반환
- `router` import

### dto 레이어

- 비즈니스 로직 코드
- `service` 또는 `router` import
