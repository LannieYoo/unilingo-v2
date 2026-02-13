#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Events Module
Handles error event storage and retrieval
"""

from .service import (
    create_error_event,
    get_error_events,
    get_error_events_by_trace_id
)
from .router import errors_bp

__all__ = [
    'create_error_event',
    'get_error_events',
    'get_error_events_by_trace_id',
    'errors_bp'
]
