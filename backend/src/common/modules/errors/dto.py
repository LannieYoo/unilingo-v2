#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Events DTOs
Data Transfer Objects for error reporting and retrieval
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ErrorReportDTO(BaseModel):
    """
    DTO for error reports from frontend
    
    Used when frontend sends error reports to POST /api/errors
    """
    trace_id: str = Field(..., description="Trace ID (UUID)")
    message: str = Field(..., min_length=1, max_length=1000, description="Error message")
    stack_trace: Optional[str] = Field(None, description="Stack trace")
    user_context: Optional[Dict[str, Any]] = Field(None, description="User context (user_id, etc.)")
    url: Optional[str] = Field(None, description="URL where error occurred")
    user_agent: Optional[str] = Field(None, description="Browser user agent")
    
    @field_validator('trace_id')
    @classmethod
    def validate_trace_id(cls, v: str) -> str:
        """Validate trace_id is not empty"""
        if not v or not v.strip():
            raise ValueError("trace_id cannot be empty")
        return v.strip()
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate message is not empty"""
        if not v or not v.strip():
            raise ValueError("message cannot be empty")
        return v.strip()


class ErrorEventDTO(BaseModel):
    """
    DTO for error event responses
    
    Used when returning error events from GET /api/admin/errors
    """
    id: str = Field(..., description="Error event ID (UUID)")
    trace_id: str = Field(..., description="Trace ID (UUID)")
    where_from: str = Field(..., description="Source of error (frontend/backend)")
    message: str = Field(..., description="Error message")
    detail: Optional[Dict[str, Any]] = Field(None, description="Error detail (JSON)")
    created_at: datetime = Field(..., description="Error creation timestamp")
    
    class Config:
        from_attributes = True


class ErrorListResponseDTO(BaseModel):
    """
    DTO for paginated error list response
    
    Used when returning paginated error events
    """
    data: list[ErrorEventDTO] = Field(..., description="List of error events")
    total: int = Field(..., description="Total count of error events")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")


__all__ = [
    'ErrorReportDTO',
    'ErrorEventDTO',
    'ErrorListResponseDTO'
]
