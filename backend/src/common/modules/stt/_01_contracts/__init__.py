#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT Contracts
음성인식 계약 계층
"""

from .i_stt_service import ISTTService
from .d_stt_result import DSTTResult
from .d_dependency_status import DDependencyStatus

__all__ = ['ISTTService', 'DSTTResult', 'DDependencyStatus']
