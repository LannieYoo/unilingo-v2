# Step 8: 테스트

## 단계 정보
- **단계**: 8/10 - 테스트
- **스킬**: `dev-senior_qa`
- **입력**: `docs/prd.md`, `src/`
- **산출물**: `tests/` 폴더, 테스트 보고서

---

## 실행 단계

### 1. 컨텍스트 로드

다음 파일을 읽고 분석합니다:
- `docs/prd.md` - 수락 기준
- `docs/stories.md` - 기능 리스트
- `src/backend/` - 백엔드 코드
- `src/frontend/` - 프론트엔드 코드

### 2. 스킬 로드

`dev-senior_qa` 스킬을 로드하여 테스트 전문 지식을 활용합니다.

### 3. 테스트 전략

```
테스트 피라미드:
                    ┌─────┐
                    │ E2E │   소량
                   ─┴─────┴─
                  │  통합   │   중간
                 ─┴─────────┴─
                │ 단위 테스트  │   대량
               ─┴─────────────┴─
```

| 테스트 유형 | 커버리지 목표 | 도구 |
|----------|----------|------|
| 단위 테스트 | 함수, 클래스 | pytest / jest |
| 통합 테스트 | API, 서비스 | pytest / supertest |
| E2E 테스트 | 사용자 프로세스 | playwright / cypress |

### 4. 디렉토리 구조

```
tests/
├── backend/
│   ├── unit/
│   │   ├── test_models.py
│   │   ├── test_services.py
│   │   └── test_utils.py
│   ├── integration/
│   │   ├── test_api_users.py
│   │   ├── test_api_orders.py
│   │   └── conftest.py
│   └── conftest.py
├── frontend/
│   ├── unit/
│   │   ├── components/
│   │   └── hooks/
│   ├── integration/
│   │   └── pages/
│   └── setup.ts
├── e2e/
│   ├── specs/
│   │   ├── auth.spec.ts
│   │   ├── orders.spec.ts
│   │   └── ...
│   └── playwright.config.ts
└── fixtures/
    ├── users.json
    └── orders.json
```

### 5. 단위 테스트

#### 5.1 백엔드 단위 테스트
```python
# tests/backend/unit/test_user_service.py
import pytest
from unittest.mock import Mock, patch
from services.user_service import UserService
from schemas.user import UserCreate

class TestUserService:
    @pytest.fixture
    def mock_db(self):
        return Mock()

    @pytest.fixture
    def service(self, mock_db):
        return UserService(mock_db)

    def test_create_user_success(self, service, mock_db):
        # Arrange
        user_data = UserCreate(email="test@example.com", password="123456", name="Test")

        # Act
        result = service.create(user_data)

        # Assert
        assert result is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_user_duplicate_email(self, service, mock_db):
        # Arrange
        mock_db.query.return_value.filter.return_value.first.return_value = Mock()
        user_data = UserCreate(email="existing@example.com", password="123456", name="Test")

        # Act & Assert
        with pytest.raises(ValueError, match="Email already exists"):
            service.create(user_data)
```

#### 5.2 프론트엔드 단위 테스트
```tsx
// tests/frontend/unit/components/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '@/components/features/UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.jpg',
  };

  it('renders user information correctly', () => {
    render(<UserCard user={mockUser} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<UserCard user={mockUser} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('article'));

    expect(handleClick).toHaveBeenCalledWith(1);
  });
});
```

### 6. 통합 테스트

```python
# tests/backend/integration/test_api_users.py
import pytest
from fastapi.testclient import TestClient
from main import app

class TestUserAPI:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_create_user(self, client):
        # Arrange
        payload = {
            "email": "test@example.com",
            "password": "123456",
            "name": "Test User"
        }

        # Act
        response = client.post("/api/v1/users", json=payload)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert "id" in data

    def test_get_user_not_found(self, client):
        response = client.get("/api/v1/users/99999")
        assert response.status_code == 404
```

### 7. E2E 테스트

```typescript
// tests/e2e/specs/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('인증 기능', () => {
  test('사용자가 회원가입을 할 수 있음', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="name"]', 'New User');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome-message')).toContainText('Welcome, New User');
  });

  test('사용자가 로그인을 할 수 있음', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('잘못된 정보 입력 시 에러 표시', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

### 8. 커버리지 요구사항

| 유형 | 최소 커버리지 |
|------|------------|
| 백엔드 단위 테스트 | 80% |
| 프론트엔드 단위 테스트 | 70% |
| 통합 테스트 | 핵심 경로 100% |
| E2E 테스트 | 핵심 워크플로우 100% |

### 9. 테스트 실행

```bash
# 백엔드 테스트
cd src/backend
pytest --cov=. --cov-report=html

# 프론트엔드 테스트
cd src/frontend
npm run test -- --coverage

# E2E 테스트
npx playwright test

# 전체 테스트 실행
npm run test:all
```

### 10. 테스트 보고서

`docs/test-report.md`를 생성합니다:

```markdown
# 테스트 보고서

## 개요
- 테스트 날짜: {날짜}
- 총 테스트 수: {total}
- 통과: {passed}
- 실패: {failed}
- 건너뜀: {skipped}

## 커버리지
| 모듈 | 라인 커버리지 | 브랜치 커버리지 |
|------|----------|------------|
| backend | 85% | 78% |
| frontend | 72% | 65% |

## 실패 케이스
(있는 경우 목록 작성)

## E2E 테스트 결과
| 시나리오 | 상태 | 소요 시간 |
|------|------|------|
| 사용자 가입 | ✓ | 2.3s |
| 사용자 로그인 | ✓ | 1.8s |
```

---

## 완료 확인

- [ ] 단위 테스트 커버리지 목표 달성
- [ ] 통합 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 치명적인(Bloching) 버그 없음
- [ ] 테스트 보고서 작성 완료

## 상태 업데이트

```yaml
phases:
  testing:
    status: completed
    completed_at: {current_time}
    coverage:
      backend: 85%
      frontend: 72%
    tests_passed: {n}
    tests_failed: 0
```

## 다음 단계

→ `step-09-review.md`로 진입
