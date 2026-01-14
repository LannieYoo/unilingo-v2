#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary Module - 사전 모듈

from .service import DictionaryService, get_dictionary_service
from .router import router as dictionary_bp

__all__ = [
    'DictionaryService',
    'get_dictionary_service',
    'dictionary_bp',
]
