# Auth contracts
from .i_auth_service import IAuthService
from .r_user import IUserRepository
from .r_login_log import ILoginLogRepository
from .d_user import DUser, DUserCreate, DGoogleUserInfo, DLanguagePreferences
from .d_token import DToken, DTokenPayload, DGoogleTokens
from .d_login_log import DLoginLog, DLoginLogCreate
from .e_auth import EAuthProvider, ETokenType
from .exc_auth import (
    AuthError,
    GoogleOAuthError,
    TokenError,
    TokenExpiredError,
    InvalidTokenError,
    UserNotFoundError,
    DatabaseError,
)

__all__ = [
    # Interfaces
    "IAuthService",
    "IUserRepository",
    "ILoginLogRepository",
    # Data contracts
    "DUser",
    "DUserCreate",
    "DGoogleUserInfo",
    "DLanguagePreferences",
    "DToken",
    "DTokenPayload",
    "DGoogleTokens",
    "DLoginLog",
    "DLoginLogCreate",
    # Enums
    "EAuthProvider",
    "ETokenType",
    # Exceptions
    "AuthError",
    "GoogleOAuthError",
    "TokenError",
    "TokenExpiredError",
    "InvalidTokenError",
    "UserNotFoundError",
    "DatabaseError",
]
