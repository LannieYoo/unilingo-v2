#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Usage Limit Middleware
Checks usage limits before processing translation and STT requests
"""

import logging
from flask import Flask, g, request, jsonify
from src.common.modules.usage.service import UsageService

logger = logging.getLogger(__name__)


def setup_usage_middleware(app: Flask) -> None:
    """
    Register usage limit middleware with Flask app
    
    This middleware checks if the user has exceeded their usage limit
    before processing translation or STT requests.
    """
    
    @app.before_request
    def check_usage_limit():
        """
        Check usage limit before processing translation or STT requests
        
        Returns:
            429 error if limit exceeded, None to continue processing
        """
        # Only check for translation and STT endpoints
        if not (request.path.startswith('/api/translation') or request.path.startswith('/api/stt')):
            return None
        
        # Skip for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return None
        
        # Get user from request context (set by @token_required decorator)
        user = getattr(g, 'user', None)
        if not user:
            # If no user, let the endpoint handle authentication
            return None
        
        user_id = user.get('id')
        user_level = user.get('user_level', 'guest')
        
        # Get trace_id for logging
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        
        # Extract character count from request
        # This is an estimate - actual count will be tracked after processing
        try:
            data = request.get_json(silent=True)
            if not data:
                return None
            
            # Estimate character count based on request type
            char_count = 0
            
            if request.path.startswith('/api/translation'):
                # For translation, count source text characters
                source_text = data.get('text', '')
                char_count = len(source_text)
            elif request.path.startswith('/api/stt'):
                # For STT, we can't know the character count before processing
                # So we'll skip pre-check for STT and only track after processing
                return None
            
            if char_count == 0:
                return None
            
            # Check if user can process this request
            can_proceed, error_message = UsageService.check_limit(user_id, user_level, char_count)
            
            if not can_proceed:
                logger.warning(f"Usage limit exceeded: user_id={user_id}, level={user_level}, chars={char_count}, trace_id={trace_id}")
                
                # Get current usage for detailed error message
                usage = UsageService.get_current_usage(user_id, user_level)
                
                return jsonify({
                    'error': {
                        'code': 'USAGE_LIMIT_EXCEEDED',
                        'message': 'Monthly usage limit exceeded',
                        'details': {
                            'current_usage': usage['total_chars'],
                            'limit': usage['limit'],
                            'requested': char_count,
                            'user_level': user_level
                        },
                        'trace_id': trace_id
                    }
                }), 429
            
            # Store estimated char_count in g for later tracking
            g.estimated_char_count = char_count
            
        except Exception as e:
            # Log error but don't block request
            logger.error(f"Error in usage middleware: {e}, trace_id={trace_id}")
            return None
        
        return None


__all__ = ['setup_usage_middleware']
