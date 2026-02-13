#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health Service 테스트

import pytest
from unittest.mock import patch, MagicMock
from flask import Flask, g


@pytest.fixture
def app():
    """Flask 앱 픽스처"""
    app = Flask(__name__)
    return app


@pytest.fixture
def app_context(app):
    """Flask 앱 컨텍스트"""
    with app.app_context():
        with app.test_request_context():
            g.trace_id = 'test-123'
            yield


class TestDatabaseCheck:
    """데이터베이스 체크 테스트"""
    
    @patch('backend.src.common.modules.health.service.SUPABASE_DB_URI', 'postgresql://test:test@localhost/test')
    @patch('sqlalchemy.create_engine')
    def test_database_check_success(self, mock_create_engine):
        """DB 체크 성공 케이스"""
        from backend.src.common.modules.health import service
        
        mock_engine = MagicMock()
        mock_connection = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_connection
        mock_create_engine.return_value = mock_engine
        
        result = service.check_database()
        
        assert result['ok'] is True
        assert result['latency_ms'] >= 0
        assert 'error' not in result
    
    @patch('backend.src.common.modules.health.service.SUPABASE_DB_URI', '')
    def test_database_check_no_uri(self):
        """DB URI 미설정 케이스"""
        from backend.src.common.modules.health import service
        
        result = service.check_database()
        
        assert result['ok'] is False
        assert 'not configured' in result['error']
    
    @patch('backend.src.common.modules.health.service.SUPABASE_DB_URI', 'postgresql://test:test@localhost/test')
    @patch('sqlalchemy.create_engine')
    def test_database_check_failure(self, mock_create_engine):
        """DB 연결 실패 케이스"""
        from backend.src.common.modules.health import service
        
        mock_create_engine.side_effect = Exception("Connection failed")
        
        result = service.check_database()
        
        assert result['ok'] is False
        assert 'Connection failed' in result['error']


class TestExternalAPIChecks:
    """외부 API 체크 테스트"""
    
    @patch('backend.src.common.modules.health.service.requests.head')
    def test_translation_api_success(self, mock_head):
        """번역 API 체크 성공"""
        from backend.src.common.modules.health import service
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        result = service.check_translation_api()
        
        assert result['ok'] is True
        assert result['latency_ms'] >= 0
    
    @patch('backend.src.common.modules.health.service.requests.head')
    def test_translation_api_timeout(self, mock_head):
        """번역 API 타임아웃"""
        from backend.src.common.modules.health import service
        import requests
        mock_head.side_effect = requests.Timeout()
        
        result = service.check_translation_api()
        
        assert result['ok'] is False
        assert 'timeout' in result['error'].lower()
    
    @patch('backend.src.common.modules.health.service.requests.head')
    def test_dictionary_api_success(self, mock_head):
        """사전 API 체크 성공"""
        from backend.src.common.modules.health import service
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_head.return_value = mock_response
        
        result = service.check_dictionary_api()
        
        assert result['ok'] is True
        assert result['latency_ms'] >= 0


class TestCacheCheck:
    """캐시 체크 테스트"""
    
    @patch('redis.Redis')
    def test_cache_check_redis_success(self, mock_redis):
        """Redis 체크 성공"""
        from backend.src.common.modules.health import service
        
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance
        
        result = service.check_cache()
        
        assert result['ok'] is True
        assert result['latency_ms'] >= 0
    
    @patch('redis.Redis')
    @patch('backend.src.common.modules.health.service.SUPABASE_DB_URI', 'postgresql://test:test@localhost/test')
    @patch('sqlalchemy.create_engine')
    def test_cache_check_fallback_to_table(self, mock_create_engine, mock_redis):
        """Redis 실패 시 테이블 폴백"""
        from backend.src.common.modules.health import service
        
        mock_redis.side_effect = Exception("Redis not available")
        
        mock_engine = MagicMock()
        mock_connection = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_connection
        mock_create_engine.return_value = mock_engine
        
        result = service.check_cache()
        
        assert result['ok'] is True
        assert result['latency_ms'] >= 0


class TestOverallStatus:
    """전체 상태 판단 테스트"""
    
    def test_all_checks_pass(self):
        """모든 체크 통과"""
        from backend.src.common.modules.health import service
        
        checks = {
            'db': {'ok': True, 'latency_ms': 10},
            'translation_api': {'ok': True, 'latency_ms': 50},
            'dictionary_api': {'ok': True, 'latency_ms': 50},
            'cache': {'ok': True, 'latency_ms': 5}
        }
        
        status = service.determine_overall_status(checks)
        assert status == 'ok'
    
    def test_db_fails(self):
        """DB 실패 시 down"""
        from backend.src.common.modules.health import service
        
        checks = {
            'db': {'ok': False, 'latency_ms': 0, 'error': 'Connection failed'},
            'translation_api': {'ok': True, 'latency_ms': 50},
            'dictionary_api': {'ok': True, 'latency_ms': 50},
            'cache': {'ok': True, 'latency_ms': 5}
        }
        
        status = service.determine_overall_status(checks)
        assert status == 'down'
    
    def test_non_critical_fails(self):
        """비중요 체크 실패 시 degraded"""
        from backend.src.common.modules.health import service
        
        checks = {
            'db': {'ok': True, 'latency_ms': 10},
            'translation_api': {'ok': False, 'latency_ms': 0, 'error': 'Timeout'},
            'dictionary_api': {'ok': True, 'latency_ms': 50},
            'cache': {'ok': True, 'latency_ms': 5}
        }
        
        status = service.determine_overall_status(checks)
        assert status == 'degraded'


class TestSafeCheck:
    """safe_check 래퍼 테스트"""
    
    def test_safe_check_success(self, app_context):
        """정상 체크"""
        from backend.src.common.modules.health import service
        
        def mock_check():
            return {'ok': True, 'latency_ms': 10}
        
        result = service.safe_check(mock_check, 'test')
        assert result['ok'] is True
    
    def test_safe_check_exception(self, app_context):
        """예외 발생 시 처리"""
        from backend.src.common.modules.health import service
        
        def mock_check():
            raise Exception("Test error")
        
        result = service.safe_check(mock_check, 'test')
        assert result['ok'] is False
        assert 'Test error' in result['error']
