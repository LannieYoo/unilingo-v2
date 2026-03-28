#!/bin/bash
set -e

# Add backend parent to PYTHONPATH so both 'backend.xxx' and 'src.xxx' imports work
export PYTHONPATH="/app:/app/backend:$PYTHONPATH"

# Render provides PORT env var; local Docker uses port 80
PORT=${PORT:-80}

# Generate nginx config from template (substitute $PORT)
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/sites-available/default

# Start nginx in background
nginx -g "daemon on;"

echo "Nginx started on port $PORT"

# Start Flask backend with gunicorn
# Using 1 worker + preload to minimize memory usage (Free tier = 512MB)
cd /app
exec gunicorn \
    --bind 127.0.0.1:8001 \
    --workers 1 \
    --threads 2 \
    --timeout 120 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    "backend.app:create_app('production')"
