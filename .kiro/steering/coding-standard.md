# 코딩 규범 (Coding Standard)

## 개요

본 규범은 프로젝트 코딩의 핵심 원칙과 금지 사항을 정의합니다.

---

## 일. 금지 사항

### 1. 하위 호환성 코드 금지

```python
# ❌ 금지: 하위 호환성을 위한 별칭 생성
AppException = AbstractCustomException  # 이렇게 하지 마세요

# ❌ 금지: 기존 함수명 유지
create_unified_client = create_unified_supabase_client  # 이렇게 하지 마세요

# ✅ 올바름: 새로운 이름을 직접 사용하고 모든 호출부 수정
from .exception import ICustomException
```

### 2. Fallback 로직 금지

```python
# ❌ 금지: fallback 기본값 사용
def get_config(key: str) -> str:
    return config.get(key) or DEFAULT_VALUE  # 이렇게 하지 마세요

# ❌ 금지: try-except를 fallback으로 사용
try:
    result = new_api()
except:
    result = old_api()  # 이렇게 하지 마세요

# ✅ 올바름: 필수값을 명확히 요구
def get_config(key: str) -> str:
    if key not in config:
        raise ConfigError(f"Missing required config: {key}")
    return config[key]
```

### 3. Optional 매개변수 기본값 금지

```python
# ❌ 금지: Optional 매개변수에 기본 None
def create_user(
    name: str,
    email: Optional[str] = None,  # 이렇게 하지 마세요
    role: Optional[str] = None,   # 이렇게 하지 마세요
):
    ...

# ❌ 금지: or를 사용한 기본값 제공
self.config = config or DatabaseConfig()  # 이렇게 하지 마세요

# ✅ 올바름: 모든 필수 매개변수를 명확히 요구
def create_user(
    name: str,
    email: str,
    role: str,
):
    ...

# ✅ 올바름: 명시적인 필수 매개변수 사용
def __init__(self, config: DatabaseConfig):
    self.config = config
```

---

## 이. 타입 어노테이션 규범

### 명확한 타입 사용 필수

```python
# ❌ 금지
def process(data):  # 타입 어노테이션 누락
    ...

def get_user(id) -> dict:  # 반환 타입이 너무 광범위
    ...

# ✅ 올바름
def process(data: UserData) -> ProcessResult:
    ...

def get_user(id: int) -> User:
    ...
```

### Any 타입 금지

```python
# ❌ 금지
def handle(data: Any) -> Any:
    ...

# ✅ 올바름: 구체적인 타입이나 제네릭 사용
from typing import TypeVar

T = TypeVar('T')

def handle(data: T) -> T:
    ...
```

---

## 삼. 예외 처리 규범

### 인터페이스 타입 사용

```python
# ❌ 금지: 구체적인 구현 클래스 사용
from .exception import AbstractCustomException
except AbstractCustomException as exc:
    ...

# ✅ 올바름: 인터페이스 타입 사용
from .exception import ICustomException
except ICustomException as exc:
    ...
```

### 맨 except 금지

```python
# ❌ 금지
try:
    ...
except:
    pass

try:
    ...
except Exception:
    pass

# ✅ 올바름: 구체적인 예외 포착
try:
    ...
except ValidationError as exc:
    handle_validation_error(exc)
except DatabaseError as exc:
    handle_database_error(exc)
```

---

## 사. 임포트 규범

### 모듈 루트에서 인터페이스 임포트

```python
# ❌ 금지: 내부 경로에서 임포트
from .exception._01_contracts.i_exception import ICustomException

# ✅ 올바름: 모듈 루트에서 임포트
from .exception import ICustomException
```

### 임포트 순서

```python
# 1. 표준 라이브러리
import os
import sys
from typing import Dict, List

# 2. 서드파티 라이브러리
from fastapi import APIRouter
from pydantic import BaseModel

# 3. 로컬 모듈
from .service import UserService
from ..common.modules.exception import ICustomException
```

---

## 오. 명명 규범

### 인터페이스 명명

| 타입 | 접두사 | 예시 |
|------|------|------|
| 인터페이스 | `I` | `IUserService`, `ICustomException` |
| 데이터 계약 | `D` | `DUserContext`, `DExceptionRecord` |
| 열거형 | `E` | `EUserRole`, `EExceptionType` |
| 상수 클래스 | `C` | `CFieldFormat`, `CMessageTemplate` |
| 추상 클래스 | `Abstract` | `AbstractClassifier` |

### 별칭 금지

```python
# ❌ 금지: 타입 별칭 생성
UserDict = Dict[str, Any]
AppException = AbstractCustomException

# ✅ 올바름: 원본 타입 직접 사용
def get_user() -> Dict[str, str]:
    ...
```

---

## 육. 체크리스트

### 코드 리뷰 체크포인트

- [ ] 하위 호환성 별칭이 있나요?
- [ ] fallback 로직이 있나요?
- [ ] 기본값이 `None`인 `Optional` 매개변수가 있나요?
- [ ] `Any` 타입이 있나요?
- [ ] 맨 `except`가 있나요?
- [ ] 모듈 루트에서 임포트하고 있나요?
- [ ] 타입 어노테이션이 완전한가요?
