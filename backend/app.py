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
    # Middleware
    init_cors,
    init_request_logger,
    init_error_handler,
    init_rate_limiter,
    init_logging,
    # Blueprints
    translation_bp,
    dictionary_bp,
    stt_bp,
    health_bp,
    auth_bp,
    admin_bp,
)
from backend.src.common.modules.database import Base, engine


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
    
    # Create database tables
    # Import models to register them with Base
    try:
        from backend.src.common.modules.auth._06_models import UserModel, LoginLogModel, SttLogModel
        Base.metadata.create_all(bind=engine)
        app.logger.info("Database tables created successfully")
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
