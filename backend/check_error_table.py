#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check if error_events table exists
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.src.common.supabase import SUPABASE_DB_URI
from sqlalchemy import create_engine, inspect

if not SUPABASE_DB_URI:
    print("ERROR: SUPABASE_DB_URI not configured")
    sys.exit(1)

try:
    engine = create_engine(SUPABASE_DB_URI, pool_pre_ping=True)
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print(f"Found {len(tables)} tables in database:")
    for table in sorted(tables):
        print(f"  - {table}")
    
    if 'error_events' in tables:
        print("\n✓ error_events table EXISTS")
        
        # Get columns
        columns = inspector.get_columns('error_events')
        print(f"\nColumns in error_events table:")
        for col in columns:
            print(f"  - {col['name']}: {col['type']}")
    else:
        print("\n✗ error_events table DOES NOT EXIST")
        print("\nTo create the table, run:")
        print("  cd backend")
        print("  python app.py")
        
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
