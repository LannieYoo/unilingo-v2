#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exception Context Data Contract
예외 컨텍스트 데이터 계약
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class DExceptionContext:
    """예외 컨텍스트 데이터"""
    
    trace_id: str
    source: str
    module: str
    function: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    user_id: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)
