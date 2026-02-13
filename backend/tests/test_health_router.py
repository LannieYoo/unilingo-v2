#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health Router 테스트

import pytest
from unittest.mock import patch, MagicMock
from flask import Flask, g


@pytest.fixture
def app():
    """Flask 앱 픽스처"""
    app = Flask(__name__)
    from backend.src.common.modules.health.router import router
    app.register_blueprint(router)
    return app


@pytest.fixture
def client(app):
    """테스트 클라이언트"""
    return app.test_client()


class TestHealthEndpoint:
    """헬스 체크 엔드포인트 테스트"""
    
    @patch('backend.src.common.modules.health.service.perform_health_check')
    def test_health_check_all_ok(self, mock_perform, client):
        """모든 체크 통과"""
        mock_perform.return_value = {
            'status': 'ok',
            'time': '2026-02-01T10:00:00Z',
            'checks': {
                'db': {'ok': True, 'latency_ms': 10},
                'translation_api': {'ok': True, 'latency_ms': 50},
                'dictionary_api': {'ok': True, 'latency_ms': 50},
                'cache': {'ok': True, 'latency_ms': 5}
            },
            'trace_id': 'test-123'
        }
        
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert 'checks' in data
        assert len(data['checks']) == 4
    
    @patch('backend.src.common.modules.health.service.perform_health_check')
    def test_health_check_degraded(self, mock_perform, client):
        """일부 체크 실패 - degraded"""
        mock_perform.return_value = {
            'status': 'degraded',
            'time': '2026-02-01T10:00:00Z',
            'checks': {
                'db': {'ok': True, 'latency_ms': 10},
                'translation_api': {'ok': False, 'latency_ms': 0, 'error': 'Timeout'},
                'dictionary_api': {'ok': True, 'latency_ms': 50},
                'cache': {'ok': True, 'latency_ms': 5}
            },
            'trace_id': 'test-123'
        }
        
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'degraded'
    
    @patch('backend.src.common.modules.health.service.perform_health_check')
    def test_health_check_down(self, mock_perform, client):
        """DB 실패 - down"""
        mock_perform.return_value = {
            'status': 'down',
            'time': '2026-02-01T10:00:00Z',
            'checks': {
                'db': {'ok': False, 'latency_ms': 0, 'error': 'Connection failed'},
                'translation_api': {'ok': True, 'latency_ms': 50},
                'dictionary_api': {'ok': True, 'latency_ms': 50},
                'cache': {'ok': True, 'latency_ms': 5}
            },
            'trace_id': 'test-123'
        }
        
        response = client.get('/api/health')
        
        assert response.status_code == 503
        data = response.get_json()
        assert data['status'] == 'down'
    
    @patch('backend.src.common.modules.health.service.perform_health_check')
    def test_health_check_exception(self, mock_perform, client):
        """예외 발생 시 처리"""
        mock_perform.side_effect = Exception("Unexpected error")
        
        response = client.get('/api/health')
        
        assert response.status_code == 503
        data = response.get_json()
        assert data['status'] == 'down'
        assert 'error' in data
