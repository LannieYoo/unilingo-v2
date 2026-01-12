"""
Auth service interface contract.
"""
from abc import ABC, abstractmethod
from typing import Optional
from .d_user import DUser, DUserCreate
from .d_token import DToken, DTokenPayload


class IAuthService(ABC):
    """Auth service interface for dependency injection."""
    
    @abstractmethod
    def get_google_auth_url(self, redirect_uri: str) -> str:
        """
        Get Google OAuth authorization URL.
        
        Args:
            redirect_uri: Callback URL after Google authentication
            
        Returns:
            Google OAuth authorization URL
        """
        ...
    
    @abstractmethod
    async def authenticate_google(
        self, 
        code: str, 
        redirect_uri: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[DUser, DToken]:
        """
        Authenticate user with Google OAuth code.
        
        Args:
            code: Authorization code from Google
            redirect_uri: Callback URL used in authorization
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (user data, tokens)
        """
        ...
    
    @abstractmethod
    def create_tokens(self, user: DUser) -> DToken:
        """
        Create access and refresh tokens for user.
        
        Args:
            user: User data
            
        Returns:
            Token data with access and refresh tokens
        """
        ...
    
    @abstractmethod
    def verify_token(self, token: str) -> Optional[DTokenPayload]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload if valid, None otherwise
        """
        ...
    
    @abstractmethod
    def refresh_access_token(self, refresh_token: str) -> Optional[DToken]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token string
            
        Returns:
            New token data if valid, None otherwise
        """
        ...
