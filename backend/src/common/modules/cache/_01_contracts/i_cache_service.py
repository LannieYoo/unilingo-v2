#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cache Service Interface
캐시 서비스 인터페이스
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, Dict


class ICacheService(ABC):
    """캐시 서비스 인터페이스"""
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """캐시된 값 조회"""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """캐시에 값 저장"""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """캐시된 값 삭제"""
        pass
    
    @abstractmethod
    def clear(self) -> None:
        """모든 캐시 삭제"""
        pass
    
    @abstractmethod
    def generate_key(self, prefix: str, **kwargs) -> str:
        """캐시 키 생성"""
        pass
    
    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """캐시 통계 조회"""
        pass
