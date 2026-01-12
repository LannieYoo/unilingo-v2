"""
Auth module - Google OAuth 2.0 authentication.
"""
# Contracts
from ._01_contracts import (
    IAuthService,
    IUserRepository,
    DUser,
    DUserCreate,
    DGoogleUserInfo,
    DToken,
    DTokenPayload,
    DGoogleTokens,
    EAuthProvider,
    ETokenType,
    AuthError,
    GoogleOAuthError,
    TokenError,
    TokenExpiredError,
    InvalidTokenError,
    UserNotFoundError,
    DatabaseError,
)

# Services
from ._04_services import get_auth_service, AuthService

# DTOs
from ._05_dtos import (
    GoogleAuthRequest,
    GoogleCallbackRequest,
    TokenRefreshRequest,
    LoginResponse,
    UserResponse,
    TokenResponse,
)

# Router
from ._07_router import router, admin_router, login_required, get_current_user, get_optional_user, admin_required, is_admin

__all__ = [
    # Contracts
    "IAuthService",
    "IUserRepository",
    "DUser",
    "DUserCreate",
    "DGoogleUserInfo",
    "DToken",
    "DTokenPayload",
    "DGoogleTokens",
    "EAuthProvider",
    "ETokenType",
    "AuthError",
    "GoogleOAuthError",
    "TokenError",
    "TokenExpiredError",
    "InvalidTokenError",
    "UserNotFoundError",
    "DatabaseError",
    # Services
    "get_auth_service",
    "AuthService",
    # DTOs
    "GoogleAuthRequest",
    "GoogleCallbackRequest",
    "TokenRefreshRequest",
    "LoginResponse",
    "UserResponse",
    "TokenResponse",
    # Router
    "router",
    "admin_router",
    "login_required",
    "get_current_user",
    "get_optional_user",
    "admin_required",
    "is_admin",
]
