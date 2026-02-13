#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Events Service
Handles error event storage and retrieval with validation
"""

import json
import logging
from typing import Optional, Dict, List
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Index, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from src.common.supabase import Base, get_db

logger = logging.getLogger(__name__)


class ErrorEventModel(Base):
    __tablename__ = "error_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trace_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    where_from = Column(String(20), nullable=False, index=True)
    message = Column(String(1000), nullable=False)
    detail = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    __table_args__ = (
        Index("idx_error_events_trace_id", "trace_id"),
        Index("idx_error_events_created_at", "created_at"),
        Index("idx_error_events_where_from", "where_from"),
    )

# Constants
MAX_DETAIL_SIZE = 10 * 1024  # 10KB
MAX_MESSAGE_LENGTH = 1000


def _truncate_detail(detail: dict) -> dict:
    """
    Truncate detail if it exceeds 10KB
    
    Args:
        detail: Error detail dictionary
        
    Returns:
        Truncated detail dictionary with truncation indicator if needed
    """
    detail_json = json.dumps(detail, ensure_ascii=False)
    detail_size = len(detail_json.encode('utf-8'))
    
    if detail_size > MAX_DETAIL_SIZE:
        # Add truncation indicator
        truncated_detail = detail.copy()
        truncated_detail['_truncated'] = True
        truncated_detail['_original_size'] = detail_size
        
        # Try to keep most important fields
        if 'stackTrace' in truncated_detail and len(str(truncated_detail['stackTrace'])) > 5000:
            truncated_detail['stackTrace'] = str(truncated_detail['stackTrace'])[:5000] + '... [truncated]'
        
        # Re-check size
        truncated_json = json.dumps(truncated_detail, ensure_ascii=False)
        if len(truncated_json.encode('utf-8')) > MAX_DETAIL_SIZE:
            # Aggressive truncation - keep only essential fields
            truncated_detail = {
                '_truncated': True,
                '_original_size': detail_size,
                'message': detail.get('message', ''),
                'stackTrace': str(detail.get('stackTrace', ''))[:3000] + '... [truncated]'
            }
        
        return truncated_detail
    
    return detail


def _truncate_message(message: str) -> str:
    """
    Truncate message if it exceeds 1000 characters
    
    Args:
        message: Error message
        
    Returns:
        Truncated message with ellipsis if needed
    """
    if len(message) > MAX_MESSAGE_LENGTH:
        return message[:MAX_MESSAGE_LENGTH - 3] + '...'
    return message


def _validate_where_from(where_from: str) -> bool:
    """
    Validate where_from value
    
    Args:
        where_from: Source of error ('frontend' or 'backend')
        
    Returns:
        True if valid, False otherwise
    """
    return where_from in ['frontend', 'backend']


def create_error_event(
    trace_id: str,
    where_from: str,
    message: str,
    detail: Optional[dict] = None
) -> Dict:
    """
    Store error event in database
    
    Args:
        trace_id: Trace ID (UUID)
        where_from: Source of error ('frontend' or 'backend')
        message: Error message
        detail: Error detail dictionary (optional)
        
    Returns:
        Created error event dictionary
        
    Raises:
        ValueError: If where_from is invalid
        Exception: If database operation fails
    """
    # Validate where_from
    if not _validate_where_from(where_from):
        raise ValueError(f"Invalid where_from value: {where_from}. Must be 'frontend' or 'backend'")
    
    # Truncate message if needed
    truncated_message = _truncate_message(message)
    
    # Truncate detail if needed
    truncated_detail = _truncate_detail(detail) if detail else None
    
    # Get database session using context manager
    for db in get_db():
        try:
            # Create error event model
            error_event = ErrorEventModel(
                trace_id=trace_id,
                where_from=where_from,
                message=truncated_message,
                detail=truncated_detail
            )
            
            db.add(error_event)
            db.commit()
            db.refresh(error_event)
            
            logger.info(f"Error event created: trace_id={trace_id}, where_from={where_from}")
            
            return {
                'id': str(error_event.id),
                'trace_id': str(error_event.trace_id),
                'where_from': error_event.where_from,
                'message': error_event.message,
                'detail': error_event.detail,
                'created_at': error_event.created_at.isoformat() if error_event.created_at else None
            }
                
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create error event: {e}")
            raise


def get_error_events(
    page: int = 1,
    page_size: int = 100,
    where_from: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict:
    """
    Retrieve paginated error events with filters
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of items per page
        where_from: Filter by source ('frontend' or 'backend')
        start_date: Filter by start date
        end_date: Filter by end date
        
    Returns:
        Dictionary with 'data' (list of error events) and 'total' (total count)
        
    Raises:
        ValueError: If where_from is invalid
        Exception: If database operation fails
    """
    # Validate where_from if provided
    if where_from and not _validate_where_from(where_from):
        raise ValueError(f"Invalid where_from value: {where_from}. Must be 'frontend' or 'backend'")
    
    # Get database session using context manager
    for db in get_db():
        try:
            # Build query
            query = db.query(ErrorEventModel)
            
            # Apply filters
            if where_from:
                query = query.filter(ErrorEventModel.where_from == where_from)
            
            if start_date:
                query = query.filter(ErrorEventModel.created_at >= start_date)
            
            if end_date:
                query = query.filter(ErrorEventModel.created_at <= end_date)
            
            # Get total count
            total = query.count()
            
            # Apply pagination and ordering
            offset = (page - 1) * page_size
            events = query.order_by(ErrorEventModel.created_at.desc()).offset(offset).limit(page_size).all()
            
            # Convert to dict
            data = [
                {
                    'id': str(event.id),
                    'trace_id': str(event.trace_id),
                    'where_from': event.where_from,
                    'message': event.message,
                    'detail': event.detail,
                    'created_at': event.created_at.isoformat() if event.created_at else None
                }
                for event in events
            ]
            
            return {
                'data': data,
                'total': total
            }
            
        except Exception as e:
            logger.error(f"Failed to get error events: {e}")
            raise


def get_error_events_by_trace_id(trace_id: str) -> List[Dict]:
    """
    Retrieve all error events for a specific trace_id
    
    Args:
        trace_id: Trace ID (UUID)
        
    Returns:
        List of error event dictionaries
        
    Raises:
        Exception: If database operation fails
    """
    # Get database session using context manager
    for db in get_db():
        try:
            # Query by trace_id
            events = db.query(ErrorEventModel)\
                .filter(ErrorEventModel.trace_id == trace_id)\
                .order_by(ErrorEventModel.created_at.asc())\
                .all()
            
            # Convert to dict
            data = [
                {
                    'id': str(event.id),
                    'trace_id': str(event.trace_id),
                    'where_from': event.where_from,
                    'message': event.message,
                    'detail': event.detail,
                    'created_at': event.created_at.isoformat() if event.created_at else None
                }
                for event in events
            ]
            
            logger.info(f"Retrieved {len(data)} error events for trace_id={trace_id}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to get error events by trace_id: {e}")
            raise


__all__ = [
    'ErrorEventModel',
    'create_error_event',
    'get_error_events',
    'get_error_events_by_trace_id'
]
