#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Property Tests for Error Events Service
Feature: error-tracking
"""

import json
import uuid
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, patch

from src.common.modules.errors.service import (
    create_error_event,
    get_error_events,
    get_error_events_by_trace_id,
    _truncate_detail,
    _truncate_message,
    _validate_where_from,
    MAX_DETAIL_SIZE,
    MAX_MESSAGE_LENGTH
)


# Helper strategies
valid_uuid_strategy = st.builds(lambda: str(uuid.uuid4()))
where_from_strategy = st.sampled_from(['frontend', 'backend'])
invalid_where_from_strategy = st.text(min_size=1, max_size=20).filter(
    lambda x: x not in ['frontend', 'backend']
)
message_strategy = st.text(min_size=1, max_size=200)
long_message_strategy = st.text(min_size=MAX_MESSAGE_LENGTH + 1, max_size=MAX_MESSAGE_LENGTH + 500)


def _create_large_detail(size_bytes: int) -> dict:
    """Create a detail dictionary that exceeds specified size"""
    # Create a large string to exceed the size
    large_string = 'x' * (size_bytes // 2)
    return {
        'stackTrace': large_string,
        'userContext': {'userId': '123', 'url': 'https://example.com'},
        'message': 'Test error'
    }


# Property 7: Error Detail Size Limit
@settings(max_examples=100)
@given(
    size_multiplier=st.integers(min_value=2, max_value=10)
)
def test_property_error_detail_size_limit(size_multiplier):
    """
    Property 7: Error Detail Size Limit
    Validates: Requirements 3.3, 10.1
    
    For any error detail exceeding 10KB, the system should truncate
    the detail and add a truncation indicator.
    """
    # Create detail larger than 10KB
    target_size = MAX_DETAIL_SIZE * size_multiplier
    large_detail = _create_large_detail(target_size)
    
    # Verify original size exceeds limit
    original_json = json.dumps(large_detail, ensure_ascii=False)
    original_size = len(original_json.encode('utf-8'))
    assert original_size > MAX_DETAIL_SIZE, "Test detail should exceed MAX_DETAIL_SIZE"
    
    # Truncate detail
    truncated = _truncate_detail(large_detail)
    
    # Verify truncation indicator
    assert '_truncated' in truncated, "Truncated detail should have _truncated flag"
    assert truncated['_truncated'] is True
    assert '_original_size' in truncated
    assert truncated['_original_size'] == original_size
    
    # Verify truncated size is within limit
    truncated_json = json.dumps(truncated, ensure_ascii=False)
    truncated_size = len(truncated_json.encode('utf-8'))
    assert truncated_size <= MAX_DETAIL_SIZE, f"Truncated detail size {truncated_size} should be <= {MAX_DETAIL_SIZE}"


# Property 8: Where From Validation
@settings(max_examples=100)
@given(
    invalid_value=invalid_where_from_strategy
)
def test_property_where_from_validation(invalid_value):
    """
    Property 8: Where From Validation
    Validates: Requirements 3.4
    
    For any where_from value other than 'frontend' or 'backend',
    the validation should return False.
    """
    # Test validation function
    is_valid = _validate_where_from(invalid_value)
    assert is_valid is False, f"Invalid where_from '{invalid_value}' should be rejected"


# Property 22: Error Message Length Limit
@settings(max_examples=100)
@given(
    long_message=long_message_strategy
)
def test_property_error_message_length_limit(long_message):
    """
    Property 22: Error Message Length Limit
    Validates: Requirements 10.3, 10.4
    
    For any error message exceeding 1000 characters, the system should
    truncate it and add an ellipsis.
    """
    # Verify message exceeds limit
    assert len(long_message) > MAX_MESSAGE_LENGTH
    
    # Truncate message
    truncated = _truncate_message(long_message)
    
    # Verify truncation
    assert len(truncated) == MAX_MESSAGE_LENGTH, f"Truncated message length should be exactly {MAX_MESSAGE_LENGTH}"
    assert truncated.endswith('...'), "Truncated message should end with ellipsis"
    
    # Verify content is preserved (minus ellipsis)
    expected_content = long_message[:MAX_MESSAGE_LENGTH - 3]
    assert truncated.startswith(expected_content), "Truncated message should preserve beginning content"


# Unit test: Valid where_from values
def test_valid_where_from_values():
    """Test that 'frontend' and 'backend' are valid"""
    assert _validate_where_from('frontend') is True
    assert _validate_where_from('backend') is True


# Unit test: Small detail not truncated
def test_small_detail_not_truncated():
    """Test that small details are not truncated"""
    small_detail = {
        'message': 'Test error',
        'stackTrace': 'line 1\nline 2\nline 3',
        'userContext': {'userId': '123'}
    }
    
    result = _truncate_detail(small_detail)
    
    # Should not have truncation indicator
    assert '_truncated' not in result
    assert result == small_detail


# Unit test: Short message not truncated
def test_short_message_not_truncated():
    """Test that short messages are not truncated"""
    short_message = "This is a short error message"
    
    result = _truncate_message(short_message)
    
    # Should be unchanged
    assert result == short_message
    assert not result.endswith('...')


# Unit test: Exactly 1000 character message
def test_exactly_max_length_message():
    """Test message with exactly MAX_MESSAGE_LENGTH characters"""
    exact_message = 'x' * MAX_MESSAGE_LENGTH
    
    result = _truncate_message(exact_message)
    
    # Should not be truncated
    assert result == exact_message
    assert len(result) == MAX_MESSAGE_LENGTH


# Unit test: 1001 character message
def test_one_over_max_length_message():
    """Test message with MAX_MESSAGE_LENGTH + 1 characters"""
    over_message = 'x' * (MAX_MESSAGE_LENGTH + 1)
    
    result = _truncate_message(over_message)
    
    # Should be truncated
    assert len(result) == MAX_MESSAGE_LENGTH
    assert result.endswith('...')


# Mock-based tests for database operations
@patch('src.common.modules.errors.service.get_db')
def test_create_error_event_with_valid_data(mock_get_db):
    """Test creating error event with valid data"""
    # Setup mock database session
    mock_db = Mock()
    mock_event = Mock()
    test_id = uuid.uuid4()
    test_trace_id = uuid.uuid4()
    
    mock_event.id = test_id
    mock_event.trace_id = test_trace_id
    mock_event.where_from = 'frontend'
    mock_event.message = 'Test error'
    mock_event.detail = {'test': 'data'}
    mock_event.created_at = None
    
    mock_db.add = Mock()
    mock_db.commit = Mock()
    mock_db.refresh = Mock()
    
    # get_db returns a generator, so we need to make it iterable
    mock_get_db.return_value = iter([mock_db])
    
    # Call function
    result = create_error_event(
        trace_id=str(test_trace_id),
        where_from='frontend',
        message='Test error',
        detail={'test': 'data'}
    )
    
    # Verify result
    assert result is not None
    assert 'id' in result
    assert 'where_from' in result


@patch('src.common.modules.errors.service.get_db')
def test_create_error_event_with_invalid_where_from(mock_get_db):
    """Test creating error event with invalid where_from raises ValueError"""
    mock_db = Mock()
    mock_get_db.return_value = iter([mock_db])
    
    # Should raise ValueError before database access
    with pytest.raises(ValueError) as exc_info:
        create_error_event(
            trace_id=str(uuid.uuid4()),
            where_from='invalid',
            message='Test error'
        )
    
    assert 'Invalid where_from value' in str(exc_info.value)


@patch('src.common.modules.errors.service.get_db')
def test_get_error_events_with_pagination(mock_get_db):
    """Test getting error events with pagination"""
    # Setup mock database session
    mock_db = Mock()
    mock_query = Mock()
    
    # Mock query chain
    mock_query.count.return_value = 10
    mock_query.order_by.return_value = mock_query
    mock_query.offset.return_value = mock_query
    mock_query.limit.return_value = mock_query
    
    # Mock result events
    mock_event1 = Mock()
    mock_event1.id = uuid.uuid4()
    mock_event1.trace_id = uuid.uuid4()
    mock_event1.where_from = 'frontend'
    mock_event1.message = 'Error 1'
    mock_event1.detail = None
    mock_event1.created_at = None
    
    mock_event2 = Mock()
    mock_event2.id = uuid.uuid4()
    mock_event2.trace_id = uuid.uuid4()
    mock_event2.where_from = 'backend'
    mock_event2.message = 'Error 2'
    mock_event2.detail = None
    mock_event2.created_at = None
    
    mock_query.all.return_value = [mock_event1, mock_event2]
    
    mock_db.query.return_value = mock_query
    mock_get_db.return_value = iter([mock_db])
    
    # Call function
    result = get_error_events(page=1, page_size=2)
    
    # Verify result
    assert 'data' in result
    assert 'total' in result
    assert len(result['data']) == 2
    assert result['total'] == 10


@patch('src.common.modules.errors.service.get_db')
def test_get_error_events_by_trace_id(mock_get_db):
    """Test getting error events by trace_id"""
    # Setup mock database session
    test_trace_id = str(uuid.uuid4())
    mock_db = Mock()
    mock_query = Mock()
    
    # Mock query chain
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    
    # Mock result events
    mock_event1 = Mock()
    mock_event1.id = uuid.uuid4()
    mock_event1.trace_id = test_trace_id
    mock_event1.where_from = 'frontend'
    mock_event1.message = 'Error 1'
    mock_event1.detail = None
    mock_event1.created_at = None
    
    mock_event2 = Mock()
    mock_event2.id = uuid.uuid4()
    mock_event2.trace_id = test_trace_id
    mock_event2.where_from = 'backend'
    mock_event2.message = 'Error 2'
    mock_event2.detail = None
    mock_event2.created_at = None
    
    mock_query.all.return_value = [mock_event1, mock_event2]
    
    mock_db.query.return_value = mock_query
    mock_get_db.return_value = iter([mock_db])
    
    # Call function
    result = get_error_events_by_trace_id(test_trace_id)
    
    # Verify result
    assert isinstance(result, list)
    assert len(result) == 2
