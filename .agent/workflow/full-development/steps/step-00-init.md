# Step 0: 워크플로우 초기화

## 목표
개발 워크플로우 상태를 초기화하거나 복구합니다.

## 실행 단계

### 1. 상태 파일 확인

프로젝트 루트 디렉토리에 `.dev-state.yaml`이 존재하는지 확인합니다:

```
if exists(.dev-state.yaml):
    상태 파일 로드
    현재 진행 상황 표시
    문의: 현재 단계 계속 / 건너뛰기 / 재설정
else:
    새 상태 파일 생성 (state-template.yaml에서 복사)
    프로젝트 이름 문의
    Phase 1부터 시작
```

### 2. 진행 상황 표시

```
┌─────────────────────────────────────────────────┐
│           Full Development Workflow             │
├─────────────────────────────────────────────────┤
│ 프로젝트: {project_name}                         │
│ 시작 시간: {started_at}                          │
│ 현재 단계: {current_phase}/10                    │
├─────────────────────────────────────────────────┤
│ [✓] 1. 요구사항 분석      - 완료                 │
│ [✓] 2. 제품 요구사항 정의서 - 완료                 │
│ [→] 3. 시스템 아키텍처      - 진행 중               │
│ [ ] 4. 작업 분해          - 대기 중               │
│ [ ] 5. 데이터베이스 설계    - 대기 중               │
│ [ ] 6. 백엔드 개발        - 대기 중               │
│ [ ] 7. 프론트엔드 개발      - 대기 중               │
│ [ ] 8. 테스트            - 대기 중               │
│ [ ] 9. 코드 리뷰          - 대기 중               │
│ [ ] 10. 배포             - 대기 중               │
└─────────────────────────────────────────────────┘
```

### 3. 자동 건너뛰기 확인

각 단계에 대해 건너뛰기 여부를 확인합니다:

```python
def should_skip(phase):
    # 1. 이미 완료로 표시됨
    if phase.status == 'completed':
        return True

    # 2. 산출물 확인
    for check in phase.checks:
        if check.type == 'file_exists':
            if exists(check.path) and not empty(check.path):
                return True
        if check.type == 'script':
            if run_script(check.path) == 0:
                return True

    return False
```

### 4. 다음 단계 결정

```python
def get_next_phase():
    for phase in phases:
        if phase.status == 'pending':
            # 의존성 확인
            deps_met = all(
                phases[dep].status == 'completed'
                for dep in phase.depends_on
            )
            if deps_met and not should_skip(phase):
                return phase
    return None
```

### 5. 사용자 옵션

메뉴를 표시합니다:

```
[C] 계속 - 다음 단계 실행
[S] 건너뛰기 - 현재 단계 건너뛰기
[G] 이동 - 지정된 단계로 이동
[R] 재설정 - 처음부터 다시 시작
[Q] 종료 - 저장 후 종료
```

---

## 완료 조건

- 상태 파일 로드 또는 생성 완료
- 사용자 작업 선택 완료
- 다음 실행 단계 확정

## 다음 단계

사용자 선택에 따라:
- [C] → 해당 단계의 step 파일 로드
- [S] → 건너뛰기로 표시하고 이 단계로 돌아감
- [G] → current_phase 업데이트하고 이 단계로 돌아감
- [R] → 상태 파일 삭제 후 재초기화
- [Q] → 상태 저장 후 워크플로우 종료
