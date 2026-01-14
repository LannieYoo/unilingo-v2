#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Auth Router - 인증 라우터 정의

import os
import asyncio
from functools import wraps
from typing import Optional
from flask import Blueprint, request, jsonify, g

from ..database import get_db
from .dto import GoogleOAuthError, TokenError, TokenExpiredError, InvalidTokenError, DSttLogCreate
from .service import (
    get_auth_service, UserRepository, LoginLogRepository, SttLogRepository,
    TranslationLogRepository, get_dictionary_log_repository, ADMIN_USER,
)

router = Blueprint('auth', __name__, url_prefix='/api/auth')
admin_router = Blueprint('admin', __name__, url_prefix='/api/admin')


# ============================================================
# Auth Dependencies
# ============================================================

def get_token_from_header() -> Optional[str]:
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def _is_admin_user(email: str) -> bool:
    return ADMIN_USER and email == ADMIN_USER


def is_admin(user) -> bool:
    if not user or not ADMIN_USER:
        return False
    if isinstance(user, dict):
        return user.get('email') == ADMIN_USER
    return user.email == ADMIN_USER


def get_current_user():
    return getattr(g, 'current_user', None)


def get_optional_user():
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
            if not _is_admin_user(user.email):
                if payload.token_version != user.token_version:
                    return None
            return user
        except (TokenExpiredError, InvalidTokenError):
            return None
    finally:
        db.close()


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Not authenticated'}}), 401
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            try:
                payload = auth_service.verify_token(token)
                if not payload:
                    return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}), 401
                user = auth_service.get_user_by_id(payload.user_id)
                if not user:
                    return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found'}}), 401
                if not user.is_active:
                    return jsonify({'error': {'code': 'USER_INACTIVE', 'message': 'User is inactive'}}), 403
                if not _is_admin_user(user.email):
                    if payload.token_version != user.token_version:
                        return jsonify({'error': {'code': 'SESSION_EXPIRED', 'message': '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.'}}), 401
                g.current_user = user
                return f(*args, **kwargs)
            except TokenExpiredError:
                return jsonify({'error': {'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}}), 401
            except InvalidTokenError:
                return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}), 401
        finally:
            db.close()
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Not authenticated'}}), 401
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            try:
                payload = auth_service.verify_token(token)
                if not payload:
                    return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}), 401
                user = auth_service.get_user_by_id(payload.user_id)
                if not user:
                    return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found'}}), 401
                if not user.is_active:
                    return jsonify({'error': {'code': 'USER_INACTIVE', 'message': 'User is inactive'}}), 403
                if not is_admin(user):
                    return jsonify({'error': {'code': 'FORBIDDEN', 'message': 'Admin access required'}}), 403
                g.current_user = user
                return f(*args, **kwargs)
            except TokenExpiredError:
                return jsonify({'error': {'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}}), 401
            except InvalidTokenError:
                return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}), 401
        finally:
            db.close()
    return decorated_function


def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Not authenticated'}}), 401
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            try:
                payload = auth_service.verify_token(token)
                if not payload:
                    return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}), 401
                user = auth_service.get_user_by_id(payload.user_id)
                if not user:
                    return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found'}}), 401
                if not user.is_active:
                    return jsonify({'error': {'code': 'USER_INACTIVE', 'message': 'User is inactive'}}), 403
                if not _is_admin_user(user.email):
                    if payload.token_version != user.token_version:
                        return jsonify({'error': {'code': 'SESSION_EXPIRED', 'message': '다른 기기에서 로그인되어 현재 세션이 만료되었습니다.'}}), 401
                g.current_user = {'id': user.id, 'email': user.email, 'name': user.name}
                return f(*args, **kwargs)
            except TokenExpiredError:
                return jsonify({'error': {'code': 'TOKEN_EXPIRED', 'message': 'Token expired'}}), 401
            except InvalidTokenError:
                return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}), 401
        finally:
            db.close()
    return decorated_function


# ============================================================
# Auth Routes
# ============================================================

