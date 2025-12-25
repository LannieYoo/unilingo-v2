#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rate Limiter Middleware
Limits API request rates per IP address using sliding window algorithm
"""

import time
import threading
from typing import Dict, Tuple, Optional
from flask import Flask, request, jsonify, g
from functools import wraps


class RateLimiter:
    """
    Rate limiter using sliding window algorithm
    
    Tracks request counts per IP address and endpoint
    """
    
    def __init__(self):
        """Initialize rate limiter"""
        # Structure: {ip: {endpoint: [(timestamp, count)]}}
        self._requests: Dict[str, Dict[str, list]] = {}
        self._lock = threading.Lock()
        self._limits: Dict[str, Tuple[int, int]] = {}  # {endpoint: (limit, window_seconds)}
        
        # Start cleanup thread
        self._cleanup_thread = threading.Thread(target=self._periodic_cleanup, daemon=True)
        self._cleanup_thread.start()
    
    def configure_limit(self, endpoint_pattern: str, limit_str: str):
        """
        Configure rate limit for an endpoint
        
        Args:
            endpoint_pattern: Endpoint pattern (e.g., '/api/translate', '/api/dictionary/*')
            limit_str: Limit string (e.g., '100/hour', '10/minute')
        """
        # Parse limit string
        parts = limit_str.split('/')
        if len(parts) != 2:
            raise ValueError(f"Invalid limit format: {limit_str}. Expected format: 'number/unit'")
        
        limit = int(parts[0])
        unit = parts[1].lower()
        
        # Convert to seconds
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
        Check if request is within rate limit
        
        Args:
            ip: Client IP address
            endpoint: Request endpoint
            
        Returns:
            (is_allowed, retry_after_seconds)
            - is_allowed: True if request is allowed, False if rate limit exceeded
            - retry_after_seconds: Seconds to wait before retry (None if allowed)
        """
        # Find matching limit
        limit_config = self._find_matching_limit(endpoint)
        if not limit_config:
            # No limit configured for this endpoint
            return True, None
        
        limit, window_seconds = limit_config
        current_time = time.time()
        
        with self._lock:
            # Initialize tracking for this IP if needed
            if ip not in self._requests:
                self._requests[ip] = {}
            
            if endpoint not in self._requests[ip]:
                self._requests[ip][endpoint] = []
            
            # Clean up old requests outside the window
            window_start = current_time - window_seconds
            self._requests[ip][endpoint] = [
                (ts, count) for ts, count in self._requests[ip][endpoint]
                if ts > window_start
            ]
            
            # Count requests in current window
            request_count = sum(count for ts, count in self._requests[ip][endpoint])
            
            if request_count >= limit:
                # Rate limit exceeded
                # Calculate retry_after based on oldest request in window
                if self._requests[ip][endpoint]:
                    oldest_ts = self._requests[ip][endpoint][0][0]
                    retry_after = int(oldest_ts + window_seconds - current_time) + 1
                else:
                    retry_after = int(window_seconds)
                
                return False, retry_after
            
            # Add current request
            self._requests[ip][endpoint].append((current_time, 1))
            return True, None
    
    def _find_matching_limit(self, endpoint: str) -> Optional[Tuple[int, int]]:
        """
        Find matching rate limit configuration for endpoint
        
        Args:
            endpoint: Request endpoint
            
        Returns:
            (limit, window_seconds) or None if no match
        """
        # Exact match first
        if endpoint in self._limits:
            return self._limits[endpoint]
        
        # Pattern matching (e.g., '/api/dictionary/*' matches '/api/dictionary/search')
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
    
    def _periodic_cleanup(self):
        """Periodically clean up old request tracking data"""
        while True:
            time.sleep(300)  # Clean up every 5 minutes
            self._cleanup_old_data()
    
    def _cleanup_old_data(self):
        """Remove old request tracking data"""
        with self._lock:
            current_time = time.time()
            
            # Find maximum window size
            max_window = max(
                (window for limit, window in self._limits.values()),
                default=3600
            )
            
            cutoff_time = current_time - max_window
            
            # Clean up old data
            ips_to_remove = []
            for ip, endpoints in self._requests.items():
                endpoints_to_remove = []
                
                for endpoint, requests in endpoints.items():
                    # Remove old requests
                    endpoints[endpoint] = [
                        (ts, count) for ts, count in requests
                        if ts > cutoff_time
                    ]
                    
                    # Mark empty endpoints for removal
                    if not endpoints[endpoint]:
                        endpoints_to_remove.append(endpoint)
                
                # Remove empty endpoints
                for endpoint in endpoints_to_remove:
                    del endpoints[endpoint]
                
                # Mark empty IPs for removal
                if not endpoints:
                    ips_to_remove.append(ip)
            
            # Remove empty IPs
            for ip in ips_to_remove:
                del self._requests[ip]


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get or create global rate limiter instance"""
    global _rate_limiter
    
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    
    return _rate_limiter


def init_rate_limiter(app: Flask):
    """
    Initialize rate limiter middleware
    
    Args:
        app: Flask application instance
    """
    limiter = get_rate_limiter()
    
    # Configure limits from app config
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
        """Check rate limit before processing request"""
        # Skip rate limiting for health check and root endpoint
        if request.path in ['/', '/api/health']:
            return None
        
        # Get client IP
        ip = request.remote_addr
        if not ip:
            ip = request.headers.get('X-Forwarded-For', 'unknown').split(',')[0].strip()
        
        # Check rate limit
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
    Decorator for rate limiting specific routes
    
    Args:
        limit_str: Limit string (e.g., '10/minute')
        
    Example:
        @app.route('/api/special')
        @rate_limit('5/minute')
        def special_endpoint():
            return {'message': 'success'}
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            limiter = get_rate_limiter()
            
            # Get client IP
            ip = request.remote_addr
            if not ip:
                ip = request.headers.get('X-Forwarded-For', 'unknown').split(',')[0].strip()
            
            # Parse limit
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
            
            # Temporarily configure limit for this endpoint
            endpoint = request.path
            limiter._limits[endpoint] = (limit, window_seconds)
            
            # Check rate limit
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
