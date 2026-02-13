#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Admin DTOs
Data Transfer Objects for admin operations
"""

from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class PendingUserDTO(BaseModel):
    """DTO for pending user information"""
    id: int
    email: str
    name: str
    user_level: str
    is_approved: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class BulkApproveRequestDTO(BaseModel):
    """DTO for bulk approval request"""
    user_ids: List[int] = Field(..., min_items=1, description="List of user IDs to approve")


class ApprovalResponseDTO(BaseModel):
    """DTO for approval operation response"""
    success: bool
    message: str
    approved_count: int = 0


__all__ = ['PendingUserDTO', 'BulkApproveRequestDTO', 'ApprovalResponseDTO']
