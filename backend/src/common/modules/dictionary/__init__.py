#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary Module
사전 모듈
"""

from ._01_contracts import IDictionaryService
from ._04_services import DictionaryService, get_dictionary_service
from ._07_router import router as dictionary_bp

__all__ = [
    'IDictionaryService',
    'DictionaryService',
    'get_dictionary_service',
    'dictionary_bp',
]
