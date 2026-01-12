#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Modules
공통 모듈 패키지
"""

# Middleware
from .middleware import (
    init_cors,
    init_request_logger,
    init_error_handler,
    init_rate_limiter,
    init_logging,
    get_logger,
)

# Exception
from .exception import (
    ICustomException,
    TranslationError,
    DictionaryError,
    STTError,
    CacheError,
)

# Cache
from .cache import CacheService

# Translation
from .translation import TranslationService, translation_bp

# Dictionary
from .dictionary import DictionaryService, dictionary_bp

# STT
from .stt import STTService, stt_bp

# Health
from .health import health_bp

# Auth
from .auth import router as auth_bp, admin_router as admin_bp, login_required, get_current_user, get_optional_user, admin_required, is_admin

__all__ = [
    # Middleware
    'init_cors',
    'init_request_logger',
    'init_error_handler',
    'init_rate_limiter',
    'init_logging',
    'get_logger',
    # Exception
    'ICustomException',
    'TranslationError',
    'DictionaryError',
    'STTError',
    'CacheError',
    # Cache
    'CacheService',
    # Translation
    'TranslationService',
    'translation_bp',
    # Dictionary
    'DictionaryService',
    'dictionary_bp',
    # STT
    'STTService',
    'stt_bp',
    # Health
    'health_bp',
    # Auth
    'auth_bp',
    'admin_bp',
    'login_required',
    'get_current_user',
    'get_optional_user',
    'admin_required',
    'is_admin',
]
