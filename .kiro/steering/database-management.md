# 데이터베이스 관리 규칙

## 스키마 문서 유지

### 필수

- 기능 변경 시 `doc/supabase-schema.sql` 파일을 **반드시** 최신 상태로 업데이트
- 기능 변경 시 `doc/database-schema.md` 파일을 **반드시** 최신 상태로 업데이트
- 테이블 추가/수정/삭제 시 두 파일 모두 동기화
- 컬럼 추가/수정/삭제 시 두 파일 모두 동기화
- 인덱스 추가/수정/삭제 시 두 파일 모두 동기화
- 제약조건 추가/수정/삭제 시 두 파일 모두 동기화
- 스키마 변경 사유를 커밋 메시지에 명시

### 스키마 변경 프로세스

1. 기능 요구사항 확인
2. `doc/supabase-schema.sql` 수정 (SQL 정의)
3. `doc/database-schema.md` 수정 (문서화)
4. Supabase SQL Editor에서 변경사항 실행
5. 백엔드 코드 업데이트 (필요시)
6. 프론트엔드 코드 업데이트 (필요시)
7. 테스트 실행
8. 커밋 및 배포

## 로그 기록

### 필수 로그 테이블

시스템의 모든 주요 기능은 로그 테이블을 가져야 함:

- `login_logs` - 사용자 로그인 기록
- `stt_logs` - 음성-텍스트 변환 기록
- `translation_logs` - 번역 기록
- `dictionary_logs` - 사전 검색 기록

### 로그 테이블 구조

모든 로그 테이블은 다음 컬럼을 포함해야 함:

- `id` (UUID, PRIMARY KEY) - 고유 식별자
- `user_id` (UUID, FOREIGN KEY) - 사용자 식별자
- `created_at` (TIMESTAMP) - 생성 시간
- 기능별 추가 컬럼 (요청/응답 데이터, 상태 등)

### 로그 기록 시점

- API 요청 시작 시 로그 생성
- API 응답 완료 시 로그 업데이트
- 에러 발생 시 에러 정보 기록
- 사용자 행동 추적이 필요한 모든 지점

### 로그 활용

- 버그 재현 및 디버깅
- 사용자 행동 분석
- 시스템 성능 모니터링
- 보안 감사
- 사용량 통계

## 데이터베이스 접근

### Supabase 사용

- 모든 데이터베이스 접근은 `backend/src/common/supabase.py`를 통해 수행
- Supabase Client (REST API) 또는 SQLAlchemy (직접 연결) 사용
- 환경변수로 연결 정보 관리 (`.env` 파일)

### 필수 환경변수

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URI=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### 보안

- `.env` 파일은 **절대** Git에 커밋하지 않음
- `.env.example` 파일로 필요한 환경변수 목록 제공
- Service Role Key는 백엔드에서만 사용
- Anon Key는 프론트엔드에서 사용 가능

## 마이그레이션

### 스키마 변경 시

1. 기존 데이터 백업 (필요시)
2. `doc/supabase-schema.sql`에 변경사항 반영
3. Supabase SQL Editor에서 ALTER 문 실행
4. 변경사항 테스트
5. 문서 업데이트

### 데이터 마이그레이션

- 데이터 구조 변경 시 마이그레이션 스크립트 작성
- 마이그레이션 스크립트는 `doc/migrations/` 디렉토리에 저장
- 파일명 형식: `YYYY-MM-DD_description.sql`
- 롤백 스크립트도 함께 작성

## 금지

- 스키마 변경 후 문서 미업데이트
- 로그 테이블 없이 주요 기능 구현
- `.env` 파일 Git 커밋
- 프로덕션 데이터베이스에서 직접 테스트
- 하드코딩된 데이터베이스 연결 정보
- 로그 없이 에러 처리
- 개인정보를 평문으로 저장
- 인덱스 없이 대용량 테이블 쿼리
- 트랜잭션 없이 다중 테이블 수정
