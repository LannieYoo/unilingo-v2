#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CORS Handler Middleware
Handles Cross-Origin Resource Sharing configuration and validation
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import List


def init_cors(app: Flask, allowed_origins: List[str]):
    """
    Initialize CORS with origin validation
    
    Args:
        app: Flask application instance
        allowed_origins: List of allowed origin URLs
    """
    # Configure CORS
    CORS(
        app,
        origins=allowed_origins,
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allow_headers=['Content-Type', 'Authorization', 'X-Trace-Id'],
        expose_headers=['X-Trace-Id', 'Retry-After'],
        supports_credentials=True,
        max_age=3600  # Cache preflight requests for 1 hour
    )
    
    @app.before_request
    def validate_cors_origin():
        """Validate request origin against allowed origins"""
        origin = request.headers.get('Origin')
        
        # Skip validation for same-origin requests (no Origin header)
        if not origin:
            return None
        
        # Check if origin is allowed
        if origin not in allowed_origins:
            return jsonify({
                'error': {
                    'code': 'CORS_ERROR',
                    'message': f'Origin {origin} is not allowed',
                    'trace_id': request.headers.get('X-Trace-Id', 'unknown')
                }
            }), 403
        
        return None
