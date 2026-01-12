"""
Login log repository interface.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from .d_login_log import DLoginLog, DLoginLogCreate


class ILoginLogRepository(ABC):
    """Login log repository interface."""
    
    @abstractmethod
    def create(self, data: DLoginLogCreate) -> DLoginLog:
        """Create a new login log entry."""
        pass
    
    @abstractmethod
    def get_by_user_id(self, user_id: int, limit: int = 10) -> List[DLoginLog]:
        """Get login logs by user ID."""
        pass
    
    @abstractmethod
    def get_recent(self, limit: int = 100) -> List[DLoginLog]:
        """Get recent login logs."""
        pass
