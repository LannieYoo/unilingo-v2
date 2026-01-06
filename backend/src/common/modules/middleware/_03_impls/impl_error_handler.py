#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Handler Middleware
에러 처리 미들웨어
"""

import logging
from flask import Flask, request, jsonify, g
from werkzeug.exceptions import HTTPException

from ...exception import ValidationError, TranslationError, DictionaryError, STTError

logger = logging.getLogger(__name__)


def get_trace_id() -> str:
    """trace_id 조회"""
    if hasattr(g, 'trace_id'):
        return g.trace_id
    return request.headers.get('X-Trace-Id', 'unknown')


def init_error_handler(app: Flask):
    """
    에러 핸들러 미들웨어 초기화
    
    Args:
        app: Flask 애플리케이션 인스턴스
    """
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        """400 Bad Request"""
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
        """404 Not Found"""
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
        """429 Too Many Requests"""
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
        """500 Internal Server Error"""
        trace_id = get_trace_id()
        
        logger.error(
            f"Internal error: {error}, "
            f"path: {request.path if request else 'unknown'}, "
            f"trace_id: {trace_id}"
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
        """503 Service Unavailable"""
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
        """HTTP 예외 처리"""
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
        """예상치 못한 에러 처리"""
        trace_id = get_trace_id()
        
        logger.error(
            f"Unexpected error: {error}, "
            f"type: {type(error).__name__}, "
            f"path: {request.path if request else 'unknown'}, "
            f"trace_id: {trace_id}",
            exc_info=True
        )
        
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred.',
                'trace_id': trace_id
            }
        }), 500
