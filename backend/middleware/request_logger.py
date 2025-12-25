#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Request Logger Middleware
Logs all incoming requests and outgoing responses
"""

import time
import uuid
import sys
from pathlib import Path
from flask import Flask, request, g
from functools import wraps

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.common.modules.logger import logging_service


def get_or_create_trace_id() -> str:
    """
    Get trace_id from request header or create new one
    
    Returns:
        trace_id string
    """
    trace_id = request.headers.get('X-Trace-Id')
    if not trace_id:
        trace_id = str(uuid.uuid4())
    return trace_id


def init_request_logger(app: Flask):
    """
    Initialize request logging middleware
    
    Args:
        app: Flask application instance
    """
    
    @app.before_request
    def before_request():
        """Log request start and store trace_id"""
        g.trace_id = get_or_create_trace_id()
        g.start_time = time.time()
        
        # Log request start
        logging_service.create_log(
            source="backend",
            level="INFO",
            message=f"Request started: {request.method} {request.path}",
            module=__name__,
            function="before_request",
            trace_id=g.trace_id,
            request_path=request.path,
            request_method=request.method,
            extra_data={
                "remote_addr": request.remote_addr,
                "user_agent": request.headers.get('User-Agent', 'unknown')
            }
        )
    
    @app.after_request
    def after_request(response):
        """Log request completion"""
        if hasattr(g, 'trace_id') and hasattr(g, 'start_time'):
            duration_ms = (time.time() - g.start_time) * 1000
            
            # Add trace_id to response headers
            response.headers['X-Trace-Id'] = g.trace_id
            
            # Log request completion
            logging_service.create_log(
                source="backend",
                level="INFO",
                message=f"Request completed: {request.method} {request.path}",
                module=__name__,
                function="after_request",
                trace_id=g.trace_id,
                request_path=request.path,
                request_method=request.method,
                response_status=response.status_code,
                extra_data={
                    "duration_ms": round(duration_ms, 2),
                    "remote_addr": request.remote_addr
                }
            )
        
        return response
