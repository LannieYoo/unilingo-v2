#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Usage Service
Business logic for usage tracking and limit enforcement
"""

from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy import Column, BigInteger, String, Integer, DateTime, text
from sqlalchemy.dialects.postgresql import insert
from src.common.supabase import get_db, Base
from config import Config


class UsageLog(Base):
    """SQLAlchemy model for usage_logs table"""
    __tablename__ = 'usage_logs'
    __table_args__ = {'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    month = Column(String(7), nullable=False, index=True)
    translation_chars = Column(Integer, nullable=False, default=0)  # Legacy
    stt_chars = Column(Integer, nullable=False, default=0)  # Legacy
    translator_chars = Column(Integer, nullable=False, default=0)  # New: Translator only
    tts_chars = Column(Integer, nullable=False, default=0)  # New: TTS only
    stt_stream_chars = Column(Integer, nullable=False, default=0)  # New: STT Stream only
    dictionary_searches = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text('NOW()'))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text('NOW()'))


class GuestUsageLog(Base):
    """SQLAlchemy model for guest_usage_logs table"""
    __tablename__ = 'guest_usage_logs'
    __table_args__ = {'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True)
    ip_address = Column(String(45), nullable=False, index=True)
    month = Column(String(7), nullable=False, index=True)
    translation_chars = Column(Integer, nullable=False, default=0)  # Legacy
    stt_chars = Column(Integer, nullable=False, default=0)  # Legacy
    translator_chars = Column(Integer, nullable=False, default=0)  # New: Translator only
    tts_chars = Column(Integer, nullable=False, default=0)  # New: TTS only
    stt_stream_chars = Column(Integer, nullable=False, default=0)  # New: STT Stream only
    dictionary_searches = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text('NOW()'))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text('NOW()'))


class UsageService:
    """Service for tracking and enforcing usage limits"""
    
    @staticmethod
    def get_monthly_limit(feature: str, user_level: str, approval_status: str = 'approved') -> Optional[int]:
        """
        Get monthly limit for specific feature and user level
        
        Args:
            feature: Feature name ('translator', 'tts', 'stt_stream', 'dictionary')
            user_level: User subscription level (guest, pro, admin)
            approval_status: Approval status ('pending', 'approved', 'rejected')
        
        Returns:
            Character/search limit or None for unlimited (admin)
        """
        # Admin always has unlimited access
        if user_level == 'admin':
            return None
        
        # For dictionary, use separate limits
        if feature == 'dictionary':
            # Guest or pending users get guest limit
            if user_level == 'guest' or approval_status == 'pending':
                limit = Config.DICTIONARY_LIMITS.get('guest', 100)
            else:
                limit = Config.DICTIONARY_LIMITS.get('approved', 5000)
            return None if limit == -1 else limit
        
        # For other features (translator, tts, stt_stream)
        if feature not in Config.USAGE_LIMITS:
            feature = 'translator'  # Default fallback
        
        # Guest or pending users get guest limit
        if user_level == 'guest' or approval_status == 'pending':
            limit = Config.USAGE_LIMITS[feature].get('guest', 5000)
        else:
            limit = Config.USAGE_LIMITS[feature].get('approved', 50000)
        
        return None if limit == -1 else limit
    
    @staticmethod
    def get_current_month() -> str:
        """
        Get current month in YYYY-MM format
        
        Returns:
            Current month string (e.g., "2026-02")
        """
        return datetime.now().strftime("%Y-%m")
    
    @staticmethod
    def calculate_total_usage(translation_chars: int, stt_chars: int) -> int:
        """
        Sum translation and STT usage
        
        Args:
            translation_chars: Translation character count
            stt_chars: STT character count
        
        Returns:
            Total character count
        """
        return translation_chars + stt_chars
    
    @staticmethod
    def calculate_percentage(total: int, limit: Optional[int]) -> Optional[float]:
        """
        Calculate usage percentage
        
        Args:
            total: Total character count
            limit: Monthly limit (None for unlimited)
        
        Returns:
            Percentage (0-100) or None for unlimited
        """
        if limit is None:
            return None
        return (total / limit) * 100 if limit > 0 else 0.0
    
    @staticmethod
    def get_current_usage(user_id: int, user_level: str, approval_status: str = 'approved') -> dict:
        """
        Get current month usage for a user
        
        Args:
            user_id: User identifier
            user_level: User subscription level
            approval_status: Approval status ('pending', 'approved', 'rejected')
        
        Returns:
            Dictionary with usage data for each feature
        """
        session = next(get_db())
        current_month = UsageService.get_current_month()
        
        try:
            # Query usage record for current month
            usage_record = session.query(UsageLog).filter(
                UsageLog.user_id == user_id,
                UsageLog.month == current_month
            ).first()
            
            # If no record exists, return zeros
            if not usage_record:
                translator_chars = 0
                tts_chars = 0
                stt_stream_chars = 0
                dictionary_searches = 0
            else:
                translator_chars = usage_record.translator_chars if hasattr(usage_record, 'translator_chars') else 0
                tts_chars = usage_record.tts_chars if hasattr(usage_record, 'tts_chars') else 0
                stt_stream_chars = usage_record.stt_stream_chars if hasattr(usage_record, 'stt_stream_chars') else 0
                dictionary_searches = usage_record.dictionary_searches if hasattr(usage_record, 'dictionary_searches') else 0
            
            # Get limits for each feature
            translator_limit = UsageService.get_monthly_limit('translator', user_level, approval_status)
            tts_limit = UsageService.get_monthly_limit('tts', user_level, approval_status)
            stt_stream_limit = UsageService.get_monthly_limit('stt_stream', user_level, approval_status)
            dictionary_limit = UsageService.get_monthly_limit('dictionary', user_level, approval_status)
            
            # Calculate percentages
            translator_percentage = UsageService.calculate_percentage(translator_chars, translator_limit)
            tts_percentage = UsageService.calculate_percentage(tts_chars, tts_limit)
            stt_stream_percentage = UsageService.calculate_percentage(stt_stream_chars, stt_stream_limit)
            dictionary_percentage = UsageService.calculate_percentage(dictionary_searches, dictionary_limit)
            
            return {
                'translator_chars': translator_chars,
                'translator_limit': translator_limit,
                'translator_percentage': translator_percentage,
                'tts_chars': tts_chars,
                'tts_limit': tts_limit,
                'tts_percentage': tts_percentage,
                'stt_stream_chars': stt_stream_chars,
                'stt_stream_limit': stt_stream_limit,
                'stt_stream_percentage': stt_stream_percentage,
                'dictionary_searches': dictionary_searches,
                'dictionary_limit': dictionary_limit,
                'dictionary_percentage': dictionary_percentage,
                'month': current_month,
                'user_level': user_level,
                'approval_status': approval_status
            }
        finally:
            session.close()
    
    @staticmethod
    def track_usage(user_id: int, char_count: int, usage_type: str) -> None:
        """
        Record character usage for translator, tts, stt_stream, or dictionary
        
        Uses UPSERT (INSERT ... ON CONFLICT UPDATE) for concurrent safety
        
        Args:
            user_id: User identifier
            char_count: Number of characters processed (or searches for dictionary)
            usage_type: 'translator', 'tts', 'stt_stream', or 'dictionary'
        
        Raises:
            ValueError: If usage_type is invalid
        """
        valid_types = ['translator', 'tts', 'stt_stream', 'dictionary', 'translation', 'stt']
        if usage_type not in valid_types:
            raise ValueError(f"Invalid usage_type: {usage_type}. Must be one of {valid_types}")
        
        # Map legacy types to new types
        type_mapping = {
            'translation': 'translator',
            'stt': 'stt_stream'
        }
        usage_type = type_mapping.get(usage_type, usage_type)
        
        session = next(get_db())
        current_month = UsageService.get_current_month()
        
        try:
            # Prepare column to increment
            if usage_type == 'translator':
                column_to_increment = 'translator_chars'
            elif usage_type == 'tts':
                column_to_increment = 'tts_chars'
            elif usage_type == 'stt_stream':
                column_to_increment = 'stt_stream_chars'
            else:  # dictionary
                column_to_increment = 'dictionary_searches'
            
            # UPSERT: Insert new record or update existing
            stmt = insert(UsageLog).values(
                user_id=user_id,
                month=current_month,
                translator_chars=char_count if usage_type == 'translator' else 0,
                tts_chars=char_count if usage_type == 'tts' else 0,
                stt_stream_chars=char_count if usage_type == 'stt_stream' else 0,
                dictionary_searches=char_count if usage_type == 'dictionary' else 0
            ).on_conflict_do_update(
                index_elements=['user_id', 'month'],
                set_={
                    column_to_increment: getattr(UsageLog, column_to_increment) + char_count,
                    'updated_at': datetime.now()
                }
            )
            
            session.execute(stmt)
            session.commit()
        finally:
            session.close()
    
    @staticmethod
    def check_limit(user_id: int, user_level: str, char_count: int, feature: str, approval_status: str = 'approved') -> Tuple[bool, Optional[str]]:
        """
        Check if user can process char_count characters for specific feature
        
        Args:
            user_id: User identifier
            user_level: User subscription level
            char_count: Number of characters to process
            feature: Feature name ('translator', 'tts', 'stt_stream', 'dictionary')
            approval_status: Approval status ('pending', 'approved', 'rejected')
        
        Returns:
            Tuple of (can_proceed: bool, error_message: Optional[str])
        """
        # Admin users have unlimited access
        if user_level == 'admin':
            return (True, None)
        
        # Get current usage
        usage = UsageService.get_current_usage(user_id, user_level, approval_status)
        
        # Get feature-specific usage and limit
        if feature == 'translator':
            current_usage = usage['translator_chars']
            limit = usage['translator_limit']
        elif feature == 'tts':
            current_usage = usage['tts_chars']
            limit = usage['tts_limit']
        elif feature == 'stt_stream':
            current_usage = usage['stt_stream_chars']
            limit = usage['stt_stream_limit']
        elif feature == 'dictionary':
            current_usage = usage['dictionary_searches']
            limit = usage['dictionary_limit']
        else:
            return (False, f"Invalid feature: {feature}")
        
        # If no limit (shouldn't happen for non-admin), allow
        if limit is None:
            return (True, None)
        
        # Check if current + new usage would exceed limit
        new_total = current_usage + char_count
        
        if new_total > limit:
            return (False, f"Usage limit exceeded for {feature}. Current: {current_usage}, Limit: {limit}, Requested: {char_count}")
        
        return (True, None)
    
    @staticmethod
    def get_guest_usage(ip_address: str) -> dict:
        """
        Get current month usage for a guest user (by IP)
        
        Args:
            ip_address: IP address of the guest user
        
        Returns:
            Dictionary with usage data for each feature
        """
        session = next(get_db())
        current_month = UsageService.get_current_month()
        
        try:
            # Query usage record for current month
            usage_record = session.query(GuestUsageLog).filter(
                GuestUsageLog.ip_address == ip_address,
                GuestUsageLog.month == current_month
            ).first()
            
            # If no record exists, return zeros
            if not usage_record:
                translator_chars = 0
                tts_chars = 0
                stt_stream_chars = 0
                dictionary_searches = 0
            else:
                translator_chars = usage_record.translator_chars if hasattr(usage_record, 'translator_chars') else 0
                tts_chars = usage_record.tts_chars if hasattr(usage_record, 'tts_chars') else 0
                stt_stream_chars = usage_record.stt_stream_chars if hasattr(usage_record, 'stt_stream_chars') else 0
                dictionary_searches = usage_record.dictionary_searches if hasattr(usage_record, 'dictionary_searches') else 0
            
            # Get limits for each feature (guest limits)
            translator_limit = UsageService.get_monthly_limit('translator', 'guest', 'pending')
            tts_limit = UsageService.get_monthly_limit('tts', 'guest', 'pending')
            stt_stream_limit = UsageService.get_monthly_limit('stt_stream', 'guest', 'pending')
            dictionary_limit = UsageService.get_monthly_limit('dictionary', 'guest', 'pending')
            
            # Calculate percentages
            translator_percentage = UsageService.calculate_percentage(translator_chars, translator_limit)
            tts_percentage = UsageService.calculate_percentage(tts_chars, tts_limit)
            stt_stream_percentage = UsageService.calculate_percentage(stt_stream_chars, stt_stream_limit)
            dictionary_percentage = UsageService.calculate_percentage(dictionary_searches, dictionary_limit)
            
            return {
                'translator_chars': translator_chars,
                'translator_limit': translator_limit,
                'translator_percentage': translator_percentage,
                'tts_chars': tts_chars,
                'tts_limit': tts_limit,
                'tts_percentage': tts_percentage,
                'stt_stream_chars': stt_stream_chars,
                'stt_stream_limit': stt_stream_limit,
                'stt_stream_percentage': stt_stream_percentage,
                'dictionary_searches': dictionary_searches,
                'dictionary_limit': dictionary_limit,
                'dictionary_percentage': dictionary_percentage,
                'month': current_month,
                'user_level': 'guest',
                'approval_status': 'pending'
            }
        finally:
            session.close()
    
    @staticmethod
    def track_guest_usage(ip_address: str, char_count: int, usage_type: str) -> None:
        """
        Record character usage for guest user (by IP)
        
        Uses UPSERT (INSERT ... ON CONFLICT UPDATE) for concurrent safety
        
        Args:
            ip_address: IP address of the guest user
            char_count: Number of characters processed (or searches for dictionary)
            usage_type: 'translator', 'tts', 'stt_stream', or 'dictionary'
        
        Raises:
            ValueError: If usage_type is invalid
        """
        valid_types = ['translator', 'tts', 'stt_stream', 'dictionary', 'translation', 'stt']
        if usage_type not in valid_types:
            raise ValueError(f"Invalid usage_type: {usage_type}. Must be one of {valid_types}")
        
        # Map legacy types to new types
        type_mapping = {
            'translation': 'translator',
            'stt': 'stt_stream'
        }
        usage_type = type_mapping.get(usage_type, usage_type)
        
        session = next(get_db())
        current_month = UsageService.get_current_month()
        
        try:
            # Prepare column to increment
            if usage_type == 'translator':
                column_to_increment = 'translator_chars'
            elif usage_type == 'tts':
                column_to_increment = 'tts_chars'
            elif usage_type == 'stt_stream':
                column_to_increment = 'stt_stream_chars'
            else:  # dictionary
                column_to_increment = 'dictionary_searches'
            
            # UPSERT: Insert new record or update existing
            stmt = insert(GuestUsageLog).values(
                ip_address=ip_address,
                month=current_month,
                translator_chars=char_count if usage_type == 'translator' else 0,
                tts_chars=char_count if usage_type == 'tts' else 0,
                stt_stream_chars=char_count if usage_type == 'stt_stream' else 0,
                dictionary_searches=char_count if usage_type == 'dictionary' else 0
            ).on_conflict_do_update(
                index_elements=['ip_address', 'month'],
                set_={
                    column_to_increment: getattr(GuestUsageLog, column_to_increment) + char_count,
                    'updated_at': datetime.now()
                }
            )
            
            session.execute(stmt)
            session.commit()
        finally:
            session.close()
