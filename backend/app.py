#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask Application Entry Point
Flask 애플리케이션 진입점
"""

import os
import sys
from pathlib import Path
from flask import Flask

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import get_config
from backend.src.common.modules import (
    init_cors,
    init_request_logger,
    init_error_handler,
    init_rate_limiter,
    init_logging,
    translation_bp,
    dictionary_bp,
    stt_bp,
    health_bp,
    auth_bp,
    admin_bp,
    approval_bp,
)
from backend.src.common.modules.errors import errors_bp
from backend.src.common.modules.usage import usage_bp
from backend.src.common.modules.phrasal_verbs.router import phrasal_verbs_bp
from backend.src.common.supabase import Base
from backend.src.common.trace_middleware import setup_trace_middleware
from backend.src.common.usage_middleware import setup_usage_middleware
from backend.src.common.logger import setup_logging


def create_app(config_name: str = None) -> Flask:
    """
    Flask 애플리케이션 생성 및 설정
    
    Args:
        config_name: 설정 환경 이름 (development, production, testing)
        
    Returns:
        설정된 Flask 애플리케이션 인스턴스
    """
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Validate production configuration
    if config_name == 'production':
        config_class.validate()
    
    # Initialize logging first (before other middleware)
    init_logging(app)
    setup_logging(app)  # Add trace ID support to logging
    
    # Initialize trace ID middleware (before other middleware)
    setup_trace_middleware(app)
    
    # Initialize usage limit middleware (after trace, before routes)
    setup_usage_middleware(app)
    
    # Initialize middleware (order matters!)
    # 1. CORS - must be first to handle preflight requests
    init_cors(app, app.config['CORS_ORIGINS'])
    
    # 2. Request Logger - logs all requests
    init_request_logger(app)
    
    # 3. Error Handler - catches all errors
    init_error_handler(app)
    
    # 4. Rate Limiter - limits request rates per IP
    if app.config.get('RATE_LIMIT_ENABLED', True):
        init_rate_limiter(app)
    
    # Register blueprints from new module structure
    app.register_blueprint(translation_bp)
    app.register_blueprint(dictionary_bp)
    app.register_blueprint(stt_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(approval_bp)
    app.register_blueprint(errors_bp)
    app.register_blueprint(usage_bp)
    app.register_blueprint(phrasal_verbs_bp)
    
    # Create database tables
    try:
        from sqlalchemy import create_engine
        from backend.src.common.supabase import SUPABASE_DB_URI
        from backend.src.common.modules.auth.service import UserModel, LoginLogModel, SttLogModel, TranslationLogModel, DictionaryLogModel, CelpipTestLogModel
        from backend.src.common.modules.errors.service import ErrorEventModel
        from backend.src.common.modules.usage.service import UsageLog, GuestUsageLog
        
        if SUPABASE_DB_URI:
            from urllib.parse import quote_plus
            
            # URL에 특수문자가 있으면 인코딩 처리
            db_uri = SUPABASE_DB_URI
            if '!' in db_uri and '%21' not in db_uri:
                parts = db_uri.split('@')
                if len(parts) == 2:
                    user_pass = parts[0].split('://')[-1]
                    if ':' in user_pass:
                        user, password = user_pass.rsplit(':', 1)
                        encoded_password = quote_plus(password)
                        db_uri = f"postgresql://{user}:{encoded_password}@{parts[1]}"
            
            engine = create_engine(db_uri, pool_pre_ping=True)
            Base.metadata.create_all(bind=engine)
            app.logger.info("Database tables created successfully")
            
            # Run column migrations for existing tables
            from sqlalchemy import text, inspect
            inspector = inspect(engine)
            existing_columns = [c['name'] for c in inspector.get_columns('users')]
            with engine.connect() as conn:
                # Rename old cpu column to gpu if it exists
                if 'daily_cpu_limit_minutes' in existing_columns:
                    conn.execute(text("ALTER TABLE users RENAME COLUMN daily_cpu_limit_minutes TO daily_gpu_limit_minutes"))
                    conn.commit()
                    app.logger.info("Migration: Renamed daily_cpu_limit_minutes to daily_gpu_limit_minutes")
                # Add gpu column if it doesn't exist (fresh install)
                elif 'daily_gpu_limit_minutes' not in existing_columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN daily_gpu_limit_minutes INTEGER DEFAULT NULL"))
                    conn.commit()
                    app.logger.info("Migration: Added daily_gpu_limit_minutes column to users table")
                
                # Add search_source column to dictionary_logs if it doesn't exist
                if inspector.has_table('dictionary_logs'):
                    dict_columns = [c['name'] for c in inspector.get_columns('dictionary_logs')]
                    if 'search_source' not in dict_columns:
                        conn.execute(text("ALTER TABLE dictionary_logs ADD COLUMN search_source VARCHAR(20) NOT NULL DEFAULT 'dictionary'"))
                        conn.commit()
                        app.logger.info("Migration: Added search_source column to dictionary_logs table")
        else:
            app.logger.warning("SUPABASE_DB_URI not configured. Skipping table creation.")
    except Exception as e:
        app.logger.warning(f"Database connection failed: {e}. Auth features will be disabled.")
    
    # Root endpoint
    @app.route('/')
    def index():
        return {
            'message': 'Backend API Server',
            'version': '1.0.0',
            'status': 'running'
        }
    
    return app


def main():
    """Flask 애플리케이션 실행"""
    config_name = os.getenv('FLASK_ENV', 'development')
    app = create_app(config_name)
    
    host = app.config['HOST']
    port = app.config['PORT']
    debug = app.config['DEBUG']
    
    print(f"Starting Flask Backend Server...")
    print(f"Environment: {config_name}")
    print(f"Server: http://{host}:{port}")
    print(f"Debug mode: {debug}")
    
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    main()
