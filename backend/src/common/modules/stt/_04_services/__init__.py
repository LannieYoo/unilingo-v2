#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT Services
음성인식 서비스 계층
"""

from .service_stt import STTService, get_stt_service, get_dependency_status

__all__ = ['STTService', 'get_stt_service', 'get_dependency_status']
