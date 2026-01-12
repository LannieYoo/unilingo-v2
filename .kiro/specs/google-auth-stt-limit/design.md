# Design Document: Google Auth + STT Character Limit

## Overview

Google OAuth 2.0을 사용한 인증 시스템과 비로그인 사용자의 STT 1000자 제한 기능을 구현합니다. Backend는 FastAPI + PostgreSQL, Frontend는 React를 사용합니다.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐│
│  │ AuthContext │  │ LoginModal   │  │ STT Stream Page             ││
│  │ (Zustand)   │  │              │  │ - Character Counter         ││
│  │ - user      │  │ - GoogleBtn │  │ - Auto Stop at 1000 chars   ││
│  │ - token     │  │ - Message    │  │ - Login Required Modal      ││
│  └──────┬──────┘  └──────────────┘  └─────────────────────────────┘│
│         │                                                           │
└─────────┼───────────────────────────────────────────────────────────┘
          │ HTTP (JWT Token)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ Auth Router     │  │ Auth Service    │  │ User Repository     │ │
│  │ /api/auth/*     │  │ - Google OAuth  │  │ - PostgreSQL        │ │
│  │                 │  │ - JWT Token     │  │ - User CRUD         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                           │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Google OAuth 2.0    │  │ PostgreSQL Database                 │  │
│  │ - Authentication    │  │ - users table                       │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Module Structure (8-layer)

```
backend/src/common/modules/auth/
├── _01_contracts/
│   ├── __init__.py
│   ├── i_auth_service.py      # IAuthService interface
│   ├── r_user.py              # IUserRepository interface
│   ├── d_user.py              # DUser, DUserCreate data contracts
│   ├── d_token.py             # DToken, DTokenPayload data contracts
│   ├── e_auth.py              # EAuthProvider enum
│   └── exc_auth.py            # AuthError, TokenError exceptions
├── _02_abstracts/
│   └── __init__.py
├── _03_impls/
│   ├── __init__.py
│   ├── impl_auth_service.py   # AuthService implementation
│   └── impl_google_oauth.py   # GoogleOAuthClient
├── _04_services/
│   ├── __init__.py
│   └── service_auth.py        # AuthService entry point
├── _05_dtos/
│   ├── __init__.py
│   └── dto_auth.py            # LoginRequest, LoginResponse, UserResponse
├── _06_models/
│   ├── __init__.py
│   ├── model_user.py          # UserModel (SQLAlchemy ORM)
│   └── repo_user.py           # UserRepository implementation
├── _07_router/
│   ├── __init__.py
│   ├── router_auth.py         # Auth endpoints
│   └── deps_auth.py           # get_current_user dependency
├── _08_utils/
│   ├── __init__.py
│   ├── helper_jwt.py          # JWT encode/decode helpers
│   └── helper_password.py     # Password hashing (future use)
└── __init__.py
```

### Frontend Module Structure (11-layer)

```
frontend/src/modules/auth/
├── _01_router/
│   ├── index.js
│   └── routes.jsx
├── _02_views/
│   └── index.js
├── _03_components/
│   ├── index.js
│   ├── GoogleLoginButton.jsx
│   ├── LoginModal.jsx
│   ├── UserProfile.jsx
│   └── CharacterLimitWarning.jsx
├── _04_hooks/
│   ├── index.js
│   └── useAuth.js
├── _05_stores/
│   ├── index.js
│   └── authStore.js
├── _06_services/
│   ├── index.js
│   └── service.js
├── _07_utils/
│   └── index.js
├── _08_constants/
│   ├── index.js
│   └── constants.js
├── _09_locales/
│   ├── ko.json
│   └── en.json
└── index.js
```

## Data Models

### PostgreSQL Schema

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

### Data Contracts

```python
# d_user.py
@dataclass
class DUser:
    id: int
    google_id: str
    email: str
    name: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class DUserCreate:
    google_id: str
    email: str
    name: str
    avatar_url: str | None

# d_token.py
@dataclass
class DToken:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600

@dataclass
class DTokenPayload:
    sub: str  # user_id
    email: str
    exp: datetime
    iat: datetime
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/google | Redirect to Google OAuth |
| GET | /api/auth/google/callback | Handle Google OAuth callback |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/auth/me | Get current user info |
| POST | /api/auth/logout | Logout (invalidate token) |

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │ Backend  │     │  Google  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Click Login │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ 2. Redirect URL│                │                │
     │<───────────────│                │                │
     │                │                │                │
     │ 3. Redirect to Google           │                │
     │────────────────────────────────>│                │
     │                │                │                │
     │ 4. User consents                │                │
     │<────────────────────────────────│                │
     │                │                │                │
     │ 5. Callback with code           │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 6. Exchange code for token      │
     │                │───────────────>│                │
     │                │                │                │
     │                │ 7. User info   │                │
     │                │<───────────────│                │
     │                │                │                │
     │                │ 8. Create/Update user          │
     │                │────────────────────────────────>│
     │                │                │                │
     │ 9. JWT Token   │                │                │
     │<───────────────│                │                │
     │                │                │                │
```

## Character Limit Logic

```javascript
// Frontend: useCharacterLimit hook
const MAX_CHARS_GUEST = 1000;

function useCharacterLimit(isLoggedIn) {
  const [charCount, setCharCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);

  const addCharacters = (text) => {
    if (isLoggedIn) {
      setCharCount(prev => prev + text.length);
      return true; // allow
    }
    
    const newCount = charCount + text.length;
    if (newCount >= MAX_CHARS_GUEST) {
      setIsLimitReached(true);
      return false; // stop recording
    }
    
    setCharCount(newCount);
    return true;
  };

  return { charCount, isLimitReached, addCharacters };
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Character limit enforcement for guests
*For any* non-logged-in user session, when the total recognized character count reaches or exceeds 1000, the STT recording SHALL automatically stop and display login modal.
**Validates: Requirements 2.2, 2.3**

### Property 2: Unlimited characters for logged-in users
*For any* logged-in user session, the STT recording SHALL continue regardless of character count.
**Validates: Requirements 2.4**

### Property 3: JWT token round-trip
*For any* valid user data, encoding to JWT and then decoding SHALL produce equivalent user identification data.
**Validates: Requirements 4.1**

### Property 4: User persistence
*For any* successful Google OAuth login, the user record SHALL exist in the database with matching google_id.
**Validates: Requirements 3.2, 3.3**

### Property 5: Token expiration enforcement
*For any* expired access token, API requests SHALL return 401 status.
**Validates: Requirements 4.4**

## Error Handling

| Error Type | HTTP Status | Error Code | Message |
|------------|-------------|------------|---------|
| Google OAuth Failed | 401 | GOOGLE_AUTH_FAILED | Google 인증에 실패했습니다 |
| Invalid Token | 401 | INVALID_TOKEN | 유효하지 않은 토큰입니다 |
| Token Expired | 401 | TOKEN_EXPIRED | 토큰이 만료되었습니다 |
| Database Error | 503 | DATABASE_ERROR | 서비스 일시 중단 |
| User Not Found | 404 | USER_NOT_FOUND | 사용자를 찾을 수 없습니다 |

## Testing Strategy

### Unit Tests
- JWT encode/decode functions
- Character counter logic
- User repository CRUD operations

### Property-Based Tests
- JWT round-trip property (encode → decode = original)
- Character limit boundary testing (999, 1000, 1001 chars)

### Integration Tests
- Google OAuth flow (mocked)
- Token refresh flow
- Database operations

## Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT
JWT_SECRET_KEY=your_super_secret_key_min_32_chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/unilingo

# Frontend
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=http://localhost:8000
```

---

## Google OAuth 설정 가이드

### Step 1: Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. Google 계정으로 로그인

### Step 2: 프로젝트 생성
1. 상단의 프로젝트 선택 드롭다운 클릭
2. "새 프로젝트" 클릭
3. 프로젝트 이름: `UniLingo` (또는 원하는 이름)
4. "만들기" 클릭

### Step 3: OAuth 동의 화면 설정
1. 왼쪽 메뉴 > "APIs & Services" > "OAuth consent screen"
2. User Type: "External" 선택 > "만들기"
3. 앱 정보 입력:
   - 앱 이름: `UniLingo`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 이메일: 본인 이메일
4. "저장 후 계속" 클릭
5. Scopes: "ADD OR REMOVE SCOPES" 클릭
   - `email` 선택
   - `profile` 선택
   - "업데이트" 클릭
6. "저장 후 계속" 클릭
7. Test users: 본인 이메일 추가 (개발 중에는 테스트 사용자만 로그인 가능)
8. "저장 후 계속" 클릭

### Step 4: OAuth 2.0 Client ID 생성
1. 왼쪽 메뉴 > "APIs & Services" > "Credentials"
2. "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Application type: "Web application"
4. Name: `UniLingo Web Client`
5. Authorized JavaScript origins:
   - `http://localhost:3000`
6. Authorized redirect URIs:
   - `http://localhost:8000/api/auth/google/callback`
7. "만들기" 클릭
8. **Client ID**와 **Client Secret** 복사해서 저장!

### Step 5: 환경 변수 설정
`backend/.env` 파일 생성:
```env
GOOGLE_CLIENT_ID=복사한_Client_ID
GOOGLE_CLIENT_SECRET=복사한_Client_Secret
JWT_SECRET_KEY=최소32자이상의랜덤문자열생성해서입력
DATABASE_URL=postgresql://postgres:password@localhost:5432/unilingo
```

`frontend/.env` 파일 생성:
```env
VITE_GOOGLE_CLIENT_ID=복사한_Client_ID
VITE_API_URL=http://localhost:8000
```

### Step 6: PostgreSQL 설정
1. PostgreSQL 설치 (이미 설치되어 있다면 스킵)
2. 데이터베이스 생성:
```sql
CREATE DATABASE unilingo;
```

---

## Dependencies to Install

### Backend (requirements.txt)
```
# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.27.0

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "@react-oauth/google": "^0.12.1"
  }
}
```
