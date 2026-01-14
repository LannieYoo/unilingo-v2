#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# STT Module - 음성인식 모듈

from .service import STTService, get_stt_service, get_dependency_status
from .router import router as stt_bp

__all__ = [
    'STTService',
    'get_stt_service',
    'get_dependency_status',
    'stt_bp',
]
