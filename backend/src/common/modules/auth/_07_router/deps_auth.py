"""
Auth dependencies for Flask.
"""
import os
from typing import Optional
from functools import wraps
from flask import request, jsonify, g
from sqlalchemy.orm import Session
from ...database import get_db
from .._01_contracts import DUser, TokenExpiredError, InvalidTokenError
from .._04_services import get_auth_service

# Admin email from environment
ADMIN_USER = os.getenv('ADMIN_USER', '')


def get_token_from_header() -> Optional[str]:
    """Extract token from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def _is_admin_user(email: str) -> bool:
    """Check if user is admin."""
    return ADMIN_USER and email == ADMIN_USER


def login_required(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Not authenticated',
                }
            }), 401
        
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            
            try:
                payload = auth_service.verify_token(token)
                if not payload:
                    return jsonify({
                        'error': {
                            'code': 'INVALID_TOKEN',
                            'message': 'Invalid token',
                        }
                    }), 401
                
                user = auth_service.get_user_by_id(payload.user_id)
                if not user:
                    return jsonify({
                        'error': {
                            'code': 'USER_NOT_FOUND',
                            'message': 'User not found',
                        }
                    }), 401
                
                if not user.is_active:
                    return jsonify({
                        'error': {
                            'code': 'USER_INACTIVE',
                            'message': 'User is inactive',
                        }
                    }), 403
                
                # Verify token version (single session enforcement for non-admin users)
                if not _is_admin_user(user.email):
                    if payload.token_version != user.token_version:
                        return jsonify({
                            'error': {
                                'code': 'SESSION_EXPIRED',
                                'message': '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.',
                            }
                        }), 401
                
                g.current_user = user
                return f(*args, **kwargs)
                
            except TokenExpiredError:
                return jsonify({
                    'error': {
                        'code': 'TOKEN_EXPIRED',
                        'message': 'Token expired',
                    }
                }), 401
            except InvalidTokenError:
                return jsonify({
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid token',
                    }
                }), 401
        finally:
            db.close()
    
    return decorated_function


def get_optional_user() -> Optional[DUser]:
    """Get current user if authenticated (optional)."""
    token = get_token_from_header()
    
    if not token:
        return None
    
    db = next(get_db())
    try:
        auth_service = get_auth_service(db)
        
        try:
            payload = auth_service.verify_token(token)
            if not payload:
                return None
            
            user = auth_service.get_user_by_id(payload.user_id)
            if not user or not user.is_active:
                return None
            
            # Verify token version (single session enforcement for non-admin users)
            if not _is_admin_user(user.email):
                if payload.token_version != user.token_version:
                    return None
            
            return user
            
        except (TokenExpiredError, InvalidTokenError):
            return None
    finally:
        db.close()


def get_current_user() -> Optional[DUser]:
    """Get current user from Flask g object."""
    return getattr(g, 'current_user', None)


def is_admin(user: Optional[DUser]) -> bool:
    """Check if user is admin."""
    if not user or not ADMIN_USER:
        return False
    return user.email == ADMIN_USER


def admin_required(f):
    """Decorator to require admin authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Not authenticated',
                }
            }), 401
        
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            
            try:
                payload = auth_service.verify_token(token)
                if not payload:
                    return jsonify({
                        'error': {
                            'code': 'INVALID_TOKEN',
                            'message': 'Invalid token',
                        }
                    }), 401
                
                user = auth_service.get_user_by_id(payload.user_id)
                if not user:
                    return jsonify({
                        'error': {
                            'code': 'USER_NOT_FOUND',
                            'message': 'User not found',
                        }
                    }), 401
                
                if not user.is_active:
                    return jsonify({
                        'error': {
                            'code': 'USER_INACTIVE',
                            'message': 'User is inactive',
                        }
                    }), 403
                
                if not is_admin(user):
                    return jsonify({
                        'error': {
                            'code': 'FORBIDDEN',
                            'message': 'Admin access required',
                        }
                    }), 403
                
                g.current_user = user
                return f(*args, **kwargs)
                
            except TokenExpiredError:
                return jsonify({
                    'error': {
                        'code': 'TOKEN_EXPIRED',
                        'message': 'Token expired',
                    }
                }), 401
            except InvalidTokenError:
                return jsonify({
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid token',
                    }
                }), 401
        finally:
            db.close()
    
    return decorated_function


def token_required(f):
    """Decorator to require valid token (any authenticated user)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Not authenticated',
                }
            }), 401
        
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            
            try:
                payload = auth_service.verify_token(token)
                if not payload:
                    return jsonify({
                        'error': {
                            'code': 'INVALID_TOKEN',
                            'message': 'Invalid token',
                        }
                    }), 401
                
                user = auth_service.get_user_by_id(payload.user_id)
                if not user:
                    return jsonify({
                        'error': {
                            'code': 'USER_NOT_FOUND',
                            'message': 'User not found',
                        }
                    }), 401
                
                if not user.is_active:
                    return jsonify({
                        'error': {
                            'code': 'USER_INACTIVE',
                            'message': 'User is inactive',
                        }
                    }), 403
                
                # Verify token version (single session enforcement for non-admin users)
                if not _is_admin_user(user.email):
                    if payload.token_version != user.token_version:
                        return jsonify({
                            'error': {
                                'code': 'SESSION_EXPIRED',
                                'message': '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.',
                            }
                        }), 401
                
                g.current_user = {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                }
                return f(*args, **kwargs)
                
            except TokenExpiredError:
                return jsonify({
                    'error': {
                        'code': 'TOKEN_EXPIRED',
                        'message': 'Token expired',
                    }
                }), 401
            except InvalidTokenError:
                return jsonify({
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid token',
                    }
                }), 401
        finally:
            db.close()
    
    return decorated_function
