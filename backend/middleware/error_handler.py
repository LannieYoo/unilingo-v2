#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Handler Middleware
Catches and formats all errors consistently
"""

import sys
from pathlib import Path
from flask import Flask, request, jsonify, g
from werkzeug.exceptions import HTTPException

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.common.modules.exception import exception_service


def get_trace_id() -> str:
    """Get trace_id from Flask g object or request header"""
    if hasattr(g, 'trace_id'):
        return g.trace_id
    return request.headers.get('X-Trace-Id', 'unknown')


def init_error_handler(app: Flask):
    """
    Initialize global error handling
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        """Handle 400 Bad Request errors"""
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
        """Handle 404 Not Found errors"""
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
        """Handle 429 Too Many Requests errors"""
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
        """Handle 500 Internal Server Error"""
        trace_id = get_trace_id()
        
        # Log the exception
        exception_service.create_exception_from_exc(
            exc=error,
            source="backend",
            module=__name__,
            function="handle_internal_error",
            trace_id=trace_id,
            request_path=request.path if request else None,
            request_method=request.method if request else None
        )
        
        # Return generic error without internal details
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An internal server error occurred. Please try again later.',
                'trace_id': trace_id
            }
        }), 500
    
    @app.errorhandler(503)
    def handle_service_unavailable(error):
        """Handle 503 Service Unavailable errors"""
        trace_id = get_trace_id()
        
        return jsonify({
            'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': str(error.description) if hasattr(error, 'description') else 'Service temporarily unavailable',
                'trace_id': trace_id
            }
        }), 503
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle all other HTTP exceptions"""
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
        """Handle all unexpected errors"""
        trace_id = get_trace_id()
        
        # Log the exception with full details
        exception_service.create_exception_from_exc(
            exc=error,
            source="backend",
            module=__name__,
            function="handle_unexpected_error",
            trace_id=trace_id,
            request_path=request.path if request else None,
            request_method=request.method if request else None
        )
        
        # Return generic error without exposing internal details
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred. Please try again later.',
                'trace_id': trace_id
            }
        }), 500


class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class TranslationError(Exception):
    """Custom exception for translation errors"""
    pass


class DictionaryError(Exception):
    """Custom exception for dictionary errors"""
    pass


class STTError(Exception):
    """Custom exception for speech-to-text errors"""
    pass
