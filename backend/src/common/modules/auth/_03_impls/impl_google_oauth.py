"""
Google OAuth client implementation.
"""
import os
from urllib.parse import urlencode
import httpx
from .._01_contracts import DGoogleUserInfo, DGoogleTokens, GoogleOAuthError


class GoogleOAuthClient:
    """Google OAuth 2.0 client."""
    
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
    ):
        self._client_id = client_id or os.getenv("GOOGLE_CLIENT_ID")
        self._client_secret = client_secret or os.getenv("GOOGLE_CLIENT_SECRET")
        
        if not self._client_id or not self._client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
    
    def get_authorization_url(self, redirect_uri: str, state: str = None) -> str:
        """
        Get Google OAuth authorization URL.
        
        Args:
            redirect_uri: Callback URL after authentication
            state: Optional state parameter for CSRF protection
            
        Returns:
            Authorization URL
        """
        params = {
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        
        if state:
            params["state"] = state
        
        return f"{self.GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> DGoogleTokens:
        """
        Exchange authorization code for tokens.
        
        Args:
            code: Authorization code from Google
            redirect_uri: Callback URL used in authorization
            
        Returns:
            Google tokens
            
        Raises:
            GoogleOAuthError: If token exchange fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.GOOGLE_TOKEN_URL,
                    data={
                        "client_id": self._client_id,
                        "client_secret": self._client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                )
                
                if response.status_code != 200:
                    raise GoogleOAuthError(f"Token exchange failed: {response.text}")
                
                data = response.json()
                
                return DGoogleTokens(
                    access_token=data["access_token"],
                    refresh_token=data.get("refresh_token"),
                    expires_in=data.get("expires_in", 3600),
                    token_type=data.get("token_type", "Bearer"),
                    scope=data.get("scope", ""),
                    id_token=data.get("id_token"),
                )
            except httpx.RequestError as e:
                raise GoogleOAuthError(f"Network error: {str(e)}")
    
    async def get_user_info(self, access_token: str) -> DGoogleUserInfo:
        """
        Get user info from Google.
        
        Args:
            access_token: Google access token
            
        Returns:
            Google user info
            
        Raises:
            GoogleOAuthError: If user info request fails
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                
                if response.status_code != 200:
                    raise GoogleOAuthError(f"User info request failed: {response.text}")
                
                data = response.json()
                
                return DGoogleUserInfo(
                    google_id=data["id"],
                    email=data["email"],
                    name=data.get("name", data["email"].split("@")[0]),
                    picture=data.get("picture"),
                )
            except httpx.RequestError as e:
                raise GoogleOAuthError(f"Network error: {str(e)}")


# Singleton instance (lazy initialization)
_google_oauth_client = None


def get_google_oauth_client() -> GoogleOAuthClient:
    """Get Google OAuth client singleton."""
    global _google_oauth_client
    if _google_oauth_client is None:
        _google_oauth_client = GoogleOAuthClient()
    return _google_oauth_client
