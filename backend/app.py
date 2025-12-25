#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask Application Entry Point
Creates and configures the Flask application
"""

import os
import sys
from pathlib import Path
from flask import Flask

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import get_config
from backend.middleware.cors_handler import init_cors
from backend.middleware.request_logger import init_request_logger
from backend.middleware.error_handler import init_error_handler
from backend.middleware.rate_limiter import init_rate_limiter


def create_app(config_name: str = None) -> Flask:
    """
    Create and configure Flask application
    
    Args:
        config_name: Configuration environment name (development, production, testing)
        
    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Validate production configuration
    if config_name == 'production':
        config_class.validate()
    
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
    
    # Register blueprints
    from backend.routes import translation, dictionary, stt, health
    
    app.register_blueprint(translation.bp)
    app.register_blueprint(dictionary.bp)
    app.register_blueprint(stt.bp)
    app.register_blueprint(health.bp)
    
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
    """Main function to run the Flask application"""
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
