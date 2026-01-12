"""
Auth service entry point.
"""
from typing import Optional
from sqlalchemy.orm import Session
from .._01_contracts import DUser, DToken, DTokenPayload
from .._03_impls import AuthServiceImpl


def get_auth_service(db: Session) -> AuthServiceImpl:
    """Get auth service instance."""
    return AuthServiceImpl(db)


class AuthService:
    """Auth service facade for external use."""
    
    def __init__(self, db: Session):
        self._impl = AuthServiceImpl(db)
    
    def get_google_auth_url(self, redirect_uri: str) -> str:
        """Get Google OAuth authorization URL."""
        return self._impl.get_google_auth_url(redirect_uri)
    
    async def authenticate_google(self, code: str, redirect_uri: str) -> tuple[DUser, DToken]:
        """Authenticate user with Google OAuth code."""
        return await self._impl.authenticate_google(code, redirect_uri)
    
    def verify_token(self, token: str) -> Optional[DTokenPayload]:
        """Verify and decode JWT token."""
        return self._impl.verify_token(token)
    
    def refresh_access_token(self, refresh_token: str) -> Optional[DToken]:
        """Refresh access token using refresh token."""
        return self._impl.refresh_access_token(refresh_token)
    
    def get_user_by_id(self, user_id: int) -> Optional[DUser]:
        """Get user by ID."""
        return self._impl.get_user_by_id(user_id)
