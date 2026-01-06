#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Contracts
번역 계약 계층
"""

from .i_translation_service import ITranslationService
from .d_translation_result import DTranslationResult
from .d_provider_attempt import DProviderAttempt

__all__ = ['ITranslationService', 'DTranslationResult', 'DProviderAttempt']
