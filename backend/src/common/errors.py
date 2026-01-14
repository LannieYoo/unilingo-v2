#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Errors
모든 에러 타입 정의
"""

from typing import Optional


class AppError(Exception):
    """Base application error"""
    
    def __init__(
        self,
        message: str,
        code: str = 'INTERNAL_ERROR',
        status_code: int = 500,
        details: Optional[dict] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
    
    def to_dict(self) -> dict:
        return {
            'error': {
                'code': self.code,
                'message': self.message,
                'details': self.details
            }
        }


class ValidationError(AppError):
    """Validation error"""
    
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            code='VALIDATION_ERROR',
            status_code=400,
            details=details
        )


class AuthenticationError(AppError):
    """Authentication error"""
    
    def __init__(self, message: str = 'Authentication required'):
        super().__init__(
            message=message,
            code='AUTHENTICATION_ERROR',
            status_code=401
        )


class AuthorizationError(AppError):
    """Authorization error"""
    
    def __init__(self, message: str = 'Permission denied'):
        super().__init__(
            message=message,
            code='AUTHORIZATION_ERROR',
            status_code=403
        )


class NotFoundError(AppError):
    """Resource not found error"""
    
    def __init__(self, message: str = 'Resource not found'):
        super().__init__(
            message=message,
            code='NOT_FOUND',
            status_code=404
        )


class SessionExpiredError(AppError):
    """Session expired error"""
    
    def __init__(self, message: str = 'Session expired'):
        super().__init__(
            message=message,
            code='SESSION_EXPIRED',
            status_code=401
        )


class TokenExpiredError(AppError):
    """Token expired error"""
    
    def __init__(self, message: str = 'Token expired'):
        super().__init__(
            message=message,
            code='TOKEN_EXPIRED',
            status_code=401
        )


class ExternalServiceError(AppError):
    """External service error"""
    
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f'{service} service error: {message}',
            code='EXTERNAL_SERVICE_ERROR',
            status_code=503,
            details={'service': service}
        )
