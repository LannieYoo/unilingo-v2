#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exception Module
예외 처리 모듈
"""

from ._01_contracts import (
    IException,
    EExceptionLevel,
    DExceptionContext,
)
from ._08_utils import (
    ValidationError,
    TranslationError,
    DictionaryError,
    STTError,
    CacheError,
    ConfigError,
)

# Alias for backward compatibility
ICustomException = IException

__all__ = [
    # Contracts
    'IException',
    'ICustomException',
    'EExceptionLevel',
    'DExceptionContext',
    # Exceptions
    'ValidationError',
    'TranslationError',
    'DictionaryError',
    'STTError',
    'CacheError',
    'ConfigError',
]
