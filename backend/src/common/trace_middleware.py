#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trace ID Middleware
Generates or extracts trace IDs for request correlation
"""

import uuid
from flask import Flask, g, request, Response


def setup_trace_middleware(app: Flask) -> None:
    """
    Register trace ID middleware with Flask app
    
    This middleware ensures every request has a unique trace_id that can be used
    to correlate logs and errors across frontend and backend.
    """
    
    @app.before_request
    def before_request_trace() -> None:
        """
        Extract or generate trace_id and store in g.trace_id
        
        Priority:
        1. Use x-trace-id header from client if provided
        2. Generate new UUID v4 if not provided
        """
        try:
            # Check if client provided trace_id
            client_trace_id = request.headers.get('x-trace-id')
            
            if client_trace_id:
                # Validate UUID format
                try:
                    uuid.UUID(client_trace_id)
                    g.trace_id = client_trace_id
                except ValueError:
                    # Invalid UUID format, generate new one
                    g.trace_id = str(uuid.uuid4())
            else:
                # Generate new trace_id
                g.trace_id = str(uuid.uuid4())
        except Exception:
            # Fallback to error trace if something goes wrong
            g.trace_id = "ERROR_TRACE"
    
    @app.after_request
    def after_request_trace(response: Response) -> Response:
        """
        Add x-trace-id header to response
        
        This allows the client to correlate their request with backend logs.
        """
        try:
            # Get trace_id from g, fallback to NO_TRACE if not set
            trace_id = getattr(g, 'trace_id', 'NO_TRACE')
            response.headers['x-trace-id'] = trace_id
        except Exception:
            # Ensure we always return a trace_id header
            response.headers['x-trace-id'] = 'ERROR_TRACE'
        
        return response


__all__ = ['setup_trace_middleware']
