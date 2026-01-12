"""
Auth exception contracts.
"""


class AuthError(Exception):
    """Base authentication error."""
    
    def __init__(self, message: str, code: str = "AUTH_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class GoogleOAuthError(AuthError):
    """Google OAuth specific error."""
    
    def __init__(self, message: str = "Google 인증에 실패했습니다"):
        super().__init__(message, code="GOOGLE_AUTH_FAILED")


class TokenError(AuthError):
    """Token related error."""
    
    def __init__(self, message: str = "유효하지 않은 토큰입니다", code: str = "INVALID_TOKEN"):
        super().__init__(message, code=code)


class TokenExpiredError(TokenError):
    """Token expired error."""
    
    def __init__(self, message: str = "토큰이 만료되었습니다"):
        super().__init__(message, code="TOKEN_EXPIRED")


class InvalidTokenError(TokenError):
    """Invalid token error."""
    
    def __init__(self, message: str = "유효하지 않은 토큰입니다"):
        super().__init__(message, code="INVALID_TOKEN")


class UserNotFoundError(AuthError):
    """User not found error."""
    
    def __init__(self, message: str = "사용자를 찾을 수 없습니다"):
        super().__init__(message, code="USER_NOT_FOUND")


class DatabaseError(AuthError):
    """Database error."""
    
    def __init__(self, message: str = "서비스 일시 중단"):
        super().__init__(message, code="DATABASE_ERROR")
