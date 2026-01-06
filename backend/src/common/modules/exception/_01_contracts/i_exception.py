#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exception Interface
예외 인터페이스 정의
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class IException(ABC):
    """예외 서비스 인터페이스"""
    
    @abstractmethod
    def get_code(self) -> str:
        """예외 코드 반환"""
        pass
    
    @abstractmethod
    def get_message(self) -> str:
        """예외 메시지 반환"""
        pass
    
    @abstractmethod
    def get_details(self) -> Optional[Dict[str, Any]]:
        """예외 상세 정보 반환"""
        pass
