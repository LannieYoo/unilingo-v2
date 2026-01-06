#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rate Limiter Middleware Implementation
슬라이딩 윈도우 알고리즘을 사용한 IP별 API 요청 제한
"""

import time
import threading
from typing import Dict, Tuple, Optional
from functools import wraps
from flask import Flask, request, jsonify, g


class RateLimiter:
    """
    슬라이딩 윈도우 알고리즘 기반 Rate Limiter
    IP 주소 및 엔드포인트별 요청 수 추적
    """
    
    def __init__(self):
        """Rate limiter 초기화"""
        self._requests: Dict[str, Dict[str, list]] = {}
        self._lock = threading.Lock()
        self._limits: Dict[str, Tuple[int, int]] = {}
        
        # 정리 스레드 시작
        self._cleanup_thread = threading.Thread(target=self._periodic_cleanup, daemon=True)
        self._cleanup_thread.start()
    
    def configure_limit(self, endpoint_pattern: str, limit_str: str) -> None:
        """
        엔드포인트에 대한 rate limit 설정
        
        Args:
            endpoint_pattern: 엔드포인트 패턴 (예: '/api/translate', '/api/dictionary/*')
            limit_str: 제한 문자열 (예: '100/hour', '10/minute')
        """
        parts = limit_str.split('/')
        if len(parts) != 2:
            raise ValueError(f"Invalid limit format: {limit_str}. Expected format: 'number/unit'")
        
        limit = int(parts[0])
        unit = parts[1].lower()
        
        unit_seconds = {
            'second': 1,
            'minute': 60,
            'hour': 3600,
            'day': 86400
        }
        
        if unit not in unit_seconds:
            raise ValueError(f"Invalid time unit: {unit}. Must be one of: second, minute, hour, day")
        
        window_seconds = unit_seconds[unit]
        self._limits[endpoint_pattern] = (limit, window_seconds)
    
    def check_rate_limit(self, ip: str, endpoint: str) -> Tuple[bool, Optional[int]]:
        """
        요청이 rate limit 내에 있는지 확인
        
        Args:
            ip: 클라이언트 IP 주소
            endpoint: 요청 엔드포인트
            
        Returns:
            (is_allowed, retry_after_seconds)
        """
        limit_config = self._find_matching_limit(endpoint)
        if not limit_config:
            return True, None
        
        limit, window_seconds = limit_config
        current_time = time.time()
        
        with self._lock:
            if ip not in self._requests:
                self._requests[ip] = {}
            
            if endpoint not in self._requests[ip]:
                self._requests[ip][endpoint] = []
            
            window_start = current_time - window_seconds
            self._requests[ip][endpoint] = [
                (ts, count) for ts, count in self._requests[ip][endpoint]
                if ts > window_start
            ]
            
            request_count = sum(count for ts, count in self._requests[ip][endpoint])
            
            if request_count >= limit:
                if self._requests[ip][endpoint]:
                    oldest_ts = self._requests[ip][endpoint][0][0]
                    retry_after = int(oldest_ts + window_seconds - current_time) + 1
                else:
                    retry_after = int(window_seconds)
                
                return False, retry_after
            
            self._requests[ip][endpoint].append((current_time, 1))
            return True, None
    
    def _find_matching_limit(self, endpoint: str) -> Optional[Tuple[int, int]]:
        """엔드포인트에 매칭되는 rate limit 설정 찾기"""
        if endpoint in self._limits:
            return self._limits[endpoint]
        
        for pattern, limit_config in self._limits.items():
            if pattern.endswith('/*'):
                prefix = pattern[:-2]
                if endpoint.startswith(prefix):
                    return limit_config
            elif pattern.endswith('*'):
                prefix = pattern[:-1]
                if endpoint.startswith(prefix):
                    return limit_config
        
        return None
    
    def _periodic_cleanup(self) -> None:
        """주기적으로 오래된 요청 추적 데이터 정리"""
        while True:
            time.sleep(300)
            self._cleanup_old_data()
    
    def _cleanup_old_data(self) -> None:
        """오래된 요청 추적 데이터 제거"""
        with self._lock:
            current_time = time.time()
            
            max_window = max(
                (window for limit, window in self._limits.values()),
                default=3600
            )
            
            cutoff_time = current_time - max_window
            
            ips_to_remove = []
            for ip, endpoints in self._requests.items():
                endpoints_to_remove = []
                
                for endpoint, requests in endpoints.items():
                    endpoints[endpoint] = [
                        (ts, count) for ts, count in requests
                        if ts > cutoff_time
                    ]
                    
                    if not endpoints[endpoint]:
                        endpoints_to_remove.append(endpoint)
                
                for endpoint in endpoints_to_remove:
                    del endpoints[endpoint]
                
                if not endpoints:
                    ips_to_remove.append(ip)
            
            for ip in ips_to_remove:
                del self._requests[ip]


# 전역 rate limiter 인스턴스
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """전역 rate limiter 인스턴스 가져오기 또는 생성"""
    global _rate_limiter
    
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    
    return _rate_limiter


def init_rate_limiter(app: Flask) -> None:
    """
    Rate limiter 미들웨어 초기화
    
    Args:
        app: Flask 애플리케이션 인스턴스
    """
    limiter = get_rate_limiter()
    
    if app.config.get('RATE_LIMIT_TRANSLATION'):
        limiter.configure_limit('/api/translate', app.config['RATE_LIMIT_TRANSLATION'])
    
    if app.config.get('RATE_LIMIT_DICTIONARY'):
        limiter.configure_limit('/api/dictionary/*', app.config['RATE_LIMIT_DICTIONARY'])
    
    if app.config.get('RATE_LIMIT_AUTOCOMPLETE'):
        limiter.configure_limit('/api/dictionary/autocomplete', app.config['RATE_LIMIT_AUTOCOMPLETE'])
    
    if app.config.get('RATE_LIMIT_STT'):
        limiter.configure_limit('/api/stt/*', app.config['RATE_LIMIT_STT'])
    
    @app.before_request
    def check_rate_limit():
        """요청 처리 전 rate limit 확인"""
        if request.path in ['/', '/api/health']:
            return None
        
        ip = request.remote_addr
        if not ip:
            ip = request.headers.get('X-Forwarded-For', 'unknown').split(',')[0].strip()
        
        is_allowed, retry_after = limiter.check_rate_limit(ip, request.path)
        
        if not is_allowed:
            trace_id = g.get('trace_id', 'unknown')
            
            response = jsonify({
                'error': {
                    'code': 'RATE_LIMIT_EXCEEDED',
                    'message': 'Too many requests. Please try again later.',
                    'trace_id': trace_id
                }
            })
            response.status_code = 429
            
            if retry_after:
                response.headers['Retry-After'] = str(retry_after)
            
            return response
        
        return None


def rate_limit(limit_str: str):
    """
    특정 라우트에 대한 rate limiting 데코레이터
    
    Args:
        limit_str: 제한 문자열 (예: '10/minute')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            limiter = get_rate_limiter()
            
            ip = request.remote_addr
            if not ip:
                ip = request.headers.get('X-Forwarded-For', 'unknown').split(',')[0].strip()
            
            parts = limit_str.split('/')
            limit = int(parts[0])
            unit = parts[1].lower()
            
            unit_seconds = {
                'second': 1,
                'minute': 60,
                'hour': 3600,
                'day': 86400
            }
            window_seconds = unit_seconds[unit]
            
            endpoint = request.path
            limiter._limits[endpoint] = (limit, window_seconds)
            
            is_allowed, retry_after = limiter.check_rate_limit(ip, endpoint)
            
            if not is_allowed:
                trace_id = g.get('trace_id', 'unknown')
                
                response = jsonify({
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': 'Too many requests. Please try again later.',
                        'trace_id': trace_id
                    }
                })
                response.status_code = 429
                
                if retry_after:
                    response.headers['Retry-After'] = str(retry_after)
                
                return response
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator
