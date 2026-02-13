#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health Router - 라우터 정의와 파라미터 해석

from flask import Blueprint, jsonify, g
from . import service

router = Blueprint('health', __name__, url_prefix='/api')


@router.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인 API - 강화된 헬스 체크"""
    try:
        health_data = service.perform_health_check()
        
        status_code = 503 if health_data['status'] == 'down' else 200
        
        return jsonify(health_data), status_code
    except Exception as e:
        trace_id = g.get('trace_id', 'unknown')
        return jsonify({
            'status': 'down',
            'time': '',
            'checks': {},
            'trace_id': trace_id,
            'error': str(e)
        }), 503
