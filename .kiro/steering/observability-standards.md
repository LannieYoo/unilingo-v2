---
inclusion: always
---

# 관찰성(Observability) 표준

## 목적

모든 새로운 API 엔드포인트와 기능은 시스템 관찰성을 위한 표준 패턴을 따라야 합니다.

## 필수 요구사항

### 1. Trace ID 사용

**모든 API 엔드포인트는 trace_id를 포함해야 합니다.**

#### 백엔드 (Flask)

```python
from flask import g

# 모든 라우터에서 trace_id 사용
trace_id = g.get('trace_id', 'unknown')

# 응답에 trace_id 포함
response = {
    'data': result,
    'trace_id': trace_id
}

# 로그에 trace_id 포함
logger.info(f"Operation completed", extra={'trace_id': trace_id})
logger.error(f"Operation failed: {error}", extra={'trace_id': trace_id})
```

#### 프론트엔드

```javascript
// 에러 처리 시 trace_id 표시
if (error.response?.data?.trace_id) {
  console.error(`Error (Trace ID: ${error.response.data.trace_id}):`, error);
}
```

### 2. 헬스 체크 통합

**새로운 외부 의존성이 추가되면 헬스 체크에 포함해야 합니다.**

#### 헬스 체크 추가 위치

`backend/src/common/modules/health/service.py`

#### 새로운 체크 함수 추가 패턴

```python
def check_new_service() -> CheckResult:
    """새 서비스 상태 확인"""
    start_time = time.time()
    try:
        # 서비스 체크 로직 (경량 요청 사용)
        # 예: HEAD 요청, PING, SELECT 1 등
        
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=True, latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))
```

#### perform_health_check 함수에 추가

```python
def perform_health_check() -> HealthCheckResponse:
    """모든 헬스 체크 실행 및 결과 집계"""
    checks = {
        'db': safe_check(check_database, 'database'),
        'translation_api': safe_check(check_translation_api, 'translation_api'),
        'dictionary_api': safe_check(check_dictionary_api, 'dictionary_api'),
        'cache': safe_check(check_cache, 'cache'),
        'new_service': safe_check(check_new_service, 'new_service'),  # 새 서비스 추가
    }
    # ... 나머지 로직
```

### 3. 에러 로깅 표준

**모든 에러는 trace_id와 함께 로깅되어야 합니다.**

```python
# 성공 로그
logger.info(f"API call successful", extra={'trace_id': trace_id})

# 경고 로그
logger.warning(f"Service degraded: {message}", extra={'trace_id': trace_id})

# 에러 로그
logger.error(f"Operation failed: {error}", extra={'trace_id': trace_id})
```

### 4. Admin 페이지 통합

**새로운 관리 기능은 Admin 페이지에 탭으로 추가해야 합니다.**

위치: `frontend/src/modules/admin/_02_views/AdminView.jsx`

```javascript
// 탭 추가
<button
  onClick={() => setActiveTab('new-feature')}
  className={...}>
  새 기능
</button>

// 탭 컨텐츠 추가
{activeTab === 'new-feature' && (
  <NewFeaturePanel />
)}
```

## 체크리스트

새로운 API 엔드포인트나 기능을 추가할 때:

- [ ] trace_id를 응답에 포함했는가?
- [ ] 모든 로그에 trace_id를 포함했는가?
- [ ] 외부 의존성이 있다면 헬스 체크에 추가했는가?
- [ ] 에러 처리에서 trace_id를 표시하는가?
- [ ] Admin 페이지에 관리 기능이 필요하다면 추가했는가?

## 예외 사항

다음의 경우 일부 요구사항을 생략할 수 있습니다:

- 정적 파일 제공 엔드포인트
- 헬스 체크 엔드포인트 자체
- 공개 API (인증 불필요)

단, 생략 사유를 코드 주석으로 명시해야 합니다.

## 참고

- 헬스 체크 구현: `backend/src/common/modules/health/`
- Trace ID 미들웨어: `backend/src/common/trace_middleware.py`
- Admin 페이지: `frontend/src/modules/admin/`
- 에러 추적: `.kiro/specs/error-tracking/`
