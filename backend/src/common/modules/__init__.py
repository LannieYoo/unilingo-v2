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

__all__ = [
    # Middleware
    'init_cors',
    'init_request_logger',
    'init_error_handler',
    'init_rate_limiter',
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
]
