#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Input Validation Utilities
"""

from typing import List
from backend.middleware.error_handler import ValidationError


def validate_language_code(lang: str, valid_langs: List[str] = None) -> str:
    """
    Validate language code
    
    Args:
        lang: Language code to validate
        valid_langs: List of valid language codes (default: ['ko', 'en', 'zh'])
        
    Returns:
        Validated language code
        
    Raises:
        ValidationError: If language code is invalid
    """
    if valid_langs is None:
        valid_langs = ['ko', 'en', 'zh']
    
    if not lang:
        raise ValidationError("Language code is required")
    
    if lang not in valid_langs:
        raise ValidationError(f"Invalid language code. Must be one of: {valid_langs}")
    
    return lang


def validate_text_length(text: str, min_length: int = 1, max_length: int = 5000) -> str:
    """
    Validate text length
    
    Args:
        text: Text to validate
        min_length: Minimum length
        max_length: Maximum length
        
    Returns:
        Validated text
        
    Raises:
        ValidationError: If text length is invalid
    """
    if not text:
        raise ValidationError("Text is required")
    
    if len(text) < min_length:
        raise ValidationError(f"Text too short. Minimum {min_length} characters")
    
    if len(text) > max_length:
        raise ValidationError(f"Text too long. Maximum {max_length} characters")
    
    return text


def validate_audio_file(file, max_size: int = 10 * 1024 * 1024) -> bool:
    """
    Validate audio file
    
    Args:
        file: File object
        max_size: Maximum file size in bytes (default: 10MB)
        
    Returns:
        True if valid
        
    Raises:
        ValidationError: If file is invalid
    """
    if not file:
        raise ValidationError("Audio file is required")
    
    if file.filename == '':
        raise ValidationError("No file selected")
    
    # Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Seek back to start
    
    if file_size > max_size:
        raise ValidationError(f"File too large. Maximum {max_size // (1024 * 1024)}MB")
    
    if file_size < 100:
        raise ValidationError("File too small. Minimum 100 bytes")
    
    return True
