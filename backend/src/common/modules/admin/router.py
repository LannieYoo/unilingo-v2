#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Admin Router
API endpoints for admin operations
"""

import logging
from flask import Blueprint, request, g, jsonify
from pydantic import ValidationError

from .dto import BulkApproveRequestDTO, ApprovalResponseDTO
from .service import get_admin_service
from ..auth import token_required
from ...response import success_response, error_response
from ...supabase import get_db

logger = logging.getLogger(__name__)

# Create blueprint
approval_bp = Blueprint('approval', __name__, url_prefix='/api/admin')


def require_admin(f):
    """Decorator to require admin privileges"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = getattr(g, 'user', None) or getattr(g, 'current_user', None)
        
        if not user:
            return error_response(
                message='Authentication required',
                status_code=401
            )
        
        if user.get('user_level') != 'admin':
            trace_id = getattr(g, 'trace_id', 'unknown')
            logger.warning(
                f"Non-admin user attempted to access admin endpoint: "
                f"user_id={user.get('id')}, endpoint={f.__name__}, trace_id={trace_id}"
            )
            return error_response(
                message='Admin access required',
                status_code=403
            )
        
        return f(*args, **kwargs)
    
    return decorated_function


@approval_bp.route('/users/pending', methods=['GET'])
@token_required
@require_admin
def get_pending_users():
    """
    Get list of users pending approval
    
    GET /api/admin/users/pending
    
    Returns:
        200: List of pending users
        401: Authentication required
        403: Admin access required
    """
    try:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        
        db = next(get_db())
        try:
            admin_service = get_admin_service(db)
            pending_users = admin_service.get_pending_users()
            
            # Convert to dict
            users_data = [user.dict() for user in pending_users]
            
            logger.info(f"Retrieved {len(users_data)} pending users, trace_id={trace_id}")
            
            return success_response(data={'users': users_data, 'count': len(users_data)})
        finally:
            db.close()
        
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to get pending users: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to get pending users',
            status_code=500
        )


@approval_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@token_required
@require_admin
def approve_user(user_id):
    """
    Approve a single user
    
    POST /api/admin/users/{user_id}/approve
    
    Args:
        user_id: User ID to approve
    
    Returns:
        200: User approved successfully
        401: Authentication required
        403: Admin access required
        404: User not found
    """
    try:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        user = getattr(g, 'user', None) or getattr(g, 'current_user', None)
        admin_id = user.get('id')
        
        db = next(get_db())
        try:
            admin_service = get_admin_service(db)
            admin_service.approve_user(user_id, admin_id)
            
            logger.info(f"User {user_id} approved by admin {admin_id}, trace_id={trace_id}")
            
            return success_response(data={'message': 'User approved successfully'})
        finally:
            db.close()
        
    except ValueError as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.warning(f"User not found: {e}, trace_id={trace_id}")
        return error_response(
            message=str(e),
            status_code=404
        )
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to approve user {user_id}: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to approve user',
            status_code=500
        )


@approval_bp.route('/users/bulk-approve', methods=['POST'])
@token_required
@require_admin
def bulk_approve_users():
    """
    Approve multiple users
    
    POST /api/admin/users/bulk-approve
    
    Request body:
    {
        "user_ids": [1, 2, 3]
    }
    
    Returns:
        200: Users approved successfully
        400: Validation error
        401: Authentication required
        403: Admin access required
    """
    try:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        user = getattr(g, 'user', None) or getattr(g, 'current_user', None)
        admin_id = user.get('id')
        
        # Parse request body
        data = request.get_json()
        
        # Validate with DTO
        bulk_request = BulkApproveRequestDTO(**data)
        
        db = next(get_db())
        try:
            admin_service = get_admin_service(db)
            approved_count = admin_service.bulk_approve_users(bulk_request.user_ids, admin_id)
            
            logger.info(
                f"Bulk approved {approved_count} users by admin {admin_id}, trace_id={trace_id}"
            )
            
            return success_response(data={
                'message': f'Successfully approved {approved_count} users',
                'approved_count': approved_count
            })
        finally:
            db.close()
        
    except ValidationError as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.warning(f"Validation error in bulk approve: {e}, trace_id={trace_id}")
        return error_response(
            message='Validation error',
            details={'errors': e.errors()},
            status_code=400
        )
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to bulk approve users: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to bulk approve users',
            status_code=500
        )


__all__ = ['approval_bp']
