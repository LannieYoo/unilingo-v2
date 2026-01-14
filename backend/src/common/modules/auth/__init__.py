#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Auth module - Google OAuth 2.0 authentication

from .dto import (
    EAuthProvider, ETokenType,
    DUser, DUserCreate, DGoogleUserInfo, DLanguagePreferences,
    DToken, DTokenPayload, DGoogleTokens,
    DLoginLog, DLoginLogCreate,
    DSttLog, DSttLogCreate, DSttLogSummary,
    GoogleAuthRequest, GoogleCallbackRequest, TokenRefreshRequest,
    TokenResponse, UserResponse, LoginResponse,
    SttLogCreateRequest, TranslationLogCreateRequest, DictionaryLogCreateRequest,
    AuthError, GoogleOAuthError, TokenError, TokenExpiredError, InvalidTokenError, UserNotFoundError, DatabaseError,
)

from .service import (
    UserModel, LoginLogModel, SttLogModel, TranslationLogModel, DictionaryLogModel,
    UserRepository, LoginLogRepository, SttLogRepository, TranslationLogRepository, DictionaryLogRepository,
    get_dictionary_log_repository, JWTHelper, GoogleOAuthClient, get_google_oauth_client,
    AuthService, get_auth_service, ADMIN_USER,
)

from .router import (
    router, admin_router,
    login_required, admin_required, token_required,
    get_current_user, get_optional_user, is_admin,
)

__all__ = [
    # Enums
    'EAuthProvider', 'ETokenType',
    # Domain Data Classes
    'DUser', 'DUserCreate', 'DGoogleUserInfo', 'DLanguagePreferences',
    'DToken', 'DTokenPayload', 'DGoogleTokens',
    'DLoginLog', 'DLoginLogCreate',
    'DSttLog', 'DSttLogCreate', 'DSttLogSummary',
    # Pydantic Models
    'GoogleAuthRequest', 'GoogleCallbackRequest', 'TokenRefreshRequest',
    'TokenResponse', 'UserResponse', 'LoginResponse',
    'SttLogCreateRequest', 'TranslationLogCreateRequest', 'DictionaryLogCreateRequest',
    # Exceptions
    'AuthError', 'GoogleOAuthError', 'TokenError', 'TokenExpiredError', 'InvalidTokenError', 'UserNotFoundError', 'DatabaseError',
    # ORM Models
    'UserModel', 'LoginLogModel', 'SttLogModel', 'TranslationLogModel', 'DictionaryLogModel',
    # Repositories
    'UserRepository', 'LoginLogRepository', 'SttLogRepository', 'TranslationLogRepository', 'DictionaryLogRepository',
    'get_dictionary_log_repository',
    # Services
    'JWTHelper', 'GoogleOAuthClient', 'get_google_oauth_client', 'AuthService', 'get_auth_service', 'ADMIN_USER',
    # Router
    'router', 'admin_router',
    'login_required', 'admin_required', 'token_required',
    'get_current_user', 'get_optional_user', 'is_admin',
]
