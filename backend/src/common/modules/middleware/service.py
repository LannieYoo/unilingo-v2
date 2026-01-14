#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Middleware Service - CORS, 로깅, 에러 핸들링, Rate Limiting

import os
import sys
import json
import time
import uuid
import logging
import threading
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from typing import Dict, Tuple, Optional, List
from functools import wraps
from flask import Flask, request, jsonify, g, has_request_context
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from ..exception import ValidationError, TranslationError, DictionaryError, STTError


# ============================================================
# Logging Configuration
# ============================================================

class JSONFormatter(logging.Formatter):
    """JSON 형식 로그 포매터"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'backend',
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.name,
            'function': record.funcName,
            'line': record.lineno,
            'trace_id': None,
            'user_id': None,
        }
        
        if has_request_context():
            log_data['trace_id'] = getattr(g, 'trace_id', None)
            log_data['user_id'] = getattr(g, 'user_id', None)
            log_data['request_path'] = request.path
            log_data['request_method'] = request.method
            log_data['remote_addr'] = request.remote_addr
        
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        if hasattr(record, 'extra_data'):
            log_data['extra_data'] = record.extra_data
        
        return json.dumps(log_data, ensure_ascii=False, default=str)


class ConsoleFormatter(logging.Formatter):
    """콘솔용 컬러 포매터"""
    
    COLORS = {
        'DEBUG': '\033[36m',
        'INFO': '\033[32m',
        'WARNING': '\033[33m',
        'ERROR': '\033[31m',
        'CRITICAL': '\033[35m',
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        trace_id = ''
        if has_request_context():
            tid = getattr(g, 'trace_id', None)
            if tid:
                trace_id = f" [{tid[:8]}]"
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return f"{color}{timestamp} - {record.levelname:8}{self.RESET}{trace_id} - {record.getMessage()}"


def init_logging(app: Flask):
    """로깅 시스템 초기화"""
    log_dir = Path(app.config.get('LOG_DIR', '../logs'))
    if not log_dir.is_absolute():
        log_dir = Path(__file__).parent.parent.parent.parent.parent / log_dir.name
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO').upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(ConsoleFormatter())
    root_logger.addHandler(console_handler)
    
    app_log_file = log_dir / 'application_logs.log'
    app_file_handler = RotatingFileHandler(
        filename=str(app_log_file),
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        encoding='utf-8'
    )
    app_file_handler.setLevel(log_level)
    app_file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(app_file_handler)
    
    error_log_file = log_dir / 'application_exceptions.log'
    error_file_handler = RotatingFileHandler(
        filename=str(error_log_file),
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        encoding='utf-8'
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(error_file_handler)
    
    daily_log_file = log_dir / 'daily.log'
    daily_file_handler = TimedRotatingFileHandler(
        filename=str(daily_log_file),
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    daily_file_handler.setLevel(log_level)
    daily_file_handler.setFormatter(JSONFormatter())
    daily_file_handler.suffix = '%Y-%m-%d'
    root_logger.addHandler(daily_file_handler)
    
    app.logger.handlers.clear()
    app.logger.setLevel(log_level)
    app.logger.propagate = True
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    
    root_logger.info(f"Logging initialized: level={app.config.get('LOG_LEVEL', 'INFO')}, log_dir={log_dir}")


def get_logger(name: str) -> logging.Logger:
    """모듈별 로거 가져오기"""
    return logging.getLogger(name)


# ============================================================
# CORS Handler
# ============================================================

def init_cors(app: Flask, allowed_origins: List[str]):
    """CORS 초기화"""
    CORS(
        app,
        origins=allowed_origins,
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allow_headers=['Content-Type', 'Authorization', 'X-Trace-Id'],
        expose_headers=['X-Trace-Id', 'Retry-After'],
        supports_credentials=True,
        max_age=3600
    )
    
    @app.before_request
    def validate_cors_origin():
        origin = request.headers.get('Origin')
        if not origin:
            return None
        if origin not in allowed_origins:
            return jsonify({
                'error': {
                    'code': 'CORS_ERROR',
                    'message': f'Origin {origin} is not allowed',
                    'trace_id': request.headers.get('X-Trace-Id', 'unknown')
                }
            }), 403
        return None


# ============================================================
# Request Logger
# ============================================================

logger = logging.getLogger(__name__)


def get_or_create_trace_id() -> str:
    """trace_id 조회 또는 생성"""
    trace_id = request.headers.get('X-Trace-Id')
    if not trace_id:
        trace_id = str(uuid.uuid4())
    return trace_id


def init_request_logger(app: Flask):
    """요청 로깅 미들웨어 초기화"""
    
    @app.before_request
    def before_request():
        g.trace_id = get_or_create_trace_id()
        g.start_time = time.time()
        logger.info(
            f"Request started: {request.method} {request.path}, "
            f"trace_id: {g.trace_id}, remote_addr: {request.remote_addr}"
        )
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'trace_id') and hasattr(g, 'start_time'):
            duration_ms = (time.time() - g.start_time) * 1000
            response.headers['X-Trace-Id'] = g.trace_id
            logger.info(
                f"Request completed: {request.method} {request.path}, "
                f"status: {response.status_code}, duration: {round(duration_ms, 2)}ms, "
                f"trace_id: {g.trace_id}"
            )
        return response


# ============================================================
# Error Handler
# ============================================================

def get_trace_id() -> str:
    """trace_id 조회"""
    if hasattr(g, 'trace_id'):
        return g.trace_id
    return request.headers.get('X-Trace-Id', 'unknown')


def init_error_handler(app: Flask):
    """에러 핸들러 미들웨어 초기화"""
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        trace_id = get_trace_id()
        return jsonify({
            'error': {
                'code': 'BAD_REQUEST',
                'message': str(error.description) if hasattr(error, 'description') else 'Invalid request',
                'trace_id': trace_id
            }
        }), 400
    
    @app.errorhandler(404)
    def handle_not_found(error):
        trace_id = get_trace_id()
        return jsonify({
            'error': {
                'code': 'NOT_FOUND',
                'message': f'Resource not found: {request.path}',
                'trace_id': trace_id
            }
        }), 404
    
    @app.errorhandler(429)
    def handle_rate_limit(error):
        trace_id = get_trace_id()
        return jsonify({
            'error': {
                'code': 'RATE_LIMIT_EXCEEDED',
                'message': 'Too many requests. Please try again later.',
                'trace_id': trace_id
            }
        }), 429
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        trace_id = get_trace_id()
        logger.error(
            f"Internal error: {error}, path: {request.path if request else 'unknown'}, trace_id: {trace_id}"
        )
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An internal server error occurred.',
                'trace_id': trace_id
            }
        }), 500
    
    @app.errorhandler(503)
    def handle_service_unavailable(error):
        trace_id = get_trace_id()
        return jsonify({
            'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': str(error.description) if hasattr(error, 'description') else 'Service unavailable',
                'trace_id': trace_id
            }
        }), 503
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        trace_id = get_trace_id()
        return jsonify({
            'error': {
                'code': error.name.upper().replace(' ', '_'),
                'message': error.description,
                'trace_id': trace_id
            }
        }), error.code
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        trace_id = get_trace_id()
        logger.error(
            f"Unexpected error: {error}, type: {type(error).__name__}, "
            f"path: {request.path if request else 'unknown'}, trace_id: {trace_id}",
            exc_info=True
        )
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred.',
                'trace_id': trace_id
            }
        }), 500


# ============================================================
# Rate Limiter
# ============================================================

class RateLimiter:
    """슬라이딩 윈도우 알고리즘 기반 Rate Limiter"""
    
    def __init__(self):
        self._requests: Dict[str, Dict[str, list]] = {}
        self._lock = threading.Lock()
        self._limits: Dict[str, Tuple[int, int]] = {}
        self._cleanup_thread = threading.Thread(target=self._periodic_cleanup, daemon=True)
        self._cleanup_thread.start()
    
    def configure_limit(self, endpoint_pattern: str, limit_str: str) -> None:
        """엔드포인트에 대한 rate limit 설정"""
        parts = limit_str.split('/')
        if len(parts) != 2:
            raise ValueError(f"Invalid limit format: {limit_str}")
        
        limit = int(parts[0])
        unit = parts[1].lower()
        unit_seconds = {'second': 1, 'minute': 60, 'hour': 3600, 'day': 86400}
        
        if unit not in unit_seconds:
            raise ValueError(f"Invalid time unit: {unit}")
        
        self._limits[endpoint_pattern] = (limit, unit_seconds[unit])
    
    def check_rate_limit(self, ip: str, endpoint: str) -> Tuple[bool, Optional[int]]:
        """요청이 rate limit 내에 있는지 확인"""
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
                (ts, count) for ts, count in self._requests[ip][endpoint] if ts > window_start
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
        if endpoint in self._limits:
            return self._limits[endpoint]
        for pattern, limit_config in self._limits.items():
            if pattern.endswith('/*') or pattern.endswith('*'):
                prefix = pattern.rstrip('/*')
                if endpoint.startswith(prefix):
                    return limit_config
        return None
    
    def _periodic_cleanup(self) -> None:
        while True:
            time.sleep(300)
            self._cleanup_old_data()
    
    def _cleanup_old_data(self) -> None:
        with self._lock:
            current_time = time.time()
            max_window = max((window for limit, window in self._limits.values()), default=3600)
            cutoff_time = current_time - max_window
            
            ips_to_remove = []
            for ip, endpoints in self._requests.items():
                endpoints_to_remove = []
                for endpoint, requests in endpoints.items():
                    endpoints[endpoint] = [(ts, count) for ts, count in requests if ts > cutoff_time]
                    if not endpoints[endpoint]:
                        endpoints_to_remove.append(endpoint)
                for endpoint in endpoints_to_remove:
                    del endpoints[endpoint]
                if not endpoints:
                    ips_to_remove.append(ip)
            for ip in ips_to_remove:
                del self._requests[ip]


_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """전역 rate limiter 인스턴스 가져오기"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


def init_rate_limiter(app: Flask) -> None:
    """Rate limiter 미들웨어 초기화"""
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
    """특정 라우트에 대한 rate limiting 데코레이터"""
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
            unit_seconds = {'second': 1, 'minute': 60, 'hour': 3600, 'day': 86400}
            
            endpoint = request.path
            limiter._limits[endpoint] = (limit, unit_seconds[unit])
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


__all__ = [
    'init_cors',
    'init_request_logger',
    'init_error_handler',
    'init_rate_limiter',
    'init_logging',
    'get_logger',
    'rate_limit',
    'get_rate_limiter',
    'RateLimiter',
]
