"""
Admin router endpoints (Flask Blueprint).
"""
from flask import Blueprint, request, jsonify, g
from ...database import get_db
from .._06_models import UserRepository, LoginLogRepository, SttLogRepository, DSttLogCreate, TranslationLogRepository, get_dictionary_log_repository
from .deps_auth import admin_required, get_current_user, is_admin, ADMIN_USER, token_required


router = Blueprint('admin', __name__, url_prefix='/api/admin')


@router.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users (admin only)."""
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
                'users': [
                    {
                        'id': u.id,
                        'email': u.email,
                        'name': u.name,
                        'avatar_url': u.avatar_url,
                        'is_active': u.is_active,
                        'created_at': u.created_at.isoformat() if u.created_at else None,
                        'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None,
                    }
                    for u in users
                ],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit,
                },
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


@router.route('/login-logs', methods=['GET'])
@admin_required
def get_login_logs():
    """Get login logs (admin only)."""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', type=int)
        
        db = next(get_db())
        try:
            login_log_repo = LoginLogRepository(db)
            user_repo = UserRepository(db)
            
            if user_id:
                logs = login_log_repo.get_by_user_id(user_id, limit=limit)
            else:
                logs = login_log_repo.get_recent(limit=limit)
            
            # Get user info for each log
            user_cache = {}
            result = []
            for log in logs:
                if log.user_id not in user_cache:
                    user = user_repo.get_by_id(log.user_id)
                    user_cache[log.user_id] = user
                
                user = user_cache.get(log.user_id)
                result.append({
                    'id': log.id,
                    'user_id': log.user_id,
                    'user_email': user.email if user else None,
                    'user_name': user.name if user else None,
                    'ip_address': log.ip_address,
                    'user_agent': log.user_agent,
                    'login_at': log.login_at.isoformat() if log.login_at else None,
                })
            
            return jsonify({
                'logs': result,
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


@router.route('/check', methods=['GET'])
@admin_required
def check_admin():
    """Check if current user is admin."""
    trace_id = g.get('trace_id', 'unknown')
    user = get_current_user()
    
    return jsonify({
        'is_admin': is_admin(user),
        'admin_email': ADMIN_USER,
        'trace_id': trace_id,
    }), 200


@router.route('/users/<int:user_id>/toggle-active', methods=['POST'])
@admin_required
def toggle_user_active(user_id):
    """Toggle user active status (admin only)."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            
            # Get target user
            target_user = user_repo.get_by_id(user_id)
            if not target_user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            # Prevent admin from deactivating themselves
            if target_user.email == current_user.get('email'):
                return jsonify({
                    'error': {
                        'code': 'CANNOT_DEACTIVATE_SELF',
                        'message': 'Cannot deactivate your own account',
                        'trace_id': trace_id,
                    }
                }), 400
            
            # Prevent deactivating admin user
            if target_user.email == ADMIN_USER:
                return jsonify({
                    'error': {
                        'code': 'CANNOT_DEACTIVATE_ADMIN',
                        'message': 'Cannot deactivate admin account',
                        'trace_id': trace_id,
                    }
                }), 400
            
            # Toggle active status
            new_status = not target_user.is_active
            updated_user = user_repo.update_active(user_id, new_status)
            
            return jsonify({
                'user': {
                    'id': updated_user.id,
                    'email': updated_user.email,
                    'name': updated_user.name,
                    'is_active': updated_user.is_active,
                },
                'message': f"User {'activated' if new_status else 'deactivated'} successfully",
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



@router.route('/stt-logs', methods=['GET'])
@admin_required
def get_stt_logs():
    """Get STT usage logs (admin only)."""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', type=int)
        
        db = next(get_db())
        try:
            stt_log_repo = SttLogRepository(db)
            user_repo = UserRepository(db)
            
            if user_id:
                logs = stt_log_repo.get_by_user_id(user_id, limit=limit)
            else:
                logs = stt_log_repo.get_recent(limit=limit)
            
            # Get user info for each log
            user_cache = {}
            result = []
            for log in logs:
                if log.user_id not in user_cache:
                    user = user_repo.get_by_id(log.user_id)
                    user_cache[log.user_id] = user
                
                user = user_cache.get(log.user_id)
                result.append({
                    'id': log.id,
                    'user_id': log.user_id,
                    'user_email': user.email if user else None,
                    'user_name': user.name if user else None,
                    'language': log.language,
                    'duration_seconds': log.duration_seconds,
                    'word_count': log.word_count,
                    'ip_address': log.ip_address,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                })
            
            return jsonify({
                'logs': result,
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


@router.route('/stt-logs/summary', methods=['GET'])
@admin_required
def get_stt_logs_summary():
    """Get STT usage summary for all users (admin only)."""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        db = next(get_db())
        try:
            stt_log_repo = SttLogRepository(db)
            user_repo = UserRepository(db)
            
            summaries = stt_log_repo.get_all_users_summary()
            
            # Get user info for each summary
            result = []
            for summary in summaries:
                user = user_repo.get_by_id(summary['user_id'])
                result.append({
                    'user_id': summary['user_id'],
                    'user_email': user.email if user else None,
                    'user_name': user.name if user else None,
                    'avatar_url': user.avatar_url if user else None,
                    'total_duration_seconds': summary['total_duration_seconds'],
                    'total_word_count': summary['total_word_count'],
                    'session_count': summary['session_count'],
                })
            
            # Sort by total duration descending
            result.sort(key=lambda x: x['total_duration_seconds'], reverse=True)
            
            return jsonify({
                'summaries': result,
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


@router.route('/stt-logs', methods=['POST'])
@token_required
def create_stt_log():
    """Create STT usage log entry."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'trace_id': trace_id,
                }
            }), 400
        
        language = data.get('language', 'en')
        duration_seconds = data.get('duration_seconds', 0)
        word_count = data.get('word_count', 0)
        
        # Get IP address
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        db = next(get_db())
        try:
            # Get user ID from token
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            stt_log_repo = SttLogRepository(db)
            log_data = DSttLogCreate(
                user_id=user.id,
                language=language,
                duration_seconds=duration_seconds,
                word_count=word_count,
                ip_address=ip_address,
            )
            log = stt_log_repo.create(log_data)
            
            return jsonify({
                'log': {
                    'id': log.id,
                    'language': log.language,
                    'duration_seconds': log.duration_seconds,
                    'word_count': log.word_count,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                },
                'trace_id': trace_id,
            }), 201
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



# ============== Translation Log Endpoints ==============

@router.route('/translation-logs', methods=['GET'])
@token_required
def get_translation_logs():
    """Get translation logs for current user or all users (admin)."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        limit = request.args.get('limit', 100, type=int)
        user_id = request.args.get('user_id', type=int)
        
        db = next(get_db())
        try:
            translation_log_repo = TranslationLogRepository(db)
            user_repo = UserRepository(db)
            
            # Get current user from DB
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            # Admin can view all or specific user's logs
            if is_admin(current_user) and user_id:
                logs = translation_log_repo.get_by_user_id(user_id, limit=limit)
            elif is_admin(current_user) and not user_id:
                # Admin viewing all logs
                logs = translation_log_repo.get_all_with_user_info(limit=limit)
                return jsonify({
                    'logs': logs,
                    'trace_id': trace_id,
                }), 200
            else:
                # Regular user can only view their own logs
                logs = translation_log_repo.get_by_user_id(user.id, limit=limit)
            
            result = []
            for log in logs:
                result.append({
                    'id': log.id,
                    'source_text': log.source_text,
                    'translated_text': log.translated_text,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'provider': log.provider,
                    'is_favorite': getattr(log, 'is_favorite', False),
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                })
            
            return jsonify({
                'logs': result,
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


@router.route('/translation-logs/recent', methods=['GET'])
@token_required
def get_recent_translation_logs():
    """Get recent translation logs for current user (for translator page)."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        limit = request.args.get('limit', 10, type=int)
        
        db = next(get_db())
        try:
            translation_log_repo = TranslationLogRepository(db)
            user_repo = UserRepository(db)
            
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            logs = translation_log_repo.get_by_user_id(user.id, limit=limit)
            
            result = []
            for log in logs:
                result.append({
                    'id': log.id,
                    'source_text': log.source_text[:100] + '...' if len(log.source_text) > 100 else log.source_text,
                    'translated_text': log.translated_text[:100] + '...' if len(log.translated_text) > 100 else log.translated_text,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'is_favorite': getattr(log, 'is_favorite', False),
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                })
            
            return jsonify({
                'logs': result,
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


@router.route('/translation-logs', methods=['POST'])
@token_required
def create_translation_log():
    """Create translation log entry."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'trace_id': trace_id,
                }
            }), 400
        
        source_text = data.get('source_text', '')
        translated_text = data.get('translated_text', '')
        source_lang = data.get('source_lang', 'en')
        target_lang = data.get('target_lang', 'ko')
        provider = data.get('provider', 'google')
        
        if not source_text or not translated_text:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'source_text and translated_text are required',
                    'trace_id': trace_id,
                }
            }), 400
        
        # Get IP address
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            translation_log_repo = TranslationLogRepository(db)
            log = translation_log_repo.create(
                user_id=user.id,
                source_text=source_text,
                translated_text=translated_text,
                source_lang=source_lang,
                target_lang=target_lang,
                provider=provider,
                ip_address=ip_address,
            )
            
            return jsonify({
                'log': {
                    'id': log.id,
                    'source_text': log.source_text,
                    'translated_text': log.translated_text,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                },
                'trace_id': trace_id,
            }), 201
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


@router.route('/translation-logs/<int:log_id>', methods=['DELETE'])
@token_required
def delete_translation_log(log_id):
    """Delete translation log entry (own logs only)."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            translation_log_repo = TranslationLogRepository(db)
            deleted = translation_log_repo.delete_by_id(log_id, user.id)
            
            if not deleted:
                return jsonify({
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Translation log not found or not owned by user',
                        'trace_id': trace_id,
                    }
                }), 404
            
            return jsonify({
                'message': 'Translation log deleted successfully',
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


@router.route('/translation-logs/<int:log_id>/favorite', methods=['POST'])
@token_required
def toggle_translation_favorite(log_id):
    """Toggle favorite status of translation log entry."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            translation_log_repo = TranslationLogRepository(db)
            log = translation_log_repo.toggle_favorite(log_id, user.id)
            
            if not log:
                return jsonify({
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Translation log not found or not owned by user',
                        'trace_id': trace_id,
                    }
                }), 404
            
            return jsonify({
                'log': {
                    'id': log.id,
                    'is_favorite': log.is_favorite,
                },
                'message': f"Translation {'added to' if log.is_favorite else 'removed from'} favorites",
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


@router.route('/translation-logs/favorites', methods=['GET'])
@token_required
def get_favorite_translation_logs():
    """Get favorite translation logs for current user."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        limit = request.args.get('limit', 100, type=int)
        
        db = next(get_db())
        try:
            translation_log_repo = TranslationLogRepository(db)
            user_repo = UserRepository(db)
            
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            logs = translation_log_repo.get_favorites_by_user(user.id, limit=limit)
            
            result = []
            for log in logs:
                result.append({
                    'id': log.id,
                    'source_text': log.source_text,
                    'translated_text': log.translated_text,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'is_favorite': log.is_favorite,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                })
            
            return jsonify({
                'logs': result,
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


# ============== Dictionary Log Endpoints ==============

@router.route('/dictionary-logs', methods=['GET'])
@token_required
def get_dictionary_logs():
    """Get dictionary search logs for current user."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        limit = request.args.get('limit', 50, type=int)
        
        db = next(get_db())
        try:
            dictionary_log_repo = get_dictionary_log_repository(db)
            user_repo = UserRepository(db)
            
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            logs = dictionary_log_repo.get_user_logs(user.id, limit=limit)
            
            result = []
            for log in logs:
                result.append({
                    'id': log.id,
                    'search_word': log.search_word,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                })
            
            return jsonify({
                'logs': result,
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


@router.route('/dictionary-logs/recent', methods=['GET'])
@token_required
def get_recent_dictionary_logs():
    """Get recent dictionary search logs for current user (for dictionary page)."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        limit = request.args.get('limit', 10, type=int)
        
        db = next(get_db())
        try:
            dictionary_log_repo = get_dictionary_log_repository(db)
            user_repo = UserRepository(db)
            
            user = user_repo.get_by_email(current_user.get('email'))
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            logs = dictionary_log_repo.get_recent_logs(user.id, limit=limit)
            
            result = []
            for log in logs:
                result.append({
                    'id': log.id,
                    'search_word': log.search_word,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                })
            
            return jsonify({
                'logs': result,
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


@router.route('/dictionary-logs', methods=['POST'])
@token_required
def create_dictionary_log():
    """Create dictionary search log entry."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required',
                    'trace_id': trace_id,
                }
            }), 400
        
        search_word = data.get('search_word', '')
        source_lang = data.get('source_lang', 'en')
        target_lang = data.get('target_lang', 'ko')
        search_results = data.get('search_results')
        
        if not search_word:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'search_word is required',
                    'trace_id': trace_id,
                }
            }), 400
        
        # Get IP address
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            dictionary_log_repo = get_dictionary_log_repository(db)
            log = dictionary_log_repo.create_log(
                user_id=user.id,
                search_word=search_word,
                source_lang=source_lang,
                target_lang=target_lang,
                search_results=search_results,
                ip_address=ip_address,
            )
            
            return jsonify({
                'log': {
                    'id': log.id,
                    'search_word': log.search_word,
                    'source_lang': log.source_lang,
                    'target_lang': log.target_lang,
                    'created_at': log.created_at.isoformat() if log.created_at else None,
                },
                'trace_id': trace_id,
            }), 201
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


