#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Auth DTO - 요청/응답 데이터 구조 및 도메인 객체 정의

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from enum import Enum


# ============================================================
# Enums
# ============================================================

class EAuthProvider(str, Enum):
    GOOGLE = "google"


class ETokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


# ============================================================
# Domain Data Classes
# ============================================================

@dataclass
class DUser:
    id: int
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str]
    is_active: bool
    user_level: str  # guest, pro, pro_plus, admin
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    token_version: int = 1
    native_language: Optional[str] = 'en'
    target_language: Optional[str] = 'ko'
    daily_gpu_limit_minutes: Optional[int] = None  # NULL = use level default


@dataclass
class DUserCreate:
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


@dataclass
class DGoogleUserInfo:
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None


@dataclass
class DLanguagePreferences:
    native_language: str
    target_language: str


@dataclass
class DToken:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600


@dataclass
class DTokenPayload:
    sub: str
    email: str
    exp: datetime
    iat: datetime
    token_type: str = "access"
    token_version: int = 1
    
    @property
    def user_id(self) -> int:
        return int(self.sub)


@dataclass
class DGoogleTokens:
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int = 3600
    token_type: str = "Bearer"
    scope: str = ""
    id_token: Optional[str] = None


@dataclass
class DLoginLog:
    id: int
    user_id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    login_at: datetime


@dataclass
class DLoginLogCreate:
    user_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class DSttLog:
    id: int
    user_id: int
    language: str
    duration_seconds: int
    word_count: int
    ip_address: Optional[str]
    created_at: datetime


@dataclass
class DSttLogCreate:
    user_id: int
    language: str
    duration_seconds: int
    word_count: int
    ip_address: Optional[str] = None


@dataclass
class DSttLogSummary:
    user_id: int
    total_duration_seconds: int
    total_word_count: int
    session_count: int


# ============================================================
# Pydantic Request/Response Models
# ============================================================

class GoogleAuthRequest(BaseModel):
    redirect_uri: str


class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
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
    user: UserResponse
    tokens: TokenResponse


class SttLogCreateRequest(BaseModel):
    language: str = 'en'
    duration_seconds: float = 0
    word_count: int = 0


class TranslationLogCreateRequest(BaseModel):
    source_text: str
    translated_text: str
    source_lang: str = 'en'
    target_lang: str = 'ko'
    provider: str = 'google'


class DictionaryLogCreateRequest(BaseModel):
    search_word: str
    source_lang: str
    target_lang: str
    search_source: str = 'dictionary'  # 'dictionary', 'translator', 'pte'


# ============================================================
# Exceptions
# ============================================================

class AuthError(Exception):
    def __init__(self, message: str, code: str = "AUTH_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class GoogleOAuthError(AuthError):
    def __init__(self, message: str = "Google 인증에 실패했습니다"):
        super().__init__(message, code="GOOGLE_AUTH_FAILED")


class TokenError(AuthError):
    def __init__(self, message: str = "유효하지 않은 토큰입니다", code: str = "INVALID_TOKEN"):
        super().__init__(message, code=code)


class TokenExpiredError(TokenError):
    def __init__(self, message: str = "토큰이 만료되었습니다"):
        super().__init__(message, code="TOKEN_EXPIRED")


class InvalidTokenError(TokenError):
    def __init__(self, message: str = "유효하지 않은 토큰입니다"):
        super().__init__(message, code="INVALID_TOKEN")


class UserNotFoundError(AuthError):
    def __init__(self, message: str = "사용자를 찾을 수 없습니다"):
        super().__init__(message, code="USER_NOT_FOUND")


class DatabaseError(AuthError):
    def __init__(self, message: str = "서비스 일시 중단"):
        super().__init__(message, code="DATABASE_ERROR")


__all__ = [
    # Enums
    'EAuthProvider',
    'ETokenType',
    # Domain Data Classes
    'DUser',
    'DUserCreate',
    'DGoogleUserInfo',
    'DLanguagePreferences',
    'DToken',
    'DTokenPayload',
    'DGoogleTokens',
    'DLoginLog',
    'DLoginLogCreate',
    'DSttLog',
    'DSttLogCreate',
    'DSttLogSummary',
    # Pydantic Models
    'GoogleAuthRequest',
    'GoogleCallbackRequest',
    'TokenRefreshRequest',
    'TokenResponse',
    'UserResponse',
    'LoginResponse',
    'SttLogCreateRequest',
    'TranslationLogCreateRequest',
    'DictionaryLogCreateRequest',
    # Exceptions
    'AuthError',
    'GoogleOAuthError',
    'TokenError',
    'TokenExpiredError',
    'InvalidTokenError',
    'UserNotFoundError',
    'DatabaseError',
]
