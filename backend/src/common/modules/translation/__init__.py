#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Module
번역 모듈
"""

from ._01_contracts import ITranslationService, DTranslationResult
from ._04_services import TranslationService, get_translation_service
from ._05_dtos import TranslateRequest, TranslateResponse
from ._07_router import router as translation_bp

__all__ = [
    # Contracts
    'ITranslationService',
    'DTranslationResult',
    # Services
    'TranslationService',
    'get_translation_service',
    # DTOs
    'TranslateRequest',
    'TranslateResponse',
    # Router
    'translation_bp',
]
