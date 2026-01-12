# Requirements Document

## Introduction

STT Stream 페이지에 Google 로그인 기능과 비로그인 사용자 1000자 제한 기능을 추가합니다. PostgreSQL 데이터베이스를 사용하여 사용자 정보를 저장합니다.

## Glossary

- **Auth_Service**: 인증 관련 비즈니스 로직을 처리하는 서비스
- **User_Repository**: 사용자 데이터 접근을 담당하는 Repository
- **STT_Stream_Page**: 실시간 음성인식 페이지 (/stt-stream)
- **Character_Counter**: 인식된 텍스트의 글자 수를 추적하는 컴포넌트
- **Login_Modal**: 로그인 필요 시 표시되는 모달 컴포넌트

## Requirements

### Requirement 1: Google OAuth 로그인

**User Story:** As a user, I want to login with my Google account, so that I can use the STT feature without character limits.

#### Acceptance Criteria

1. WHEN a user clicks the Google login button, THE Auth_Service SHALL redirect to Google OAuth consent screen
2. WHEN Google authentication succeeds, THE Auth_Service SHALL create or update user record in PostgreSQL
3. WHEN Google authentication succeeds, THE Auth_Service SHALL return JWT access token to frontend
4. WHEN a user is logged in, THE STT_Stream_Page SHALL display user profile (name, avatar)
5. WHEN a user clicks logout, THE Auth_Service SHALL invalidate the session and clear tokens

### Requirement 2: 비로그인 사용자 1000자 제한

**User Story:** As a non-logged-in user, I want to try the STT feature with a 1000 character limit, so that I can evaluate the service before signing up.

#### Acceptance Criteria

1. THE Character_Counter SHALL track total recognized characters during a session
2. WHEN character count reaches 1000 for non-logged-in users, THE STT_Stream_Page SHALL automatically stop recording
3. WHEN character count reaches 1000 for non-logged-in users, THE Login_Modal SHALL display message "로그인 후 이용 가능합니다"
4. WHEN a user is logged in, THE Character_Counter SHALL allow unlimited characters
5. THE Character_Counter SHALL display current character count to users

### Requirement 3: 사용자 데이터 저장

**User Story:** As a system administrator, I want to store user data in PostgreSQL, so that user information persists across sessions.

#### Acceptance Criteria

1. THE User_Repository SHALL store user data (id, email, name, avatar_url, created_at, updated_at)
2. WHEN a user logs in for the first time, THE User_Repository SHALL create a new user record
3. WHEN an existing user logs in, THE User_Repository SHALL update the updated_at timestamp
4. THE User_Repository SHALL use Google ID as unique identifier

### Requirement 4: JWT 토큰 관리

**User Story:** As a developer, I want to use JWT tokens for authentication, so that the system can verify user identity securely.

#### Acceptance Criteria

1. WHEN authentication succeeds, THE Auth_Service SHALL generate JWT access token with 1 hour expiry
2. WHEN authentication succeeds, THE Auth_Service SHALL generate refresh token with 7 days expiry
3. WHEN access token expires, THE Auth_Service SHALL use refresh token to generate new access token
4. IF refresh token is invalid or expired, THEN THE Auth_Service SHALL require re-authentication

### Requirement 5: 에러 처리

**User Story:** As a user, I want to see clear error messages when authentication fails, so that I can understand what went wrong.

#### Acceptance Criteria

1. IF Google OAuth fails, THEN THE Auth_Service SHALL return appropriate error code and message
2. IF database connection fails, THEN THE Auth_Service SHALL log error and return 503 status
3. IF JWT token is invalid, THEN THE Auth_Service SHALL return 401 status with error details
4. THE Auth_Service SHALL log all authentication errors with trace_id for debugging

## Google OAuth Setup Requirements

사용자가 Google Cloud Console에서 설정해야 할 항목:

1. **Google Cloud Console** (https://console.cloud.google.com)
   - 새 프로젝트 생성 또는 기존 프로젝트 선택
   
2. **OAuth 2.0 Client ID 생성**
   - APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:8000/api/auth/google/callback`
   
3. **환경 변수 설정** (.env 파일)
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   JWT_SECRET_KEY=your_jwt_secret_key
   DATABASE_URL=postgresql://user:password@localhost:5432/unilingo
   ```

4. **PostgreSQL 설치**
   - 로컬 PostgreSQL 서버 설치 및 실행
   - 데이터베이스 생성: `CREATE DATABASE unilingo;`