@router.route('/google', methods=['POST'])
def google_auth():
    trace_id = g.get('trace_id', 'unknown')
    try:
        data = request.get_json()
        if not data or 'redirect_uri' not in data:
            return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing redirect_uri', 'trace_id': trace_id}}), 400
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            auth_url = auth_service.get_google_auth_url(data['redirect_uri'])
            return jsonify({'auth_url': auth_url, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@router.route('/google/callback', methods=['POST'])
def google_callback():
    trace_id = g.get('trace_id', 'unknown')
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Request body must be JSON', 'trace_id': trace_id}}), 400
        code = data.get('code')
        redirect_uri = data.get('redirect_uri')
        if not code or not redirect_uri:
            return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing code or redirect_uri', 'trace_id': trace_id}}), 400
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        user_agent = request.headers.get('User-Agent', '')[:500]
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                user, tokens = loop.run_until_complete(auth_service.authenticate_google(code, redirect_uri, ip_address=ip_address, user_agent=user_agent))
            finally:
                loop.close()
            return jsonify({
                'user': {'id': user.id, 'email': user.email, 'name': user.name, 'avatar_url': user.avatar_url, 'is_active': user.is_active, 'created_at': user.created_at.isoformat() if user.created_at else None, 'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None},
                'tokens': {'access_token': tokens.access_token, 'refresh_token': tokens.refresh_token, 'token_type': tokens.token_type, 'expires_in': tokens.expires_in},
                'trace_id': trace_id,
            }), 200
        finally:
            db.close()
    except GoogleOAuthError as e:
        return jsonify({'error': {'code': 'GOOGLE_AUTH_ERROR', 'message': str(e), 'trace_id': trace_id}}), 401
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@router.route('/refresh', methods=['POST'])
def refresh_token():
    trace_id = g.get('trace_id', 'unknown')
    try:
        data = request.get_json()
        if not data or 'refresh_token' not in data:
            return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing refresh_token', 'trace_id': trace_id}}), 400
        db = next(get_db())
        try:
            auth_service = get_auth_service(db)
            tokens = auth_service.refresh_access_token(data['refresh_token'])
            if not tokens:
                return jsonify({'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid refresh token', 'trace_id': trace_id}}), 401
            return jsonify({'access_token': tokens.access_token, 'refresh_token': tokens.refresh_token, 'token_type': tokens.token_type, 'expires_in': tokens.expires_in, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except TokenError as e:
        return jsonify({'error': {'code': 'TOKEN_ERROR', 'message': str(e), 'trace_id': trace_id}}), 401
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@router.route('/me', methods=['GET'])
@login_required
def get_me():
    trace_id = g.get('trace_id', 'unknown')
    user = get_current_user()
    return jsonify({'id': user.id, 'email': user.email, 'name': user.name, 'avatar_url': user.avatar_url, 'is_active': user.is_active, 'created_at': user.created_at.isoformat() if user.created_at else None, 'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None, 'trace_id': trace_id}), 200


@router.route('/logout', methods=['POST'])
@login_required
def logout():
    trace_id = g.get('trace_id', 'unknown')
    return jsonify({'message': 'Logged out successfully', 'trace_id': trace_id}), 200


# ============================================================
# Admin Routes
# ============================================================

@admin_router.route('/users', methods=['GET'])
@admin_required
def get_users():
    trace_id = g.get('trace_id', 'unknown')
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            users = user_repo.get_all(page=page, limit=limit)
            total = user_repo.count()
            return jsonify({
                'users': [{'id': u.id, 'email': u.email, 'name': u.name, 'avatar_url': u.avatar_url, 'is_active': u.is_active, 'created_at': u.created_at.isoformat() if u.created_at else None, 'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None} for u in users],
                'pagination': {'page': page, 'limit': limit, 'total': total, 'pages': (total + limit - 1) // limit},
                'trace_id': trace_id,
            }), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/login-logs', methods=['GET'])
@admin_required
def get_login_logs():
    trace_id = g.get('trace_id', 'unknown')
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', type=int)
        db = next(get_db())
        try:
            login_log_repo = LoginLogRepository(db)
            user_repo = UserRepository(db)
            logs = login_log_repo.get_by_user_id(user_id, limit=limit) if user_id else login_log_repo.get_recent(limit=limit)
            user_cache = {}
            result = []
            for log in logs:
                if log.user_id not in user_cache:
                    user_cache[log.user_id] = user_repo.get_by_id(log.user_id)
                user = user_cache.get(log.user_id)
                result.append({'id': log.id, 'user_id': log.user_id, 'user_email': user.email if user else None, 'user_name': user.name if user else None, 'ip_address': log.ip_address, 'user_agent': log.user_agent, 'login_at': log.login_at.isoformat() if log.login_at else None})
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/check', methods=['GET'])
@admin_required
def check_admin():
    trace_id = g.get('trace_id', 'unknown')
    user = get_current_user()
    return jsonify({'is_admin': is_admin(user), 'admin_email': ADMIN_USER, 'trace_id': trace_id}), 200


@admin_router.route('/users/<int:user_id>/toggle-active', methods=['POST'])
@admin_required
def toggle_user_active(user_id):
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            target_user = user_repo.get_by_id(user_id)
            if not target_user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            if target_user.email == current_user.email:
                return jsonify({'error': {'code': 'CANNOT_DEACTIVATE_SELF', 'message': 'Cannot deactivate your own account', 'trace_id': trace_id}}), 400
            if target_user.email == ADMIN_USER:
                return jsonify({'error': {'code': 'CANNOT_DEACTIVATE_ADMIN', 'message': 'Cannot deactivate admin account', 'trace_id': trace_id}}), 400
            new_status = not target_user.is_active
            updated_user = user_repo.update_active(user_id, new_status)
            return jsonify({'user': {'id': updated_user.id, 'email': updated_user.email, 'name': updated_user.name, 'is_active': updated_user.is_active}, 'message': f"User {'activated' if new_status else 'deactivated'} successfully", 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


# ============================================================
# STT Log Routes
# ============================================================

@admin_router.route('/stt-logs', methods=['GET'])
@admin_required
def get_stt_logs():
    trace_id = g.get('trace_id', 'unknown')
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', type=int)
        db = next(get_db())
        try:
            stt_log_repo = SttLogRepository(db)
            user_repo = UserRepository(db)
            logs = stt_log_repo.get_by_user_id(user_id, limit=limit) if user_id else stt_log_repo.get_recent(limit=limit)
            user_cache = {}
            result = []
            for log in logs:
                if log.user_id not in user_cache:
                    user_cache[log.user_id] = user_repo.get_by_id(log.user_id)
                user = user_cache.get(log.user_id)
                result.append({'id': log.id, 'user_id': log.user_id, 'user_email': user.email if user else None, 'user_name': user.name if user else None, 'language': log.language, 'duration_seconds': log.duration_seconds, 'word_count': log.word_count, 'ip_address': log.ip_address, 'created_at': log.created_at.isoformat() if log.created_at else None})
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/stt-logs/summary', methods=['GET'])
@admin_required
def get_stt_logs_summary():
    trace_id = g.get('trace_id', 'unknown')
    try:
        db = next(get_db())
        try:
            stt_log_repo = SttLogRepository(db)
            user_repo = UserRepository(db)
            summaries = stt_log_repo.get_all_users_summary()
            result = []
            for summary in summaries:
                user = user_repo.get_by_id(summary['user_id'])
                result.append({'user_id': summary['user_id'], 'user_email': user.email if user else None, 'user_name': user.name if user else None, 'avatar_url': user.avatar_url if user else None, 'total_duration_seconds': summary['total_duration_seconds'], 'total_word_count': summary['total_word_count'], 'session_count': summary['session_count']})
            result.sort(key=lambda x: x['total_duration_seconds'], reverse=True)
            return jsonify({'summaries': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/stt-logs', methods=['POST'])
@token_required
def create_stt_log():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body is required', 'trace_id': trace_id}}), 400
        language = data.get('language', 'en')
        duration_seconds = data.get('duration_seconds', 0)
        word_count = data.get('word_count', 0)
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            stt_log_repo = SttLogRepository(db)
            log_data = DSttLogCreate(user_id=user.id, language=language, duration_seconds=duration_seconds, word_count=word_count, ip_address=ip_address)
            log = stt_log_repo.create(log_data)
            return jsonify({'log': {'id': log.id, 'language': log.language, 'duration_seconds': log.duration_seconds, 'word_count': log.word_count, 'created_at': log.created_at.isoformat() if log.created_at else None}, 'trace_id': trace_id}), 201
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


# ============================================================
# Translation Log Routes
# ============================================================

@admin_router.route('/translation-logs', methods=['GET'])
@token_required
def get_translation_logs():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', type=int)
        db = next(get_db())
        try:
            translation_log_repo = TranslationLogRepository(db)
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            if is_admin(current_user) and user_id:
                logs = translation_log_repo.get_by_user_id(user_id, limit=limit)
            elif is_admin(current_user) and not user_id:
                logs = translation_log_repo.get_all_with_user_info(limit=limit)
                return jsonify({'logs': logs, 'trace_id': trace_id}), 200
            else:
                logs = translation_log_repo.get_by_user_id(user.id, limit=limit)
            result = [{'id': log.id, 'source_text': log.source_text, 'translated_text': log.translated_text, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'provider': log.provider, 'is_favorite': getattr(log, 'is_favorite', False), 'created_at': log.created_at.isoformat() if log.created_at else None} for log in logs]
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/translation-logs/recent', methods=['GET'])
@token_required
def get_recent_translation_logs():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        limit = request.args.get('limit', 10, type=int)
        db = next(get_db())
        try:
            translation_log_repo = TranslationLogRepository(db)
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            logs = translation_log_repo.get_by_user_id(user.id, limit=limit)
            result = [{'id': log.id, 'source_text': log.source_text[:100] + '...' if len(log.source_text) > 100 else log.source_text, 'translated_text': log.translated_text[:100] + '...' if len(log.translated_text) > 100 else log.translated_text, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'is_favorite': getattr(log, 'is_favorite', False), 'created_at': log.created_at.isoformat() if log.created_at else None} for log in logs]
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/translation-logs', methods=['POST'])
@token_required
def create_translation_log():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body is required', 'trace_id': trace_id}}), 400
        source_text = data.get('source_text', '')
        translated_text = data.get('translated_text', '')
        source_lang = data.get('source_lang', 'en')
        target_lang = data.get('target_lang', 'ko')
        provider = data.get('provider', 'google')
        if not source_text or not translated_text:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'source_text and translated_text are required', 'trace_id': trace_id}}), 400
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            translation_log_repo = TranslationLogRepository(db)
            log = translation_log_repo.create(user_id=user.id, source_text=source_text, translated_text=translated_text, source_lang=source_lang, target_lang=target_lang, provider=provider, ip_address=ip_address)
            return jsonify({'log': {'id': log.id, 'source_text': log.source_text, 'translated_text': log.translated_text, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'created_at': log.created_at.isoformat() if log.created_at else None}, 'trace_id': trace_id}), 201
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/translation-logs/<int:log_id>', methods=['DELETE'])
@token_required
def delete_translation_log(log_id):
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            translation_log_repo = TranslationLogRepository(db)
            deleted = translation_log_repo.delete_by_id(log_id, user.id)
            if not deleted:
                return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Translation log not found or not owned by user', 'trace_id': trace_id}}), 404
            return jsonify({'message': 'Translation log deleted successfully', 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/translation-logs/<int:log_id>/favorite', methods=['POST'])
@token_required
def toggle_translation_favorite(log_id):
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            translation_log_repo = TranslationLogRepository(db)
            log = translation_log_repo.toggle_favorite(log_id, user.id)
            if not log:
                return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Translation log not found or not owned by user', 'trace_id': trace_id}}), 404
            return jsonify({'log': {'id': log.id, 'is_favorite': log.is_favorite}, 'message': f"Translation {'added to' if log.is_favorite else 'removed from'} favorites", 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/translation-logs/favorites', methods=['GET'])
@token_required
def get_favorite_translation_logs():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        limit = request.args.get('limit', 100, type=int)
        db = next(get_db())
        try:
            translation_log_repo = TranslationLogRepository(db)
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            logs = translation_log_repo.get_favorites_by_user(user.id, limit=limit)
            result = [{'id': log.id, 'source_text': log.source_text, 'translated_text': log.translated_text, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'is_favorite': log.is_favorite, 'created_at': log.created_at.isoformat() if log.created_at else None} for log in logs]
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


# ============================================================
# Dictionary Log Routes
# ============================================================

@admin_router.route('/dictionary-logs', methods=['GET'])
@token_required
def get_dictionary_logs():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        limit = request.args.get('limit', 50, type=int)
        db = next(get_db())
        try:
            dictionary_log_repo = get_dictionary_log_repository(db)
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            logs = dictionary_log_repo.get_user_logs(user.id, limit=limit)
            result = [{'id': log.id, 'search_word': log.search_word, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'created_at': log.created_at.isoformat() if log.created_at else None} for log in logs]
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/dictionary-logs/recent', methods=['GET'])
@token_required
def get_recent_dictionary_logs():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        limit = request.args.get('limit', 10, type=int)
        db = next(get_db())
        try:
            dictionary_log_repo = get_dictionary_log_repository(db)
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            logs = dictionary_log_repo.get_recent_logs(user.id, limit=limit)
            result = [{'id': log.id, 'search_word': log.search_word, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'created_at': log.created_at.isoformat() if log.created_at else None} for log in logs]
            return jsonify({'logs': result, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/dictionary-logs', methods=['POST'])
@token_required
def create_dictionary_log():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body is required', 'trace_id': trace_id}}), 400
        search_word = data.get('search_word', '')
        source_lang = data.get('source_lang', 'en')
        target_lang = data.get('target_lang', 'ko')
        search_results = data.get('search_results')
        if not search_word:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'search_word is required', 'trace_id': trace_id}}), 400
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            dictionary_log_repo = get_dictionary_log_repository(db)
            log = dictionary_log_repo.upsert_log(user_id=user.id, search_word=search_word, source_lang=source_lang, target_lang=target_lang, search_results=search_results, ip_address=ip_address)
            return jsonify({'log': {'id': log.id, 'search_word': log.search_word, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'created_at': log.created_at.isoformat() if log.created_at else None}, 'trace_id': trace_id}), 201
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/dictionary-logs/<int:log_id>', methods=['DELETE'])
@token_required
def delete_dictionary_log(log_id):
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            dictionary_log_repo = get_dictionary_log_repository(db)
            deleted = dictionary_log_repo.delete_log(log_id, user.id)
            if not deleted:
                return jsonify({'error': {'code': 'NOT_FOUND', 'message': 'Dictionary log not found or not owned by user', 'trace_id': trace_id}}), 404
            return jsonify({'message': 'Dictionary log deleted successfully', 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/dictionary-logs/clear', methods=['DELETE'])
@token_required
def clear_dictionary_logs():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            dictionary_log_repo = get_dictionary_log_repository(db)
            deleted_count = dictionary_log_repo.clear_user_logs(user.id)
            return jsonify({'message': f'Cleared {deleted_count} dictionary logs', 'deleted_count': deleted_count, 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


# ============================================================
# User Settings Routes
# ============================================================

@admin_router.route('/settings/language', methods=['GET'])
@token_required
def get_language_preferences():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            return jsonify({'native_language': user.native_language or 'en', 'target_language': user.target_language or 'ko', 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@admin_router.route('/settings/language', methods=['PUT'])
@token_required
def update_language_preferences():
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required', 'trace_id': trace_id}}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body is required', 'trace_id': trace_id}}), 400
        native_language = data.get('native_language', 'en')
        target_language = data.get('target_language', 'ko')
        valid_languages = ['en', 'ko', 'zh', 'ja', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'vi', 'th', 'id']
        if native_language not in valid_languages:
            return jsonify({'error': {'code': 'INVALID_LANGUAGE', 'message': f'Invalid native language: {native_language}', 'trace_id': trace_id}}), 400
        if target_language not in valid_languages:
            return jsonify({'error': {'code': 'INVALID_LANGUAGE', 'message': f'Invalid target language: {target_language}', 'trace_id': trace_id}}), 400
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({'error': {'code': 'USER_NOT_FOUND', 'message': 'User not found', 'trace_id': trace_id}}), 404
            updated_user = user_repo.update_language_preferences(user.id, native_language, target_language)
            return jsonify({'native_language': updated_user.native_language, 'target_language': updated_user.target_language, 'message': 'Language preferences updated successfully', 'trace_id': trace_id}), 200
        finally:
            db.close()
    except Exception as e:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


__all__ = [
    'router', 'admin_router',
    'login_required', 'admin_required', 'token_required',
    'get_current_user', 'get_optional_user', 'is_admin', 'ADMIN_USER',
]
