#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CORS Handler Middleware
CORS 설정 및 검증 미들웨어
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import List


def init_cors(app: Flask, allowed_origins: List[str]):
    """
    CORS 초기화
    
    Args:
        app: Flask 애플리케이션 인스턴스
        allowed_origins: 허용된 오리진 URL 목록
    """
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
        """요청 오리진 검증"""
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
