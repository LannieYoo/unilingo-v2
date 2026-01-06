#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dependency Status Data Contract
의존성 상태 데이터 계약
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class DDependencyStatus:
    """시스템 의존성 상태"""
    name: str
    required: bool
    available: bool
    version: Optional[str] = None
    installation_guide: Optional[str] = None
    error_details: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'required': self.required,
            'available': self.available,
            'version': self.version,
            'installation_guide': self.installation_guide,
            'error_details': self.error_details
        }
