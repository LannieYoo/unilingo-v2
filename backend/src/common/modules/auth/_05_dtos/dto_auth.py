"""
Auth DTOs for API request/response.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime


class GoogleAuthRequest(BaseModel):
    """Google OAuth authorization request."""
    redirect_uri: str


class GoogleCallbackRequest(BaseModel):
    """Google OAuth callback request."""
    code: str
    redirect_uri: str


class TokenRefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User response."""
    id: int
    email: str
    name: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login response with user and tokens."""
    user: UserResponse
    tokens: TokenResponse
