#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Admin Service
Business logic for admin operations
"""

import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from ..auth.service import UserModel, UserRepository
from .dto import PendingUserDTO

logger = logging.getLogger(__name__)


class AdminService:
    """Service for admin operations"""
    
    def __init__(self, db: Session):
        self._db = db
        self._user_repo = UserRepository(db)
    
    def get_pending_users(self) -> List[PendingUserDTO]:
        """
        Get list of users pending approval
        
        Returns:
            List of pending users
        """
        try:
            # Query users with is_approved=False
            pending_users = self._db.query(UserModel).filter(
                UserModel.is_approved == False
            ).order_by(UserModel.created_at.desc()).all()
            
            # Convert to DTOs
            return [
                PendingUserDTO(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    user_level=user.user_level or 'guest',
                    is_approved=user.is_approved or False,
                    is_active=user.is_active if user.is_active is not None else True,
                    created_at=user.created_at
                )
                for user in pending_users
            ]
        except Exception as e:
            logger.error(f"Failed to get pending users: {e}")
            raise
    
    def approve_user(self, user_id: int, admin_id: int) -> bool:
        """
        Approve a single user
        
        Args:
            user_id: ID of user to approve
            admin_id: ID of admin performing approval
        
        Returns:
            True if successful
        
        Raises:
            ValueError: If user not found
        """
        try:
            user = self._db.query(UserModel).filter(UserModel.id == user_id).first()
            
            if not user:
                raise ValueError(f"User with ID {user_id} not found")
            
            # Update approval status
            user.is_approved = True
            user.approved_at = datetime.utcnow()
            user.approved_by = admin_id
            user.updated_at = datetime.utcnow()
            
            self._db.commit()
            
            logger.info(f"User {user_id} approved by admin {admin_id}")
            
            return True
        except ValueError:
            raise
        except Exception as e:
            self._db.rollback()
            logger.error(f"Failed to approve user {user_id}: {e}")
            raise
    
    def bulk_approve_users(self, user_ids: List[int], admin_id: int) -> int:
        """
        Approve multiple users
        
        Args:
            user_ids: List of user IDs to approve
            admin_id: ID of admin performing approval
        
        Returns:
            Number of users approved
        """
        try:
            approved_count = 0
            
            for user_id in user_ids:
                try:
                    user = self._db.query(UserModel).filter(UserModel.id == user_id).first()
                    
                    if user and not user.is_approved:
                        user.is_approved = True
                        user.approved_at = datetime.utcnow()
                        user.approved_by = admin_id
                        user.updated_at = datetime.utcnow()
                        approved_count += 1
                except Exception as e:
                    logger.warning(f"Failed to approve user {user_id}: {e}")
                    continue
            
            self._db.commit()
            
            logger.info(f"Bulk approved {approved_count} users by admin {admin_id}")
            
            return approved_count
        except Exception as e:
            self._db.rollback()
            logger.error(f"Failed to bulk approve users: {e}")
            raise


def get_admin_service(db: Session) -> AdminService:
    """Get admin service instance"""
    return AdminService(db)


__all__ = ['AdminService', 'get_admin_service']
