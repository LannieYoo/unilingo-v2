"""
Token data contracts.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class DToken:
    """Token data contract."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600  # seconds


@dataclass
class DTokenPayload:
    """Token payload data contract."""
    sub: str  # user_id as string
    email: str
    exp: datetime
    iat: datetime
    token_type: str = "access"  # "access" or "refresh"
    token_version: int = 1  # For single session enforcement
    
    @property
    def user_id(self) -> int:
        """Get user ID as integer."""
        return int(self.sub)


@dataclass
class DGoogleTokens:
    """Google OAuth tokens data contract."""
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int = 3600
    token_type: str = "Bearer"
    scope: str = ""
    id_token: Optional[str] = None
