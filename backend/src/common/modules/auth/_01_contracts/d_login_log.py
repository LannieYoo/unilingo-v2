"""
Login log data contract.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class DLoginLog:
    """Login log data contract."""
    id: int
    user_id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    login_at: datetime
    
    
@dataclass
class DLoginLogCreate:
    """Login log creation data contract."""
    user_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
