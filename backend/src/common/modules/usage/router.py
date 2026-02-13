#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Usage Router
API endpoints for usage tracking and querying
"""

import logging
from flask import Blueprint, request, g, jsonify
from pydantic import ValidationError

from .dto import UsageResponse, TrackUsageRequest
from .service import UsageService
from src.common.modules.auth import token_required
from src.common.response import success_response, error_response

logger = logging.getLogger(__name__)

# Create blueprint
usage_bp = Blueprint('usage', __name__, url_prefix='/api/usage')


@usage_bp.route('/current', methods=['GET'])
@token_required
def get_current_usage():
    """
    Get current month usage for authenticated user
    
    GET /api/usage/current
    
    Returns:
        200: Current usage data
        401: Authentication required
    """
    try:
        # Get user from request context (set by @token_required)
        user = g.user
        user_id = user['id']
        user_level = user.get('user_level', 'guest')
        approval_status = user.get('approval_status', 'pending')
        
        # Get trace_id for logging
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        
        # Get current usage
        usage_data = UsageService.get_current_usage(user_id, user_level, approval_status)
        
        logger.info(f"Usage query: user_id={user_id}, month={usage_data['month']}, approval_status={approval_status}, trace_id={trace_id}")
        
        return success_response(data=usage_data)
        
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to get current usage: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to get current usage',
            status_code=500
        )


@usage_bp.route('/track', methods=['POST'])
@token_required
def track_usage():
    """
    Track character usage (called after processing)
    
    POST /api/usage/track
    
    Request body:
    {
        "char_count": 100,
        "usage_type": "translation"  // or "stt"
    }
    
    Returns:
        200: Usage tracked successfully
        400: Validation error
        401: Authentication required
    """
    try:
        # Get user from request context
        user = g.user
        user_id = user['id']
        
        # Get trace_id for logging
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        
        # Parse request body
        data = request.get_json()
        
        # Validate with DTO
        track_request = TrackUsageRequest(**data)
        
        # Track usage
        UsageService.track_usage(
            user_id=user_id,
            char_count=track_request.char_count,
            usage_type=track_request.usage_type
        )
        
        logger.info(f"Usage tracked: user_id={user_id}, type={track_request.usage_type}, chars={track_request.char_count}, trace_id={trace_id}")
        
        return success_response(data={'message': 'Usage tracked successfully'})
        
    except ValidationError as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.warning(f"Validation error in track usage: {e}, trace_id={trace_id}")
        return error_response(
            message='Validation error',
            details={'errors': e.errors()},
            status_code=400
        )
    except ValueError as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.warning(f"Value error in track usage: {e}, trace_id={trace_id}")
        return error_response(
            message=str(e),
            status_code=400
        )
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to track usage: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to track usage',
            status_code=500
        )


@usage_bp.route('/guest/current', methods=['GET'])
def get_guest_usage():
    """
    Get current month usage for guest user (by IP)
    
    GET /api/usage/guest/current
    
    Returns:
        200: Current usage data for guest
    """
    try:
        # Get IP address (check X-Forwarded-For first for proxy/load balancer)
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address:
            # Handle multiple IPs in X-Forwarded-For (take first one)
            ip_address = ip_address.split(',')[0].strip()
        
        # Get trace_id for logging
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        
        # Get current usage for guest
        usage_data = UsageService.get_guest_usage(ip_address)
        
        logger.info(f"Guest usage query: ip={ip_address}, month={usage_data['month']}, trace_id={trace_id}")
        
        return success_response(data=usage_data)
        
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to get guest usage: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to get guest usage',
            status_code=500
        )


@usage_bp.route('/guest/track', methods=['POST'])
def track_guest_usage():
    """
    Track character usage for guest user (by IP)
    
    POST /api/usage/guest/track
    
    Request body:
    {
        "char_count": 100,
        "usage_type": "translation"  // or "stt" or "dictionary"
    }
    
    Returns:
        200: Usage tracked successfully
        400: Validation error
    """
    try:
        # Get IP address (check X-Forwarded-For first for proxy/load balancer)
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address:
            # Handle multiple IPs in X-Forwarded-For (take first one)
            ip_address = ip_address.split(',')[0].strip()
        
        # Get trace_id for logging
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        
        # Parse request body
        data = request.get_json()
        
        # Validate with DTO
        track_request = TrackUsageRequest(**data)
        
        # Track guest usage
        UsageService.track_guest_usage(
            ip_address=ip_address,
            char_count=track_request.char_count,
            usage_type=track_request.usage_type
        )
        
        logger.info(f"Guest usage tracked: ip={ip_address}, type={track_request.usage_type}, chars={track_request.char_count}, trace_id={trace_id}")
        
        return success_response(data={'message': 'Usage tracked successfully'})
        
    except ValidationError as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.warning(f"Validation error in track guest usage: {e}, trace_id={trace_id}")
        return error_response(
            message='Validation error',
            details={'errors': e.errors()},
            status_code=400
        )
    except ValueError as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.warning(f"Value error in track guest usage: {e}, trace_id={trace_id}")
        return error_response(
            message=str(e),
            status_code=400
        )
    except Exception as e:
        trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        logger.error(f"Failed to track guest usage: {e}, trace_id={trace_id}")
        return error_response(
            message='Failed to track guest usage',
            status_code=500
        )


__all__ = ['usage_bp']
