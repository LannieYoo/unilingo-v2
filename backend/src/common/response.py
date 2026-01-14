#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Response
통일 응답 형식
"""

from typing import Any, Optional
from flask import jsonify, g
from datetime import datetime


def success_response(
    data: Any = None,
    message: str = 'Success',
    status_code: int = 200
) -> tuple:
    """성공 응답 생성"""
    response = {
        'success': True,
        'message': message,
        'data': data,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'trace_id': g.get('trace_id', 'unknown')
    }
    return jsonify(response), status_code


def error_response(
    message: str,
    code: str = 'ERROR',
    status_code: int = 400,
    details: Optional[dict] = None
) -> tuple:
    """에러 응답 생성"""
    response = {
        'success': False,
        'error': {
            'code': code,
            'message': message,
            'details': details or {}
        },
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'trace_id': g.get('trace_id', 'unknown')
    }
    return jsonify(response), status_code


def paginate_response(
    items: list,
    total: int,
    page: int,
    limit: int,
    message: str = 'Success'
) -> tuple:
    """페이지네이션 응답 생성"""
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    response = {
        'success': True,
        'message': message,
        'data': {
            'items': items,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        },
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'trace_id': g.get('trace_id', 'unknown')
    }
    return jsonify(response), 200
