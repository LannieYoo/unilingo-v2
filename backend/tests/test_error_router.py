#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests for Error Reporting Router
Feature: error-tracking
"""

import json
import uuid
import pytest
from flask import Flask, g
from unittest.mock import Mock, patch

from src.common.modules.errors.router import errors_bp
from src.common.trace_middleware import setup_trace_middleware


# Test fixtures
@pytest.fixture
def app():
    """Create Flask app with error router"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    
    # Setup trace middleware
    setup_trace_middleware(app)
    
    # Register error blueprint
    app.register_blueprint(errors_bp)
    
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def mock_auth_user(app):
    """Mock authenticated user"""
    @app.before_request
    def set_user():
        g.user_id = 123
        g.current_user = {'id': 123, 'is_admin': False}


@pytest.fixture
def mock_auth_admin(app):
    """Mock authenticated admin user"""
    @app.before_request
    def set_admin():
        g.user_id = 1
        g.current_user = {'id': 1, 'is_admin': True}


# Unit test: Valid error report (Property 10, 11)
@patch('src.common.modules.errors.router.create_error_event')
def test_valid_error_report(mock_create_error_event, client, mock_auth_user):
    """
    Test creating error report with valid data
    Validates: Requirements 4.3, 4.4 (Properties 10, 11)
    """
    test_trace_id = str(uuid.uuid4())
    
    mock_create_error_event.return_value = {
        'id': str(uuid.uuid4()),
        'trace_id': test_trace_id,
        'where_from': 'frontend',
        'message': 'Test error',
        'created_at': '2026-02-01T00:00:00Z'
    }
    
    response = client.post(
        '/api/errors',
        json={
            'trace_id': test_trace_id,
            'message': 'Test error',
            'stack_trace': 'line 1\nline 2',
            'user_context': {'userId': '123'},
            'url': 'https://example.com',
            'user_agent': 'Mozilla/5.0'
        },
        headers={'Content-Type': 'application/json'}
    )
    
    # Property 11: Should return 201
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    
    # Property 10: Should call with where_from='frontend'
    assert mock_create_error_event.called
    call_args = mock_create_error_event.call_args
    assert call_args[1]['where_from'] == 'frontend'
    assert call_args[1]['trace_id'] == test_trace_id


# Unit test: Invalid error report (Property 12)
def test_invalid_error_report(client, mock_auth_user):
    """
    Test error report with invalid data
    Validates: Requirements 4.5 (Property 12)
    """
    # Missing trace_id
    response = client.post(
        '/api/errors',
        json={'message': 'Test error'},
        headers={'Content-Type': 'application/json'}
    )
    
    # Property 12: Should return 400
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False


# Unit test: Unauthenticated error report (Property 23)
def test_unauthenticated_error_report(client):
    """
    Test error report without authentication
    Validates: Requirements 11.4 (Property 23)
    """
    from src.common.errors import AuthenticationError
    
    # Should raise AuthenticationError
    with pytest.raises(AuthenticationError):
        client.post(
            '/api/errors',
            json={
                'trace_id': str(uuid.uuid4()),
                'message': 'Test error'
            },
            headers={'Content-Type': 'application/json'}
        )


# Unit test: Admin can list errors
@patch('src.common.modules.errors.router.get_error_events')
def test_admin_can_list_errors(mock_get_events, client, mock_auth_admin):
    """Test that admin can list errors"""
    mock_get_events.return_value = {
        'data': [
            {'id': str(uuid.uuid4()), 'message': 'Error 1'},
            {'id': str(uuid.uuid4()), 'message': 'Error 2'}
        ],
        'total': 2
    }
    
    response = client.get('/api/admin/errors')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'data' in data['data']
    assert len(data['data']['data']) == 2


