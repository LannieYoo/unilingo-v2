---
name: full-development
description: 전체 소프트웨어 개발 프로세스 - 요구사항부터 배포까지의 원스톱 워크플로우
version: 1.0.0
trigger: /full-dev
state_file: '{project-root}/.dev-state.yaml'
---

# 전체 개발 워크플로우 (Full Development Workflow)

명령어 하나로 요구사항 분석부터 코드 리뷰까지의 전체 개발 프로세스를 완료합니다. 이미 완료된 단계는 자동으로 건너뜁니다.

## 사용 방법

```bash
/full-dev                    # 전체 프로세스 시작/계속
/full-dev reset              # 상태 초기화 및 처음부터 시작
/full-dev status             # 현재 진행 상황 확인
/full-dev skip               # 현재 단계 건너뛰기
/full-dev goto <phase>       # 지정된 단계로 이동
```

## 워크플로우 단계

| 단계 | 명칭 | 산출물 | 체크포인트 |
|------|------|--------|--------|
| 1 | 요구사항 분석 (requirements) | `docs/requirements.md` | ✓ 파일 존재 및 내용 확인 |
| 2 | 제품 요구사항 정의서 (prd) | `docs/prd.md` | ✓ 파일 존재 및 내용 확인 |
| 3 | 시스템 아키텍처 (architecture) | `docs/architecture.md` | ✓ 파일 존재 및 내용 확인 |
| 4 | 작업 분해 (stories) | `docs/stories.md` | ✓ 파일 존재 및 내용 확인 |
| 5 | 데이터베이스 설계 (database) | `docs/database.md` + 마이그레이션 | ✓ 파일 존재 확인 |
| 6 | 백엔드 개발 (backend) | `src/` 백엔드 코드 | ✓ 코드 검사 통과 |
| 7 | 프론트엔드 개발 (frontend) | `src/` 프론트엔드 코드 | ✓ 코드 검사 통과 |
| 8 | 테스트 (testing) | `tests/` | ✓ 테스트 통과 |
| 9 | 코드 리뷰 (review) | 리뷰 보고서 | ✓ 리뷰 통과 |
| 10 | 배포 (deployment) | 배포 설정 | ✓ 배포 성공 |

---

## 초기화

### 1. 상태 로드

먼저 상태 파일 `.dev-state.yaml`을 확인합니다:

```yaml
# .dev-state.yaml 예시
project: my-project
started_at: 2025-01-28T10:00:00
current_phase: 3
phases:
  requirements:
    status: completed
    completed_at: 2025-01-28T10:30:00
    output: docs/requirements.md
  prd:
    status: completed
    completed_at: 2025-01-28T11:00:00
    output: docs/prd.md
  architecture:
    status: in_progress
    started_at: 2025-01-28T11:30:00
  stories:
    status: pending
  database:
    status: pending
  backend:
    status: pending
  frontend:
    status: pending
  testing:
    status: pending
  review:
    status: pending
  deployment:
    status: pending
```

### 2. 건너뛰기 로직 확인

각 단계에 대해 다음을 확인합니다:
1. 상태 파일에 `completed`로 표시되어 있는가? → 건너뛰기
2. 산출물 파일이 존재하고 유효한가? → 완료로 마킹 후 건너뛰기
3. 그렇지 않은 경우 → 해당 단계 실행

---

## 단계 실행

### Phase 1: 요구사항 분석 (requirements)

**트리거 조건**: `docs/requirements.md`가 존재하지 않거나 비어 있음

**실행 단계**:
1. 스킬 로드: `dev-product_manager`
2. 워크플로우 실행: `1-analysis/create-product-brief`
3. 사용자와 대화하여 요구사항 수집
4. `docs/requirements.md` 생성

**완료 확인**:
- [ ] `docs/requirements.md` 존재
- [ ] 파일 내용 포함: 프로젝트 배경, 대상 사용자, 핵심 기능, 비기능 요구사항

**완료 후**: 상태 업데이트 후 Phase 2로 진입

---

### Phase 2: 제품 요구사항 정의서 (prd)

**트리거 조건**: `docs/prd.md`가 존재하지 않거나 비어 있음

**선행 조건**: Phase 1 완료

**실행 단계**:
1. 스킬 로드: `dev-product_manager`
2. `docs/requirements.md` 읽기
3. 워크플로우 실행: `2-plan-workflows/create-prd`
4. `docs/prd.md` 생성

**완료 확인**:
- [ ] `docs/prd.md` 존재
- [ ] 파일 내용 포함: 사용자 스토리, 수락 기준, 우선순위

**완료 후**: 상태 업데이트 후 Phase 3로 진입

---

### Phase 3: 시스템 아키텍처 (architecture)

**트리거 조건**: `docs/architecture.md`가 존재하지 않거나 비어 있음

**선행 조건**: Phase 2 완료

**실행 단계**:
1. 스킬 로드: `dev-senior_architect`
2. `docs/prd.md` 읽기
3. 워크플로우 실행: `3-solutioning/create-architecture`
4. `docs/architecture.md` 생성

**완료 확인**:
- [ ] `docs/architecture.md` 존재
- [ ] 파일 내용 포함: 기술 스택, 시스템 컴포넌트, 데이터 흐름, API 설계

**완료 후**: 상태 업데이트 후 Phase 4로 진입

---

### Phase 4: 작업 분해 (stories)

**트리거 조건**: `docs/stories.md`가 존재하지 않거나 비어 있음

**선행 조건**: Phase 3 완료

