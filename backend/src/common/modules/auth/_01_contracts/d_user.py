"""
User data contracts.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class DUser:
    """User data contract."""
    id: int
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    token_version: int = 1  # For single session enforcement
    native_language: Optional[str] = 'en'  # User's native language
    target_language: Optional[str] = 'ko'  # Preferred translation target language


@dataclass
class DUserCreate:
    """User creation data contract."""
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


@dataclass
class DGoogleUserInfo:
    """Google user info data contract."""
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None


@dataclass
class DLanguagePreferences:
    """Language preferences data contract."""
    native_language: str
    target_language: str
