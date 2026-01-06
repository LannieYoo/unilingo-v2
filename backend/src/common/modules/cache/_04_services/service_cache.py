#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cache Service Implementation
캐시 서비스 구현
"""

import time
import hashlib
import threading
from typing import Any, Optional, Dict

from .._01_contracts import ICacheService


class CacheService(ICacheService):
    """
    인메모리 캐시 서비스 (TTL 기반 만료)
    스레드 안전 구현
    """
    
    def __init__(self, default_ttl: int = 3600, cleanup_interval: int = 300):
        """
        캐시 서비스 초기화
        
        Args:
            default_ttl: 기본 TTL (초, 기본값: 1시간)
            cleanup_interval: 자동 정리 간격 (초, 기본값: 5분)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl
        self._cleanup_interval = cleanup_interval
        
        # 정리 스레드 시작
        self._cleanup_thread = threading.Thread(
            target=self._periodic_cleanup,
            daemon=True
        )
        self._cleanup_thread.start()
    
    def get(self, key: str) -> Optional[Any]:
        """캐시된 값 조회"""
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            
            # 만료 확인
            if entry['expires_at'] < time.time():
                del self._cache[key]
                return None
            
            # 접근 시간 갱신
            entry['accessed_at'] = time.time()
            return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """캐시에 값 저장"""
        if ttl is None:
            ttl = self._default_ttl
        
        with self._lock:
            self._cache[key] = {
                'value': value,
                'created_at': time.time(),
                'accessed_at': time.time(),
                'expires_at': time.time() + ttl
            }
    
    def delete(self, key: str) -> bool:
        """캐시된 값 삭제"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """모든 캐시 삭제"""
        with self._lock:
            self._cache.clear()
    
    def generate_key(self, prefix: str, **kwargs) -> str:
        """캐시 키 생성"""
        sorted_items = sorted(kwargs.items())
        params_str = ':'.join(f"{k}={v}" for k, v in sorted_items)
        
        if len(params_str) > 100:
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            return f"{prefix}:{params_hash}"
        
        return f"{prefix}:{params_str}"
    
    def get_stats(self) -> Dict[str, Any]:
        """캐시 통계 조회"""
        with self._lock:
            total_entries = len(self._cache)
            expired_entries = sum(
                1 for entry in self._cache.values()
                if entry['expires_at'] < time.time()
            )
            
            return {
                'total_entries': total_entries,
                'active_entries': total_entries - expired_entries,
                'expired_entries': expired_entries
            }
    
    def _periodic_cleanup(self) -> None:
        """주기적 만료 항목 정리 (백그라운드 스레드)"""
        while True:
            time.sleep(self._cleanup_interval)
            self._cleanup_expired()
    
    def _cleanup_expired(self) -> None:
        """만료된 항목 제거"""
        with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry['expires_at'] < current_time
            ]
            
            for key in expired_keys:
                del self._cache[key]


# 전역 캐시 인스턴스
_cache_instance: Optional[CacheService] = None


def get_cache_service(
    default_ttl: int = 3600,
    cleanup_interval: int = 300
) -> CacheService:
    """전역 캐시 서비스 인스턴스 반환"""
    global _cache_instance
    
    if _cache_instance is None:
        _cache_instance = CacheService(
            default_ttl=default_ttl,
            cleanup_interval=cleanup_interval
        )
    
    return _cache_instance
