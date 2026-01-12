"""
JWT helper utilities.
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from .._01_contracts import DTokenPayload, DToken, ETokenType, TokenExpiredError, InvalidTokenError


class JWTHelper:
    """JWT encoding and decoding helper."""
    
    def __init__(
        self,
        secret_key: str = None,
        algorithm: str = None,
        access_token_expire_minutes: int = None,
        refresh_token_expire_days: int = None,
    ):
        self._secret_key = secret_key or os.getenv("JWT_SECRET_KEY", "default_secret_key_change_me")
        self._algorithm = algorithm or os.getenv("JWT_ALGORITHM", "HS256")
        self._access_token_expire_minutes = access_token_expire_minutes or int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
        )
        self._refresh_token_expire_days = refresh_token_expire_days or int(
            os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
        )
    
    def create_access_token(self, user_id: int, email: str, token_version: int = 1) -> str:
        """
        Create access token.
        
        Args:
            user_id: User ID
            email: User email
            token_version: Token version for single session enforcement
            
        Returns:
            JWT access token string
        """
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self._access_token_expire_minutes)
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "exp": expire,
            "iat": now,
            "token_type": ETokenType.ACCESS.value,
            "token_version": token_version,
        }
        
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)
    
    def create_refresh_token(self, user_id: int, email: str, token_version: int = 1) -> str:
        """
        Create refresh token.
        
        Args:
            user_id: User ID
            email: User email
            token_version: Token version for single session enforcement
            
        Returns:
            JWT refresh token string
        """
        now = datetime.utcnow()
        expire = now + timedelta(days=self._refresh_token_expire_days)
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "exp": expire,
            "iat": now,
            "token_type": ETokenType.REFRESH.value,
            "token_version": token_version,
        }
        
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)
    
    def create_tokens(self, user_id: int, email: str, token_version: int = 1) -> DToken:
        """
        Create both access and refresh tokens.
        
        Args:
            user_id: User ID
            email: User email
            token_version: Token version for single session enforcement
            
        Returns:
            DToken with access and refresh tokens
        """
        access_token = self.create_access_token(user_id, email, token_version)
        refresh_token = self.create_refresh_token(user_id, email, token_version)
        
        return DToken(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=self._access_token_expire_minutes * 60,
        )
    
    def decode_token(self, token: str) -> Optional[DTokenPayload]:
        """
        Decode and verify JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            DTokenPayload if valid, None otherwise
            
        Raises:
            TokenExpiredError: If token is expired
            InvalidTokenError: If token is invalid
        """
        try:
            payload = jwt.decode(token, self._secret_key, algorithms=[self._algorithm])
            
            return DTokenPayload(
                sub=payload["sub"],
                email=payload["email"],
                exp=datetime.fromtimestamp(payload["exp"]),
                iat=datetime.fromtimestamp(payload["iat"]),
                token_type=payload.get("token_type", ETokenType.ACCESS.value),
                token_version=payload.get("token_version", 1),
            )
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()
        except JWTError:
            raise InvalidTokenError()
    
    def verify_access_token(self, token: str) -> Optional[DTokenPayload]:
        """
        Verify access token.
        
        Args:
            token: JWT access token string
            
        Returns:
            DTokenPayload if valid access token
            
        Raises:
            TokenExpiredError: If token is expired
            InvalidTokenError: If token is invalid or not an access token
        """
        payload = self.decode_token(token)
        
        if payload.token_type != ETokenType.ACCESS.value:
            raise InvalidTokenError("유효하지 않은 액세스 토큰입니다")
        
        return payload
    
    def verify_refresh_token(self, token: str) -> Optional[DTokenPayload]:
        """
        Verify refresh token.
        
        Args:
            token: JWT refresh token string
            
        Returns:
            DTokenPayload if valid refresh token
            
        Raises:
            TokenExpiredError: If token is expired
            InvalidTokenError: If token is invalid or not a refresh token
        """
        payload = self.decode_token(token)
        
        if payload.token_type != ETokenType.REFRESH.value:
            raise InvalidTokenError("유효하지 않은 리프레시 토큰입니다")
        
        return payload


# Singleton instance
jwt_helper = JWTHelper()
