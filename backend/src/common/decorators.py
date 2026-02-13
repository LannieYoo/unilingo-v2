#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Decorators
Decorators for authorization and validation
"""

import logging
from functools import wraps
from flask import g, jsonify

logger = logging.getLogger(__name__)


def require_approval(f):
    """
    Decorator to check if user is approved before allowing access.
    Returns 403 if user is not approved.
    
    Usage:
        @router.route('/api/some-feature', methods=['POST'])
        @token_required
        @require_approval
        def some_feature():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = getattr(g, 'user', None) or getattr(g, 'current_user', None)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Authentication required'
                }
            }), 401
        
        # Admin users are always approved
        if user.get('user_level') == 'admin':
            return f(*args, **kwargs)
        
        # Check if user is approved
        if not user.get('is_approved', False):
            trace_id = getattr(g, 'trace_id', 'unknown')
            logger.warning(
                f"Unapproved user attempted to access restricted endpoint: "
                f"user_id={user.get('id')}, endpoint={f.__name__}, trace_id={trace_id}"
            )
            
            return jsonify({
                'error': {
                    'code': 'APPROVAL_REQUIRED',
                    'message': 'Your account is pending approval. Please contact an administrator to gain access to this feature.',
                    'trace_id': trace_id
                }
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


__all__ = ['require_approval']
