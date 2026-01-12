"""
Auth enum contracts.
"""
from enum import Enum


class EAuthProvider(str, Enum):
    """Authentication provider enum."""
    GOOGLE = "google"
    # Future providers can be added here
    # GITHUB = "github"
    # FACEBOOK = "facebook"


class ETokenType(str, Enum):
    """Token type enum."""
    ACCESS = "access"
    REFRESH = "refresh"
