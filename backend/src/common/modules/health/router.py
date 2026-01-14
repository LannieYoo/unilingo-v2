#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health Router - 라우터 정의와 파라미터 해석

from flask import Blueprint, jsonify, g
from datetime import datetime
from . import service

router = Blueprint('health', __name__, url_prefix='/api')


@router.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인 API"""
    trace_id = g.get('trace_id', 'unknown')
    services_status = service.get_all_services_status()
    overall_status = service.get_overall_status(services_status)
    
    response = {
        'status': overall_status,
        'services': services_status,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'trace_id': trace_id
    }
    
    status_code = 200 if overall_status == 'healthy' else 503
    return jsonify(response), status_code
