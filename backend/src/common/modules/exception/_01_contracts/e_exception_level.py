#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exception Level Enum
예외 레벨 열거형
"""

from enum import Enum


class EExceptionLevel(str, Enum):
    """예외 심각도 레벨"""
    
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
