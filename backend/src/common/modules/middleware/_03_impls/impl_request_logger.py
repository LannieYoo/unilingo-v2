#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Request Logger Middleware
요청/응답 로깅 미들웨어
"""

import time
import uuid
import logging
from flask import Flask, request, g

logger = logging.getLogger(__name__)


def get_or_create_trace_id() -> str:
    """trace_id 조회 또는 생성"""
    trace_id = request.headers.get('X-Trace-Id')
    if not trace_id:
        trace_id = str(uuid.uuid4())
    return trace_id


def init_request_logger(app: Flask):
    """
    요청 로깅 미들웨어 초기화
    
    Args:
        app: Flask 애플리케이션 인스턴스
    """
    
    @app.before_request
    def before_request():
        """요청 시작 로깅"""
        g.trace_id = get_or_create_trace_id()
        g.start_time = time.time()
        
        logger.info(
            f"Request started: {request.method} {request.path}, "
            f"trace_id: {g.trace_id}, "
            f"remote_addr: {request.remote_addr}"
        )
    
    @app.after_request
    def after_request(response):
        """요청 완료 로깅"""
        if hasattr(g, 'trace_id') and hasattr(g, 'start_time'):
            duration_ms = (time.time() - g.start_time) * 1000
            
            response.headers['X-Trace-Id'] = g.trace_id
            
            logger.info(
                f"Request completed: {request.method} {request.path}, "
                f"status: {response.status_code}, "
                f"duration: {round(duration_ms, 2)}ms, "
                f"trace_id: {g.trace_id}"
            )
        
        return response
