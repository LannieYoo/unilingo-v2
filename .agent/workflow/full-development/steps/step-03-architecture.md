# Step 3: 시스템 아키텍처 설계

## 단계 정보
- **단계**: 3/10 - 시스템 아키텍처
- **스킬**: `dev-senior_architect`
- **입력**: `docs/prd.md`
- **산출물**: `docs/architecture.md`

---

## 실행 단계

### 1. 컨텍스트 로드

다음 파일을 읽고 분석합니다:
- `docs/requirements.md` - 요구사항 배경
- `docs/prd.md` - 제품 요구사항 정의서

### 2. 스킬 로드

`dev-senior_architect` 스킬을 로드하여 아키텍처 설계 전문 지식을 활용합니다.

### 3. 기술 선정 (Technology Selection)

요구사항에 따라 기술 스택을 결정합니다:

**백엔드**:
- [ ] 프로그래밍 언어 (Python/Node.js/Go/Java...)
- [ ] 웹 프레임워크 (FastAPI/Express/Gin/Spring...)
- [ ] ORM (SQLAlchemy/Prisma/GORM...)

**프론트엔드**:
- [ ] 프레임워크 (React/Vue/Angular/Svelte...)
- [ ] 상태 관리 (Redux/Vuex/Zustand...)
- [ ] UI 라이브러리 (Ant Design/MUI/Tailwind...)

**데이터베이스**:
- [ ] 메인 데이터베이스 (PostgreSQL/MySQL/MongoDB...)
- [ ] 캐시 (Redis/Memcached...)
- [ ] 검색 (Elasticsearch/Meilisearch...)

**인프라**:
- [ ] 배포 플랫폼 (Docker/K8s/Serverless...)
- [ ] CI/CD (GitHub Actions/GitLab CI...)
- [ ] 모니터링 (Prometheus/Grafana...)

### 4. 시스템 설계

#### 4.1 전체 아키텍처
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API GW    │────▶│   Services  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┤
                    ▼                          ▼
               ┌──────────┐              ┌──────────┐
               │ Database │              │  Cache   │
               └──────────┘              └──────────┘
```

#### 4.2 디렉토리 구조
```
project/
├── docs/               # 문서
├── src/
│   ├── backend/        # 백엔드 코드
│   │   ├── models/     # 데이터 모델
│   │   ├── routers/    # API 라우트
│   │   ├── services/   # 비즈니스 로직
│   │   ├── schemas/    # 데이터 검증
│   │   └── utils/      # 유틸리티 함수
│   └── frontend/       # 프론트엔드 코드
│       ├── components/ # 컴포넌트
│       ├── pages/      # 페이지
│       ├── hooks/      # Hooks
│       └── utils/      # 유틸리티 함수
├── tests/              # 테스트
├── scripts/            # 스크립트
└── deploy/             # 배포 설정
```

#### 4.3 API 설계

RESTful API 또는 GraphQL 스키마를 정의합니다:

```yaml
# API 예시
/api/v1:
  /users:
    GET: 사용자 리스트 조회
    POST: 사용자 생성
    /{id}:
      GET: 사용자 상세 조회
      PUT: 사용자 업데이트
      DELETE: 사용자 삭제
```

### 5. 문서 생성

`docs/architecture.md`를 생성합니다:

```markdown
# {프로젝트 이름} - 시스템 아키텍처 정의서

## 1. 아키텍처 개요
### 1.1 설계 원칙
### 1.2 아키텍처 다이어그램

## 2. 기술 선정
### 2.1 백엔드 기술 스택
### 2.2 프론트엔드 기술 스택
### 2.3 데이터베이스
### 2.4 인프라

## 3. 시스템 컴포넌트
### 3.1 컴포넌트 리스트
### 3.2 컴포넌트 상호작용

## 4. 데이터 아키텍처
### 4.1 데이터 모델 개요
### 4.2 데이터 흐름

## 5. API 설계
### 5.1 API 규격
### 5.2 API 리스트

## 6. 보안 아키텍처
### 6.1 인증 (Authentication)
### 6.2 인가 (Authorization)
### 6.3 데이터 보안

## 7. 배포 아키텍처
### 7.1 환경
### 7.2 배포 프로세스

## 8. 확장성 고려 사항
```

### 6. 아키텍처 검토

아키텍처 문서를 사용자에게 보여주고 확인을 요청합니다:

```
[C] 확인 - 아키텍처가 합리적임, 다음 단계로 진행
[E] 편집 - 아키텍처 수정
[D] 토론 - 특정 결정에 대해 추가 논의 필요
```

---

## 완료 확인

- [ ] `docs/architecture.md` 생성됨
- [ ] 모든 기술 선정이 완료됨
- [ ] API 설계가 완료됨
- [ ] 사용자가 최종 확인함

## 상태 업데이트

```yaml
phases:
  architecture:
    status: completed
    completed_at: {current_time}
```

## 다음 단계

→ `step-04-stories.md`로 진입
