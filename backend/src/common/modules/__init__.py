#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Modules
공통 모듈 패키지
"""

from .middleware import (
    init_cors,
    init_request_logger,
    init_error_handler,
    init_rate_limiter,
    init_logging,
    get_logger,
)

from .exception import (
    ICustomException,
    TranslationError,
    DictionaryError,
    STTError,
    CacheError,
)

from .cache import CacheService

from .translation import TranslationService, translation_bp

from .dictionary import DictionaryService, dictionary_bp

from .stt import STTService, stt_bp

from .health import health_bp

from .auth import (
    router as auth_bp,
    admin_router as admin_bp,
    login_required,
    get_current_user,
    get_optional_user,
    admin_required,
    is_admin,
)

__all__ = [
    'init_cors',
    'init_request_logger',
    'init_error_handler',
    'init_rate_limiter',
    'init_logging',
    'get_logger',
    'ICustomException',
    'TranslationError',
    'DictionaryError',
    'STTError',
    'CacheError',
    'CacheService',
    'TranslationService',
    'translation_bp',
    'DictionaryService',
    'dictionary_bp',
    'STTService',
    'stt_bp',
    'health_bp',
    'auth_bp',
    'admin_bp',
    'login_required',
    'get_current_user',
    'get_optional_user',
    'admin_required',
    'is_admin',
]
