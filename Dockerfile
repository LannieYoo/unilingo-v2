# ============================================================
# Stage 1: Build Frontend (Vite + React)
# ============================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first (for layer caching)
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy frontend source
COPY frontend/ ./

# Build args for frontend env vars (VITE_ prefix required at build time)
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_ADMIN_USER

# Create .env for Vite build
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env && \
    echo "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" >> .env && \
    echo "VITE_ADMIN_USER=${VITE_ADMIN_USER}" >> .env

# Build frontend
RUN npm run build


# ============================================================
# Stage 2: Production (Python + Nginx)
# ============================================================
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install
COPY backend/requirements-deploy.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend to nginx html directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Nginx configuration: serve frontend + proxy /api to Flask
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