# Unit test: Non-admin cannot list errors (Property 14)
@patch('src.common.modules.errors.router.get_error_events')
def test_non_admin_cannot_list_errors(mock_get_events, client, mock_auth_user):
    """
    Test that non-admin user cannot list errors
    Validates: Requirements 5.4, 11.2, 11.5 (Property 14)
    """
    from src.common.errors import AuthorizationError
    
    mock_get_events.return_value = {'data': [], 'total': 0}
    
    # Should raise AuthorizationError
    with pytest.raises(AuthorizationError):
        client.get('/api/admin/errors')


# Unit test: Unauthenticated cannot access admin endpoint (Property 13)
def test_unauthenticated_cannot_access_admin(client):
    """
    Test that unauthenticated user cannot access admin endpoints
    Validates: Requirements 5.3, 11.1, 11.5 (Property 13)
    """
    from src.common.errors import AuthenticationError
    
    # Should raise AuthenticationError
    with pytest.raises(AuthenticationError):
        client.get('/api/admin/errors')


# Unit test: Admin can get errors by trace_id
@patch('src.common.modules.errors.router.get_error_events_by_trace_id')
def test_admin_can_get_errors_by_trace_id(mock_get_by_trace, client, mock_auth_admin):
    """Test that admin can get errors by trace_id"""
    test_trace_id = str(uuid.uuid4())
    
    mock_get_by_trace.return_value = [
        {'id': str(uuid.uuid4()), 'trace_id': test_trace_id, 'message': 'Error 1'},
        {'id': str(uuid.uuid4()), 'trace_id': test_trace_id, 'message': 'Error 2'}
    ]
    
    response = client.get(f'/api/admin/errors/{test_trace_id}')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert len(data['data']) == 2


# Unit test: Test error endpoint
@patch('src.common.modules.errors.router.create_error_event')
def test_trigger_test_error(mock_create_error_event, client, mock_auth_admin):
    """Test that test error endpoint raises exception"""
    mock_create_error_event.return_value = {'id': str(uuid.uuid4())}
    
    # Should raise exception
    with pytest.raises(Exception) as exc_info:
        client.post('/api/admin/errors/test')
    
    assert 'Test error' in str(exc_info.value)


# Property-based tests
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta


