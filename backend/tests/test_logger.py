#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Property Tests for Custom Logger with Trace ID
Feature: error-tracking
"""

import logging
import re
import uuid
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from flask import Flask, g
from io import StringIO

from src.common.logger import TraceIDFormatter, setup_logging
from src.common.trace_middleware import setup_trace_middleware


# Test fixtures
@pytest.fixture
def app():
    """Create Flask app with trace middleware and logging"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['LOG_LEVEL'] = logging.INFO
    
    # Setup trace middleware first
    setup_trace_middleware(app)
    
    # Setup logging
    setup_logging(app)
    
    # Add test route
    @app.route('/test')
    def test_route():
        app.logger.info('Test log message')
        return {'status': 'ok'}
    
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def log_stream():
    """Create string stream for capturing log output"""
    return StringIO()


@pytest.fixture
def logger_with_stream(log_stream):
    """Create logger with custom formatter and string stream handler"""
    logger = logging.getLogger('test_logger')
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create handler with string stream
    handler = logging.StreamHandler(log_stream)
    formatter = TraceIDFormatter(
        '[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


# Helper strategies
valid_uuid_strategy = st.builds(lambda: str(uuid.uuid4()))
log_message_strategy = st.text(min_size=1, max_size=200).filter(
    lambda x: '\n' not in x and '\r' not in x
)
log_level_strategy = st.sampled_from([
    logging.DEBUG,
    logging.INFO,
    logging.WARNING,
    logging.ERROR,
    logging.CRITICAL
])


def _extract_trace_id_from_log(log_line: str) -> str:
    """Extract trace_id from log line"""
    # Pattern: [timestamp] [level] [trace_id] [module] message
    pattern = r'\[.*?\] \[.*?\] \[(.*?)\] \[.*?\]'
    match = re.search(pattern, log_line)
    if match:
        return match.group(1)
    return None


def _is_valid_uuid(value: str) -> bool:
    """Check if string is valid UUID"""
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError):
        return False


# Property 6: Log Entry Format with Trace ID
@settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    message=log_message_strategy,
    trace_id=valid_uuid_strategy,
    log_level=log_level_strategy
)
def test_property_log_entry_format_with_trace_id(app, client, message, trace_id, log_level):
    """
    Property 6: Log Entry Format with Trace ID
    Validates: Requirements 2.1, 2.2
    
    For any log message, the formatted output should include the trace ID
    in the format: [timestamp] [level] [trace_id] [module] message
    """
    with app.test_request_context(headers={'x-trace-id': trace_id}):
        # Trigger before_request to set trace_id
        app.preprocess_request()
        
        # Verify trace_id is set in g
        assert hasattr(g, 'trace_id')
        assert g.trace_id == trace_id
        
        # Create logger with string stream
        log_stream = StringIO()
        logger = logging.getLogger(f'test_{trace_id}')
        logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Create handler with string stream
        handler = logging.StreamHandler(log_stream)
        formatter = TraceIDFormatter(
            '[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Log message
        logger.log(log_level, message)
        
        # Get log output
        log_output = log_stream.getvalue()
        
        # Verify log format
        assert log_output, "Log output should not be empty"
        
        # Extract trace_id from log
        extracted_trace_id = _extract_trace_id_from_log(log_output)
        assert extracted_trace_id is not None, "Trace ID should be present in log"
        assert extracted_trace_id == trace_id, f"Trace ID should match: expected {trace_id}, got {extracted_trace_id}"
        
        # Verify message is in log
        assert message in log_output, "Log message should be present in output"
        
        # Verify log level name is in log
        level_name = logging.getLevelName(log_level)
        assert level_name in log_output, f"Log level {level_name} should be present in output"


# Unit test: Missing trace ID fallback
def test_missing_trace_id_fallback(app):
    """
    Test that when trace_id is not in flask.g, the logger uses "NO_TRACE"
    Validates: Requirements 2.3
    """
    with app.test_request_context():
        # Don't trigger before_request, so trace_id is not set
        
        # Create logger with string stream
        log_stream = StringIO()
        logger = logging.getLogger('test_no_trace')
        logger.setLevel(logging.INFO)
        
        # Remove existing handlers
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Create handler with string stream
        handler = logging.StreamHandler(log_stream)
        formatter = TraceIDFormatter(
            '[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Log message
        test_message = 'Test message without trace ID'
        logger.info(test_message)
        
        # Get log output
        log_output = log_stream.getvalue()
        
        # Verify "NO_TRACE" is used
        assert 'NO_TRACE' in log_output, "Should use NO_TRACE when trace_id is not available"
        assert test_message in log_output, "Log message should be present"


# Unit test: Log format pattern
def test_log_format_pattern():
    """
    Test that log format matches the expected pattern
    """
    # Create logger with string stream
    log_stream = StringIO()
    logger = logging.getLogger('test_format')
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create handler with string stream
    handler = logging.StreamHandler(log_stream)
    formatter = TraceIDFormatter(
        '[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Log message (outside request context, should use NO_TRACE)
    test_message = 'Test format pattern'
    logger.info(test_message)
    
    # Get log output
    log_output = log_stream.getvalue().strip()
    
    # Verify format pattern: [timestamp] [level] [trace_id] [module] message
    pattern = r'\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] \[INFO\] \[NO_TRACE\] \[test_format\] Test format pattern'
    assert re.match(pattern, log_output), f"Log format should match pattern. Got: {log_output}"


# Unit test: Different log levels
def test_different_log_levels():
    """
    Test that formatter works with different log levels
    """
    log_stream = StringIO()
    logger = logging.getLogger('test_levels')
    logger.setLevel(logging.DEBUG)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create handler with string stream
    handler = logging.StreamHandler(log_stream)
    formatter = TraceIDFormatter(
        '[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Log at different levels
    logger.debug('Debug message')
    logger.info('Info message')
    logger.warning('Warning message')
    logger.error('Error message')
    logger.critical('Critical message')
    
    # Get log output
    log_output = log_stream.getvalue()
    
    # Verify all levels are present
    assert 'DEBUG' in log_output
    assert 'INFO' in log_output
    assert 'WARNING' in log_output
    assert 'ERROR' in log_output
    assert 'CRITICAL' in log_output
    
    # Verify all messages are present
    assert 'Debug message' in log_output
    assert 'Info message' in log_output
    assert 'Warning message' in log_output
    assert 'Error message' in log_output
    assert 'Critical message' in log_output
