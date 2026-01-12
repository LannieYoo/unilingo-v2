"""
Database service entry point.
"""
from .._03_impls import DatabaseImpl

# Singleton instance
database_service = DatabaseImpl()