**실행 단계**:
1. 스킬 로드: `dev-product_manager`
2. `docs/architecture.md` 읽기
3. 워크플로우 실행: `3-solutioning/create-epics-and-stories`
4. `docs/stories.md` 생성

**완료 확인**:
- [ ] `docs/stories.md` 존재
- [ ] 파일 내용 포함: Epic 리스트, Story 리스트, 작업 의존성 관계

**완료 후**: 상태 업데이트 후 Phase 5로 진입

---

### Phase 5: 데이터베이스 설계 (database)

**트리거 조건**: `docs/database.md`가 존재하지 않거나 비어 있음

**선행 조건**: Phase 4 완료

**실행 단계**:
1. 스킬 로드: `dev-senior_data_engineer`
2. `docs/architecture.md` 읽기
3. 데이터베이스 스키마 설계
4. `docs/database.md` 생성
5. 마이그레이션 파일 생성

**완료 확인**:
- [ ] `docs/database.md` 존재
- [ ] 파일 내용 포함: ER 다이어그램, 테이블 구조, 인덱스 설계
- [ ] 확인 스크립트 실행 (있는 경우)

**완료 후**: 상태 업데이트 후 Phase 6로 진입

---

### Phase 6: 백엔드 개발 (backend)

**트리거 조건**: 백엔드 코드 미완성

**선행 조건**: Phase 5 완료

**실행 단계**:
1. 스킬 로드: `dev-senior_backend`
2. `docs/stories.md`를 읽어 개발할 Story 확보
3. 워크플로우 실행: `4-implementation/dev-story`
4. Model, Router, Service, Schema 개발
5. 각 모듈 완료 시 확인 스크립트 실행

**완료 확인**:
- [ ] 모든 백엔드 Story 완료
- [ ] 확인 스크립트 통과

**완료 후**: 상태 업데이트 후 Phase 7로 진입

---

### Phase 7: 프론트엔드 개발 (frontend)

**트리거 조건**: 프론트엔드 코드 미완성

**선행 조건**: Phase 6 완료 (또는 병렬 진행 가능)

**실행 단계**:
1. 스킬 로드: `dev-senior_frontend`
2. `docs/stories.md`를 읽어 개발할 Story 확보
3. 워크플로우 실행: `4-implementation/dev-story`
4. 컴포넌트, 페이지, 상태 관리 개발
5. 각 모듈 완료 시 확인 스크립트 실행

**완료 확인**:
- [ ] 모든 프론트엔드 Story 완료
- [ ] 확인 스크립트 통과

**완료 후**: 상태 업데이트 후 Phase 8로 진입

---

### Phase 8: 테스트 (testing)

**트리거 조건**: 테스트 미완료

**선행 조건**: Phase 6, 7 완료

**실행 단계**:
1. 스킬 로드: `dev-senior_qa`
2. `docs/prd.md`의 수락 기준 확인
3. 워크플로우 실행: `testarch/automate`
4. 테스트 작성 및 실행

**완료 확인**:
- [ ] 테스트 커버리지 달성
- [ ] 모든 테스트 통과

**완료 후**: 상태 업데이트 후 Phase 9로 진입

---

### Phase 9: 코드 리뷰 (review)

**트리거 조건**: 리뷰 미완료

**선행 조건**: Phase 8 완료

**실행 단계**:
1. 스킬 로드: `dev-code_reviewer`
2. 워크플로우 실행: `4-implementation/code-review`
3. 리뷰 보고서 생성
4. 발견된 문제 해결

**완료 확인**:
- [ ] 리뷰 보고서 작성 완료
- [ ] 모든 심각한 문제 해결됨

**완료 후**: 상태 업데이트 후 Phase 10로 진입

---

### Phase 10: 배포 (deployment)

**트리거 조건**: 배포 미완료

**선행 조건**: Phase 9 완료

**실행 단계**:
1. 스킬 로드: `dev-senior_devops`
2. 배포 환경 설정
3. 배포 실행

**완료 확인**:
- [ ] 배포 성공
- [ ] 헬스 체크 통과

**완료 후**: 상태를 전체 완료로 업데이트

---

## 상태 관리 명령어

### 상태 확인
```
/full-dev status
```
현재 진행 상황, 완료된 단계, 대기 중인 단계를 표시합니다.

### 프로세스 재설정
```
/full-dev reset
```
상태 파일을 삭제하고 처음부터 다시 시작합니다.

### 단계 건너뛰기
```
/full-dev skip
```
현재 단계를 건너뜁니다 (확인 필요).

### 단계 이동
```
/full-dev goto architecture
```
지정된 단계로 이동합니다.

---

## 설정 옵션

`.dev-state.yaml`에서 설정 가능합니다:

```yaml
config:
  # 병렬 개발
  parallel_frontend_backend: true

  # 자동 확인
  auto_check: true

  # 확인 스크립트 경로
  check_scripts:
    database: scripts/check-database.py
    backend: scripts/check-backend.py
    frontend: scripts/check-frontend.py

  # 산출물 디렉토리
  docs_dir: docs
  src_dir: src
  tests_dir: tests
```

---

## 바로가기 (Shortcuts)

| 명령어 | 동일 기능 |
|------|--------|
| `/full-dev` | 전체 프로세스 시작/계속 |
| `/quick-dev` | 빠른 개발 (문서 단계 건너뛰기) |
| `/spec-only` | Phase 1-4만 실행 (기획 단계) |
| `/impl-only` | Phase 5-9만 실행 (상세 구현 단계) |
