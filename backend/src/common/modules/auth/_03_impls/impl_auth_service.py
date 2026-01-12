"""
Auth service implementation.
"""
import os
from typing import Optional
from sqlalchemy.orm import Session
from .._01_contracts import (
    IAuthService,
    IUserRepository,
    ILoginLogRepository,
    DUser,
    DUserCreate,
    DToken,
    DTokenPayload,
    DLoginLogCreate,
    GoogleOAuthError,
    DatabaseError,
)
from .._08_utils import JWTHelper
from .._06_models import UserRepository, LoginLogRepository
from .impl_google_oauth import GoogleOAuthClient, get_google_oauth_client

# Admin email from environment
ADMIN_USER = os.getenv('ADMIN_USER', '')


class AuthServiceImpl(IAuthService):
    """Auth service implementation."""
    
    def __init__(
        self,
        db: Session,
        google_client: GoogleOAuthClient = None,
        jwt_helper: JWTHelper = None,
    ):
        self._db = db
        self._google_client = google_client or get_google_oauth_client()
        self._jwt_helper = jwt_helper or JWTHelper()
        self._user_repo: IUserRepository = UserRepository(db)
        self._login_log_repo: ILoginLogRepository = LoginLogRepository(db)
    
    def _is_admin(self, email: str) -> bool:
        """Check if user is admin."""
        return ADMIN_USER and email == ADMIN_USER
    
    def get_google_auth_url(self, redirect_uri: str) -> str:
        """Get Google OAuth authorization URL."""
        return self._google_client.get_authorization_url(redirect_uri)
    
    async def authenticate_google(
        self, 
        code: str, 
        redirect_uri: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[DUser, DToken]:
        """Authenticate user with Google OAuth code."""
        try:
            # Exchange code for tokens
            google_tokens = await self._google_client.exchange_code_for_tokens(code, redirect_uri)
            
            # Get user info from Google
            google_user = await self._google_client.get_user_info(google_tokens.access_token)
            
            # Find or create user
            user = self._user_repo.get_by_google_id(google_user.google_id)
            
            # Check if admin (admin can have multiple sessions)
            is_admin = self._is_admin(google_user.email)
            
            if user:
                # Check if user is deactivated (non-admin users only)
                if not user.is_active and not is_admin:
                    raise GoogleOAuthError("Your account has been deactivated. Please contact administrator.")
                
                # Update login timestamp and increment token_version for non-admin users
                # This invalidates all previous tokens for non-admin users
                user = self._user_repo.update_login(user.id, increment_token_version=not is_admin)
            else:
                # Create new user
                user_data = DUserCreate(
                    google_id=google_user.google_id,
                    email=google_user.email,
                    name=google_user.name,
                    avatar_url=google_user.picture,
                )
                user = self._user_repo.create(user_data)
            
            # Log the login event
            self._log_login(user.id, ip_address, user_agent)
            
            # Create JWT tokens with current token_version
            tokens = self.create_tokens(user)
            
            return user, tokens
            
        except GoogleOAuthError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database error: {str(e)}")
    
    def _log_login(
        self, 
        user_id: int, 
        ip_address: Optional[str] = None, 
        user_agent: Optional[str] = None
    ) -> None:
        """Log login event to database."""
        try:
            log_data = DLoginLogCreate(
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self._login_log_repo.create(log_data)
        except Exception as e:
            # Don't fail authentication if logging fails
            import logging
            logging.getLogger(__name__).warning(f"Failed to log login: {e}")
    
    def create_tokens(self, user: DUser) -> DToken:
        """Create access and refresh tokens for user."""
        return self._jwt_helper.create_tokens(user.id, user.email, user.token_version)
    
    def verify_token(self, token: str) -> Optional[DTokenPayload]:
        """Verify and decode JWT token."""
        return self._jwt_helper.verify_access_token(token)
    
    def verify_token_version(self, payload: DTokenPayload, user: DUser) -> bool:
        """Verify token version matches user's current token version."""
        # Admin users bypass token version check (allow multiple sessions)
        if self._is_admin(user.email):
            return True
        return payload.token_version == user.token_version
    
    def refresh_access_token(self, refresh_token: str) -> Optional[DToken]:
        """Refresh access token using refresh token."""
        # Verify refresh token
        payload = self._jwt_helper.verify_refresh_token(refresh_token)
        
        # Get user from database
        user = self._user_repo.get_by_id(payload.user_id)
        if not user or not user.is_active:
            return None
        
        # Verify token version (non-admin users)
        if not self.verify_token_version(payload, user):
            return None
        
        # Create new tokens with current token_version
        return self.create_tokens(user)
    
    def get_user_by_id(self, user_id: int) -> Optional[DUser]:
        """Get user by ID."""
        return self._user_repo.get_by_id(user_id)
