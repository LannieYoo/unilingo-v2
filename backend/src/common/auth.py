#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Auth
인증 관련 유틸리티 및 데코레이터
"""

from functools import wraps
from typing import Optional, Callable
from flask import request, g

from .errors import AuthenticationError, AuthorizationError


def get_token_from_header() -> Optional[str]:
    """Authorization 헤더에서 Bearer 토큰 추출"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def get_current_user_id() -> Optional[int]:
    """현재 요청의 사용자 ID 반환"""
    return getattr(g, 'user_id', None)


def get_current_user() -> Optional[dict]:
    """현재 요청의 사용자 정보 반환"""
    return getattr(g, 'current_user', None)


def is_authenticated() -> bool:
    """현재 요청이 인증되었는지 확인"""
    return get_current_user_id() is not None


def require_auth(func: Callable) -> Callable:
    """인증 필수 데코레이터 (기본)"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not is_authenticated():
            raise AuthenticationError('Authentication required')
        return func(*args, **kwargs)
    return wrapper


def require_admin(func: Callable) -> Callable:
    """관리자 권한 필수 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            raise AuthenticationError('Authentication required')
        if not user.get('is_admin', False):
            raise AuthorizationError('Admin access required')
        return func(*args, **kwargs)
    return wrapper
