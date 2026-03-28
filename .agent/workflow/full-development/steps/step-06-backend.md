# Step 6: 백엔드 개발

## 단계 정보
- **단계**: 6/10 - 백엔드 개발
- **스킬**: `dev-senior_backend`
- **입력**: `docs/stories.md`, `docs/database.md`
- **산출물**: `src/backend/`

---

## 실행 단계

### 1. 컨텍스트 로드

다음 파일을 읽고 분석합니다:
- `docs/architecture.md` - 기술 선정 및 디렉토리 구조
- `docs/database.md` - 데이터베이스 설계
- `docs/stories.md` - 개발 작업 리스트

### 2. 스킬 로드

`dev-senior_backend` 스킬을 로드하여 백엔드 개발 전문 지식을 활용합니다.

### 3. 작업 순서 지정

`docs/stories.md`에서 백엔드 관련 Story를 가져와 의존성 관계에 따라 정렬합니다:

```
1. [BE-001] 데이터베이스 Model 계층 구현
2. [BE-002] 기초 CRUD Service 구현
3. [BE-003] API Router 구현
4. [BE-004] 인증 및 인가 구현
5. [BE-005] 비비즈니스 로직 구현
...
```

### 4. 개발 사이클

각 Story에 대하여 다음 과정을 반복합니다:

```
┌─────────────────────────────────────────────┐
│  Story: {story_id} - {story_title}          │
├─────────────────────────────────────────────┤
│  1. Story 설명 및 수락 기준 읽기              │
│  2. 관련 파일 생성/수정                      │
│  3. 코드 작성                                │
│  4. 확인 스크립트 실행                       │
│  5. 완료 표시 / 문제 해결                    │
└─────────────────────────────────────────────┘
```

### 5. 코드 규격

#### 5.1 Model 계층
```python
# models/user.py
from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    # ...
```

#### 5.2 Schema 계층 (데이터 검증)
```python
# schemas/user.py
from pydantic import BaseModel

class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True
```

#### 5.3 Service 계층 (비즈니스 로직)
```python
# services/user_service.py
from sqlalchemy.orm import Session
from models.user import User
from schemas.user import UserCreate

class UserService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user: UserCreate) -> User:
        # 비즈니스 로직 구현
        pass

    def get_by_id(self, user_id: int) -> User:
        # 비즈니스 로직 구현
        pass
```

#### 5.4 Router 계층 (API 엔드포인트)
```python
# routers/user_router.py
from fastapi import APIRouter, Depends
from services.user_service import UserService
from schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, service: UserService = Depends()):
    return service.create(user)
```

### 6. 확인 스크립트

각 모듈이 완료될 때마다 확인 작업을 실행합니다:

```bash
# Model 확인
python scripts/check-model.py --file models/user.py

# Router 확인
python scripts/check-router.py --file routers/user_router.py

# Service 확인
python scripts/check-service.py --file services/user_service.py

# 열거형 (Enum) 확인
python scripts/check-enum.py --dir enums/
```

확인 항목:
- [ ] 명명 규칙 준수
- [ ] 타입 어노테이션 포함
- [ ] 독스트링 (Docstring) 작성
- [ ] 에러 처리 로직
- [ ] 보안 점검

### 7. Story 완료 확인

각 Story 완료 후:

```
[✓] Story BE-001 완료
    - 생성 파일: models/user.py
    - 확인 결과: 통과
    - 소요 시간: 15분

다음 Story로 진행하겠습니까? [Y/n]
```

---

## 완료 확인

- [ ] 모든 백엔드 Story가 완료됨
- [ ] 모든 확인 스크립트 통과
- [ ] API가 정상적으로 호출됨
- [ ] 단위 테스트 통과

## 상태 업데이트

```yaml
phases:
  backend:
    status: completed
    completed_at: {current_time}
    stories_completed:
      - BE-001
      - BE-002
      - ...
```

## 다음 단계

→ `step-07-frontend.md`로 진입 (또는 병렬 실행)
