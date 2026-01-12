# Implementation Plan: Google Auth + STT Character Limit

## Overview

Google OAuth 2.0 인증과 비로그인 사용자 1000자 제한 기능을 구현합니다. Backend는 8-layer 구조, Frontend는 11-layer 구조를 따릅니다.

## Tasks

- [x] 1. Backend Dependencies 및 Database 설정
  - [x] 1.1 requirements.txt에 auth 관련 패키지 추가
    - python-jose[cryptography], passlib[bcrypt], httpx, sqlalchemy, psycopg2-binary, alembic
    - _Requirements: 3.1, 4.1_
  - [x] 1.2 backend/.env.example 업데이트
    - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET_KEY, DATABASE_URL 추가
    - _Requirements: 1.1_
  - [x] 1.3 Database 설정 모듈 생성
    - backend/src/common/modules/database/ 8-layer 구조
    - SQLAlchemy engine, session 설정
    - _Requirements: 3.1_

- [x] 2. Backend Auth 모듈 - Contracts Layer
  - [x] 2.1 _01_contracts/i_auth_service.py 생성
    - IAuthService interface 정의
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 _01_contracts/r_user.py 생성
    - IUserRepository interface 정의
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.3 _01_contracts/d_user.py 생성
    - DUser, DUserCreate data contracts
    - _Requirements: 3.1_
  - [x] 2.4 _01_contracts/d_token.py 생성
    - DToken, DTokenPayload data contracts
    - _Requirements: 4.1, 4.2_
  - [x] 2.5 _01_contracts/e_auth.py 생성
    - EAuthProvider enum
    - _Requirements: 1.1_
  - [x] 2.6 _01_contracts/exc_auth.py 생성
    - AuthError, TokenError, GoogleOAuthError exceptions
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Backend Auth 모듈 - Models Layer
  - [x] 3.1 _06_models/model_user.py 생성
    - UserModel SQLAlchemy ORM
    - _Requirements: 3.1_
  - [x] 3.2 _06_models/repo_user.py 생성
    - UserRepository 구현 (IUserRepository)
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 4. Backend Auth 모듈 - Utils Layer
  - [x] 4.1 _08_utils/helper_jwt.py 생성
    - JWT encode/decode helpers
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 4.2 Write property test for JWT round-trip
    - **Property 3: JWT token round-trip**
    - **Validates: Requirements 4.1**

- [x] 5. Backend Auth 모듈 - Impls Layer
  - [x] 5.1 _03_impls/impl_google_oauth.py 생성
    - GoogleOAuthClient 구현
    - _Requirements: 1.1, 1.2_
  - [x] 5.2 _03_impls/impl_auth_service.py 생성
    - AuthService 구현
    - _Requirements: 1.2, 1.3, 1.5, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Backend Auth 모듈 - Services & DTOs Layer
  - [x] 6.1 _04_services/service_auth.py 생성
    - AuthService entry point
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - [x] 6.2 _05_dtos/dto_auth.py 생성
    - LoginResponse, UserResponse, TokenRefreshRequest
    - _Requirements: 1.3, 4.1_

- [x] 7. Backend Auth 모듈 - Router Layer
  - [x] 7.1 _07_router/deps_auth.py 생성
    - get_current_user, get_optional_user dependencies
    - _Requirements: 4.4, 5.3_
  - [x] 7.2 _07_router/router_auth.py 생성
    - /api/auth/google, /api/auth/google/callback, /api/auth/refresh, /api/auth/me, /api/auth/logout
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.3_
  - [x] 7.3 app.py에 auth router 등록
    - _Requirements: 1.1_

- [x] 8. Checkpoint - Backend Auth 완료
  - Ensure all tests pass, ask the user if questions arise.
  - Backend 서버 실행 및 API 테스트

- [x] 9. Frontend Dependencies 설치
  - [x] 9.1 @react-oauth/google 패키지 설치
    - npm install @react-oauth/google
    - _Requirements: 1.1_
  - [x] 9.2 frontend/.env.example 생성
    - VITE_GOOGLE_CLIENT_ID, VITE_API_URL
    - _Requirements: 1.1_

- [x] 10. Frontend Auth 모듈 - Stores & Services
  - [x] 10.1 _05_stores/authStore.js 생성
    - user, token, isAuthenticated state
    - login, logout, refreshToken actions
    - _Requirements: 1.3, 1.4, 1.5_
  - [x] 10.2 _06_services/service.js 생성
    - googleLogin, refreshToken, getMe, logout API calls
    - _Requirements: 1.1, 1.3, 4.3_

- [x] 11. Frontend Auth 모듈 - Hooks
  - [x] 11.1 _04_hooks/useAuth.js 생성
    - useAuth hook (login, logout, user state)
    - _Requirements: 1.1, 1.4, 1.5_
  - [x] 11.2 _04_hooks/useCharacterLimit.js 생성
    - Character counting, limit check logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 11.3 Write property test for character limit
    - **Property 1: Character limit enforcement for guests**
    - **Validates: Requirements 2.2, 2.3**

- [x] 12. Frontend Auth 모듈 - Components
  - [x] 12.1 _03_components/GoogleLoginButton.jsx 생성
    - Google OAuth 로그인 버튼
    - _Requirements: 1.1_
  - [x] 12.2 _03_components/LoginModal.jsx 생성
    - 로그인 필요 모달 (1000자 초과 시)
    - _Requirements: 2.3_
  - [x] 12.3 _03_components/UserProfile.jsx 생성
    - 로그인된 사용자 프로필 표시
    - _Requirements: 1.4_
  - [x] 12.4 _03_components/CharacterCounter.jsx 생성
    - 현재 글자 수 표시
    - _Requirements: 2.5_

- [x] 13. Frontend Auth 모듈 - Constants & Locales
  - [x] 13.1 _08_constants/constants.js 생성
    - MAX_CHARS_GUEST = 1000
    - _Requirements: 2.1_
  - [x] 13.2 _09_locales/ko.json, en.json 생성
    - 다국어 메시지
    - _Requirements: 2.3_

- [x] 14. Frontend Auth 모듈 - Router & Index
  - [x] 14.1 _01_router/index.js, routes.jsx 생성
    - Auth 관련 라우트 (필요시)
    - _Requirements: 1.1_
  - [x] 14.2 모듈 index.js 통합 내보내기
    - _Requirements: 1.1_

- [x] 15. STT Stream 페이지 통합
  - [x] 15.1 SttStreamView.jsx에 character limit 통합
    - useCharacterLimit hook 연동
    - 1000자 초과 시 자동 stop
    - _Requirements: 2.2, 2.3_
  - [x] 15.2 SttStreamView.jsx에 auth 통합
    - 로그인 버튼/사용자 프로필 표시
    - LoginModal 연동
    - _Requirements: 1.4, 2.3_
  - [x] 15.3 CharacterCounter 컴포넌트 추가
    - 현재 글자 수 표시
    - _Requirements: 2.5_

- [x] 16. App.jsx에 GoogleOAuthProvider 설정
  - [x] 16.1 GoogleOAuthProvider wrapper 추가
    - _Requirements: 1.1_
  - [x] 16.2 AuthProvider 또는 초기화 로직 추가
    - 페이지 로드 시 토큰 확인
    - _Requirements: 4.3_

- [x] 17. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - 전체 플로우 테스트: 비로그인 1000자 제한 → 로그인 → 무제한

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Google OAuth 설정은 사용자가 Google Cloud Console에서 직접 수행해야 함
- PostgreSQL 데이터베이스가 실행 중이어야 함
