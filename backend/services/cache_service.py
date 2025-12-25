#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cache Service
In-memory caching with TTL-based expiration
"""

import time
import hashlib
import threading
from typing import Any, Optional, Dict
from datetime import datetime


class CacheService:
    """
    In-memory cache service with TTL-based expiration
    
    Thread-safe implementation using locks
    """
    
    def __init__(self, default_ttl: int = 3600, cleanup_interval: int = 300):
        """
        Initialize cache service
        
        Args:
            default_ttl: Default time-to-live in seconds (default: 1 hour)
            cleanup_interval: Interval for automatic cleanup in seconds (default: 5 minutes)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl
        self._cleanup_interval = cleanup_interval
        
        # Start cleanup thread
        self._cleanup_thread = threading.Thread(target=self._periodic_cleanup, daemon=True)
        self._cleanup_thread.start()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get cached value by key
        
        Args:
            key: Cache key
            
        Returns:
            Cached value if exists and not expired, None otherwise
        """
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            
            # Check if expired
            if entry['expires_at'] < time.time():
                del self._cache[key]
                return None
            
            # Update access time
            entry['accessed_at'] = time.time()
            return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Set cached value with optional TTL
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
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
        """
        Delete cached value
        
        Args:
            key: Cache key
            
        Returns:
            True if key existed and was deleted, False otherwise
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self):
        """Clear all cached values"""
        with self._lock:
            self._cache.clear()
    
    def generate_key(self, prefix: str, **kwargs) -> str:
        """
        Generate cache key from parameters
        
        Args:
            prefix: Key prefix (e.g., 'translate', 'dict', 'autocomplete')
            **kwargs: Key-value pairs to include in key
            
        Returns:
            Generated cache key
            
        Example:
            generate_key('translate', source='en', target='ko', text='hello')
            -> 'translate:en:ko:5d41402abc4b2a76b9719d911017c592'
        """
        # Sort kwargs for consistent key generation
        sorted_items = sorted(kwargs.items())
        
        # Create string representation
        params_str = ':'.join(f"{k}={v}" for k, v in sorted_items)
        
        # Hash long values to keep key size manageable
        if len(params_str) > 100:
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            return f"{prefix}:{params_hash}"
        
        return f"{prefix}:{params_str}"
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        
        Returns:
            Dictionary with cache statistics
        """
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
    
    def _periodic_cleanup(self):
        """Periodically clean up expired entries (runs in background thread)"""
        while True:
            time.sleep(self._cleanup_interval)
            self._cleanup_expired()
    
    def _cleanup_expired(self):
        """Remove expired entries from cache"""
        with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry['expires_at'] < current_time
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                print(f"[Cache] Cleaned up {len(expired_keys)} expired entries")


# Global cache instance
_cache_instance: Optional[CacheService] = None


def get_cache_service(
    default_ttl: int = 3600,
    cleanup_interval: int = 300
) -> CacheService:
    """
    Get or create global cache service instance
    
    Args:
        default_ttl: Default time-to-live in seconds
        cleanup_interval: Cleanup interval in seconds
        
    Returns:
        CacheService instance
    """
    global _cache_instance
    
    if _cache_instance is None:
        _cache_instance = CacheService(
            default_ttl=default_ttl,
            cleanup_interval=cleanup_interval
        )
    
    return _cache_instance
