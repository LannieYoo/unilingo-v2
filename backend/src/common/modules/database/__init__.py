"""
Database module.
Provides SQLAlchemy database connection and session management.
"""
from ._01_contracts import IDatabase
from ._03_impls import DatabaseImpl, get_db, engine, Base
from ._04_services import database_service

__all__ = [
    # Contracts
    "IDatabase",
    # Implementations
    "DatabaseImpl",
    "get_db",
    "engine",
    "Base",
    # Services
    "database_service",
]