@router.route('/dictionary-logs/<int:log_id>', methods=['DELETE'])
@token_required
def delete_dictionary_log(log_id):
    """Delete dictionary search log entry (own logs only)."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            dictionary_log_repo = get_dictionary_log_repository(db)
            deleted = dictionary_log_repo.delete_log(log_id, user.id)
            
            if not deleted:
                return jsonify({
                    'error': {
                        'code': 'NOT_FOUND',
                        'message': 'Dictionary log not found or not owned by user',
                        'trace_id': trace_id,
                    }
                }), 404
            
            return jsonify({
                'message': 'Dictionary log deleted successfully',
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


@router.route('/dictionary-logs/clear', methods=['DELETE'])
@token_required
def clear_dictionary_logs():
    """Clear all dictionary search logs for current user."""
    trace_id = g.get('trace_id', 'unknown')
    current_user = get_current_user()
    
    if not current_user:
        return jsonify({
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Authentication required',
                'trace_id': trace_id,
            }
        }), 401
    
    try:
        db = next(get_db())
        try:
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(current_user.get('email'))
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found',
                        'trace_id': trace_id,
                    }
                }), 404
            
            dictionary_log_repo = get_dictionary_log_repository(db)
            deleted_count = dictionary_log_repo.clear_user_logs(user.id)
            
            return jsonify({
                'message': f'Cleared {deleted_count} dictionary logs',
                'deleted_count': deleted_count,
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