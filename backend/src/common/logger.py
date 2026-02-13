#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Custom Logger with Trace ID Support
Formats log messages to include trace IDs for request correlation
"""

import logging
from flask import Flask, g, has_request_context


class TraceIDFormatter(logging.Formatter):
    """
    Custom formatter that includes trace_id in log messages
    
    Format: [timestamp] [level] [trace_id] [module] message
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record with trace_id
        
        Gets trace_id from flask.g.trace_id if available,
        otherwise uses "NO_TRACE" as fallback.
        """
        # Get trace_id from flask.g if in request context
        if has_request_context():
            trace_id = getattr(g, 'trace_id', 'NO_TRACE')
        else:
            trace_id = 'NO_TRACE'
        
        # Add trace_id to log record
        record.trace_id = trace_id
        
        # Format using parent formatter
        return super().format(record)


def setup_logging(app: Flask) -> None:
    """
    Configure application logging with trace ID support
    
    Sets up:
    - Custom TraceIDFormatter for all handlers
    - Log format: [%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s
    - Log level from app config or INFO by default
    """
    # Define log format
    log_format = '[%(asctime)s] [%(levelname)s] [%(trace_id)s] [%(name)s] %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Create formatter
    formatter = TraceIDFormatter(log_format, datefmt=date_format)
    
    # Get log level from config or use INFO
    log_level = app.config.get('LOG_LEVEL', logging.INFO)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Configure app logger
    app.logger.setLevel(log_level)
    
    # Remove existing handlers from app logger
    for handler in app.logger.handlers[:]:
        app.logger.removeHandler(handler)
    
    # Add console handler to app logger
    app.logger.addHandler(console_handler)
    
    app.logger.info('Logging configured with trace ID support')


__all__ = ['TraceIDFormatter', 'setup_logging']
