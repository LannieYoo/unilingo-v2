#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Provider Attempt Data Contract
제공자 시도 데이터 계약
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DProviderAttempt:
    """번역 제공자 시도 정보"""
    provider_name: str
    success: bool
    response_time: float = 0.0
    timeout_used: float = 5.0
    error_message: Optional[str] = None
    
    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            'provider_name': self.provider_name,
            'success': self.success,
            'response_time': self.response_time,
            'timeout_used': self.timeout_used,
            'error_message': self.error_message
        }
