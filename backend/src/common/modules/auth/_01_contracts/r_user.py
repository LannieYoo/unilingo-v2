"""
User repository interface contract.
"""
from abc import ABC, abstractmethod
from typing import Optional
from .d_user import DUser, DUserCreate


class IUserRepository(ABC):
    """User repository interface for dependency injection."""
    
    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[DUser]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User data if found, None otherwise
        """
        ...
    
    @abstractmethod
    def get_by_google_id(self, google_id: str) -> Optional[DUser]:
        """
        Get user by Google ID.
        
        Args:
            google_id: Google user ID
            
        Returns:
            User data if found, None otherwise
        """
        ...
    
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[DUser]:
        """
        Get user by email.
        
        Args:
            email: User email
            
        Returns:
            User data if found, None otherwise
        """
        ...
    
    @abstractmethod
    def create(self, user_data: DUserCreate) -> DUser:
        """
        Create new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user data
        """
        ...
    
    @abstractmethod
    def update_login(self, user_id: int) -> Optional[DUser]:
        """
        Update user's last login timestamp.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user data if found, None otherwise
        """
        ...
