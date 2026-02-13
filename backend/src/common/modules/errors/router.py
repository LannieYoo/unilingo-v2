#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Events Router
API endpoints for error reporting and monitoring
"""

import logging
from flask import Blueprint, request, g
from pydantic import ValidationError

from .dto import ErrorReportDTO, ErrorEventDTO, ErrorListResponseDTO
from .service import create_error_event, get_error_events, get_error_events_by_trace_id
from src.common.modules.auth import admin_required, token_required
from src.common.response import success_response, error_response

logger = logging.getLogger(__name__)

# Create blueprint
errors_bp = Blueprint('errors', __name__, url_prefix='/api')


@errors_bp.route('/errors', methods=['POST'])
@token_required
def report_error():
    """
    Report error from frontend
    
    POST /api/errors
    
    Request body:
    {
        "trace_id": "uuid",
        "message": "error message",
        "stack_trace": "optional stack trace",
        "user_context": {"user_id": "123"},
        "url": "https://example.com/page",
        "user_agent": "Mozilla/5.0..."
    }
    
    Returns:
        201: Error event created
        400: Validation error
        401: Authentication required
    """
    try:
        # Parse request body
        data = request.get_json()
        
        # Validate with DTO
        error_report = ErrorReportDTO(**data)
        
        # Build detail from request
        detail = {
            'stackTrace': error_report.stack_trace,
            'userContext': error_report.user_context or {},
            'url': error_report.url,
            'userAgent': error_report.user_agent
        }
        
        # Create error event
        result = create_error_event(
            trace_id=error_report.trace_id,
            where_from='frontend',  # Always 'frontend' for this endpoint
            message=error_report.message,
            detail=detail
        )
        
        logger.info(f"Frontend error reported: trace_id={error_report.trace_id}")
        
        return success_response(
            data=result,
            message='Error reported successfully',
            status_code=201
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error in error report: {e}")
        return error_response(
            message='Validation error',
            details={'errors': e.errors()},
            status_code=400
        )
    except ValueError as e:
        logger.warning(f"Value error in error report: {e}")
        return error_response(
            message=str(e),
            status_code=400
        )
    except Exception as e:
        logger.error(f"Failed to report error: {e}")
        return error_response(
            message='Failed to report error',
            status_code=500
        )


@errors_bp.route('/admin/errors', methods=['GET'])
@admin_required
def list_errors():
    """
    List recent errors with pagination and filters
    
    GET /api/admin/errors?page=1&page_size=100&where_from=frontend&start_date=2026-01-01&end_date=2026-02-01
    
    Query parameters:
        page: Page number (default: 1)
        page_size: Items per page (default: 100)
        where_from: Filter by source (frontend/backend)
        start_date: Filter by start date (ISO format)
        end_date: Filter by end date (ISO format)
    
    Returns:
        200: List of error events
        401: Authentication required
        403: Admin access required
    """
    try:
        # Parse query parameters
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 100))
        where_from = request.args.get('where_from')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Convert date strings to datetime if provided
        from datetime import datetime
        start_date_obj = datetime.fromisoformat(start_date) if start_date else None
        end_date_obj = datetime.fromisoformat(end_date) if end_date else None
        
        # Get error events
        result = get_error_events(
            page=page,
            page_size=page_size,
            where_from=where_from,
            start_date=start_date_obj,
            end_date=end_date_obj
        )
        
        # Build response
        response_data = {
            'data': result['data'],
            'total': result['total'],
            'page': page,
            'page_size': page_size
        }
        
        return success_response(data=response_data)
        
    except ValueError as e:
        logger.warning(f"Invalid parameters in list errors: {e}")
        return error_response(
            message=str(e),
            status_code=400
        )
    except Exception as e:
        logger.error(f"Failed to list errors: {e}")
        return error_response(
            message='Failed to list errors',
            status_code=500
        )


@errors_bp.route('/admin/errors/<trace_id>', methods=['GET'])
@admin_required
def get_error_by_trace_id(trace_id: str):
    """
    Get all error events for a specific trace_id
    
    GET /api/admin/errors/{trace_id}
    
    Returns:
        200: List of error events for trace_id
        401: Authentication required
        403: Admin access required
    """
    try:
        # Get error events by trace_id
        events = get_error_events_by_trace_id(trace_id)
        
        return success_response(data=events)
        
    except Exception as e:
        logger.error(f"Failed to get errors by trace_id: {e}")
        return error_response(
            message='Failed to get errors',
            status_code=500
        )


@errors_bp.route('/admin/errors/test', methods=['POST'])
@admin_required
def trigger_test_error():
    """
    Trigger intentional 500 error for testing
    
    POST /api/admin/errors/test
    
    Returns:
        500: Intentional error
        401: Authentication required
        403: Admin access required
    """
    # Get trace_id from request context
    trace_id = getattr(g, 'trace_id', 'NO_TRACE')
    
    # Log trace_id
    logger.error(f"Test error triggered: trace_id={trace_id}")
    
    # Create error event
    try:
        create_error_event(
            trace_id=trace_id,
            where_from='backend',
            message='Test error triggered by admin',
            detail={
                'test': True,
                'endpoint': '/api/admin/errors/test'
            }
        )
    except Exception as e:
        logger.error(f"Failed to create test error event: {e}")
    
    # Raise intentional error
    raise Exception(f"Test error - trace_id: {trace_id}")


__all__ = ['errors_bp']