# Property 13: Admin Endpoint Authentication
@given(
    endpoint=st.sampled_from([
        '/api/admin/errors',
        '/api/admin/errors/550e8400-e29b-41d4-a716-446655440000',
    ])
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_property_13_admin_endpoint_authentication(endpoint):
    """
    Property 13: Admin Endpoint Authentication
    For any request to /api/admin/errors endpoints without valid authentication,
    the system should return a 401 status code.
    
    Validates: Requirements 5.3, 11.1, 11.5
    """
    from src.common.errors import AuthenticationError
    
    # Create app and client inside test
    app = Flask(__name__)
    app.config['TESTING'] = True
    setup_trace_middleware(app)
    app.register_blueprint(errors_bp)
    client = app.test_client()
    
    # Make request without authentication
    with pytest.raises(AuthenticationError):
        client.get(endpoint)


# Property 14: Admin Endpoint Authorization
@given(
    endpoint=st.sampled_from([
        '/api/admin/errors',
        '/api/admin/errors/550e8400-e29b-41d4-a716-446655440000',
    ])
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@patch('src.common.modules.errors.router.get_error_events')
@patch('src.common.modules.errors.router.get_error_events_by_trace_id')
def test_property_14_admin_endpoint_authorization(mock_get_by_trace, mock_get_events, endpoint):
    """
    Property 14: Admin Endpoint Authorization
    For any authenticated request to /api/admin/errors endpoints from a non-admin user,
    the system should return a 403 status code.
    
    Validates: Requirements 5.4, 11.2, 11.5
    """
    from src.common.errors import AuthorizationError
    
    # Create app and client inside test
    app = Flask(__name__)
    app.config['TESTING'] = True
    setup_trace_middleware(app)
    app.register_blueprint(errors_bp)
    
    # Mock non-admin user
    @app.before_request
    def set_user():
        g.user_id = 123
        g.current_user = {'id': 123, 'is_admin': False}
    
    client = app.test_client()
    
    mock_get_events.return_value = {'data': [], 'total': 0}
    mock_get_by_trace.return_value = []
    
    # Make request as non-admin user
    with pytest.raises(AuthorizationError):
        client.get(endpoint)


# Property 15: Error List Pagination
@given(
    page=st.integers(min_value=1, max_value=10),
    page_size=st.integers(min_value=1, max_value=100),
    total_errors=st.integers(min_value=0, max_value=500)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@patch('src.common.modules.errors.router.get_error_events')
def test_property_15_error_list_pagination(mock_get_events, page, page_size, total_errors):
    """
    Property 15: Error List Pagination
    For any request to GET /api/admin/errors with page and page_size parameters,
    the system should return the correct subset of errors based on pagination.
    
    Validates: Requirements 5.5
    """
    # Create app and client inside test
    app = Flask(__name__)
    app.config['TESTING'] = True
    setup_trace_middleware(app)
    app.register_blueprint(errors_bp)
    
    # Mock admin user
    @app.before_request
    def set_admin():
        g.user_id = 1
        g.current_user = {'id': 1, 'is_admin': True}
    
    client = app.test_client()
    
    # Calculate expected subset
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_errors)
    expected_count = max(0, end_idx - start_idx)
    
    # Mock service to return correct subset
    mock_data = [
        {
            'id': str(uuid.uuid4()),
            'trace_id': str(uuid.uuid4()),
            'where_from': 'frontend',
            'message': f'Error {i}',
            'created_at': '2026-02-01T00:00:00Z'
        }
        for i in range(start_idx, end_idx)
    ]
    
    mock_get_events.return_value = {
        'data': mock_data,
        'total': total_errors
    }
    
    # Make request
    response = client.get(f'/api/admin/errors?page={page}&page_size={page_size}')
    
    # Verify response
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert len(data['data']['data']) == expected_count
    assert data['data']['total'] == total_errors
    assert data['data']['page'] == page
    assert data['data']['page_size'] == page_size
    
    # Verify service was called with correct parameters
    mock_get_events.assert_called_once()
    call_kwargs = mock_get_events.call_args[1]
    assert call_kwargs['page'] == page
    assert call_kwargs['page_size'] == page_size


# Property 16: Error List Sort Order
@given(
    error_count=st.integers(min_value=2, max_value=20)
)
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@patch('src.common.modules.errors.router.get_error_events')
def test_property_16_error_list_sort_order(mock_get_events, error_count):
    """
    Property 16: Error List Sort Order
    For any request to GET /api/admin/errors, the returned errors should be
    ordered by created_at in descending order (most recent first).
    
    Validates: Requirements 5.6
    """
    # Create app and client inside test
    app = Flask(__name__)
    app.config['TESTING'] = True
    setup_trace_middleware(app)
    app.register_blueprint(errors_bp)
    
    # Mock admin user
    @app.before_request
    def set_admin():
        g.user_id = 1
        g.current_user = {'id': 1, 'is_admin': True}
    
    client = app.test_client()
    
    # Generate errors with random timestamps in descending order
    base_time = datetime.now()
    mock_data = []
    
    for i in range(error_count):
        # Create timestamps in descending order
        timestamp = base_time - timedelta(minutes=i)
        mock_data.append({
            'id': str(uuid.uuid4()),
            'trace_id': str(uuid.uuid4()),
            'where_from': 'frontend',
            'message': f'Error {i}',
            'created_at': timestamp.isoformat()
        })
    
    mock_get_events.return_value = {
        'data': mock_data,
        'total': error_count
    }
    
    # Make request
    response = client.get('/api/admin/errors')
    
    # Verify response
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    
    # Verify sort order (most recent first)
    errors = data['data']['data']
    assert len(errors) == error_count
    
    # Check that timestamps are in descending order
    for i in range(len(errors) - 1):
        current_time = datetime.fromisoformat(errors[i]['created_at'])
        next_time = datetime.fromisoformat(errors[i + 1]['created_at'])
        assert current_time >= next_time, f"Errors not sorted: {current_time} < {next_time}"

