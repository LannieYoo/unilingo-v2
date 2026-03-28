#!/bin/bash
set -e

# Add backend parent to PYTHONPATH so both 'backend.xxx' and 'src.xxx' imports work
export PYTHONPATH="/app:/app/backend:$PYTHONPATH"

# Start nginx in background
nginx -g "daemon on;"

# Start Flask backend with gunicorn
cd /app
exec gunicorn \
    --bind 127.0.0.1:8001 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    "backend.app:create_app('production')"
