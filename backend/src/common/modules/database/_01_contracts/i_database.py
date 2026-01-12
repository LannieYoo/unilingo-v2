"""
Database interface contract.
"""
from abc import ABC, abstractmethod
from typing import Generator
from sqlalchemy.orm import Session


class IDatabase(ABC):
    """Database interface for dependency injection."""
    
    @abstractmethod
    def get_session(self) -> Generator[Session, None, None]:
        """Get database session."""
        ...
    
    @abstractmethod
    def create_tables(self) -> None:
        """Create all tables."""
        ...
