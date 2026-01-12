"""
Auth router endpoints (Flask Blueprint).
"""
import asyncio
from flask import Blueprint, request, jsonify, g
from ...database import get_db
from .._01_contracts import GoogleOAuthError, TokenError
from .._04_services import get_auth_service
from .deps_auth import login_required, get_current_user


router = Blueprint('auth', __name__, url_prefix='/api/auth')


@router.route('/google', methods=['POST'])
def google_auth():
    """Get Google OAuth authorization URL."""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        data = request.get_json()
        if not data or 'redirect_uri' not in data:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing redirect_uri',
                    'trace_id': trace_id,
                }
            }), 400
        
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            auth_url = auth_service.get_google_auth_url(data['redirect_uri'])
            
            return jsonify({
                'auth_url': auth_url,
                'trace_id': trace_id,
            }), 200
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e),
                'trace_id': trace_id,
            }
        }), 500


@router.route('/google/callback', methods=['POST'])
def google_callback():
    """Handle Google OAuth callback."""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Request body must be JSON',
                    'trace_id': trace_id,
                }
            }), 400
        
        code = data.get('code')
        redirect_uri = data.get('redirect_uri')
        
        if not code or not redirect_uri:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing code or redirect_uri',
                    'trace_id': trace_id,
                }
            }), 400
        
        # Extract client info for login logging
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        user_agent = request.headers.get('User-Agent', '')[:500]  # Limit length
        
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            
            # Run async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                user, tokens = loop.run_until_complete(
                    auth_service.authenticate_google(
                        code, 
                        redirect_uri,
                        ip_address=ip_address,
                        user_agent=user_agent,
                    )
                )
            finally:
                loop.close()
            
            return jsonify({
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'avatar_url': user.avatar_url,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
                },
                'tokens': {
                    'access_token': tokens.access_token,
                    'refresh_token': tokens.refresh_token,
                    'token_type': tokens.token_type,
                    'expires_in': tokens.expires_in,
                },
                'trace_id': trace_id,
            }), 200
            
        finally:
            db.close()
            
    except GoogleOAuthError as e:
        return jsonify({
            'error': {
                'code': 'GOOGLE_AUTH_ERROR',
                'message': str(e),
                'trace_id': trace_id,
            }
        }), 401
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e),
                'trace_id': trace_id,
            }
        }), 500


@router.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token."""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        data = request.get_json()
        if not data or 'refresh_token' not in data:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Missing refresh_token',
                    'trace_id': trace_id,
                }
            }), 400
        
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            tokens = auth_service.refresh_access_token(data['refresh_token'])
            
            if not tokens:
                return jsonify({
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Invalid refresh token',
                        'trace_id': trace_id,
                    }
                }), 401
            
            return jsonify({
                'access_token': tokens.access_token,
                'refresh_token': tokens.refresh_token,
                'token_type': tokens.token_type,
                'expires_in': tokens.expires_in,
                'trace_id': trace_id,
            }), 200
            
        finally:
            db.close()
            
    except TokenError as e:
        return jsonify({
            'error': {
                'code': 'TOKEN_ERROR',
                'message': str(e),
                'trace_id': trace_id,
            }
        }), 401
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e),
                'trace_id': trace_id,
            }
        }), 500


@router.route('/me', methods=['GET'])
@login_required
def get_me():
    """Get current user info."""
    trace_id = g.get('trace_id', 'unknown')
    
    user = get_current_user()
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'avatar_url': user.avatar_url,
        'is_active': user.is_active,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
        'trace_id': trace_id,
    }), 200


@router.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user."""
    trace_id = g.get('trace_id', 'unknown')
    
    # JWT is stateless, so we just return success
    # Client should remove tokens from storage
    return jsonify({
        'message': 'Logged out successfully',
        'trace_id': trace_id,
    }), 200
