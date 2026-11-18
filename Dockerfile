# ==============================================================================
# AI Shorts Factory - Production Multi-Stage Container Image
# Stage 1: Build Next.js 14 frontend static assets & standalone bundle
# Stage 2: Production Python 3.12 / 3.13 backend with FFmpeg & system utilities
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: FRONTEND BUILD
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies with lockfile
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build static artifacts
COPY frontend ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 2: PRODUCTION RUNTIME (FastAPI Backend + Built Frontend Static Serving)
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runner

# Install essential system dependencies and FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libavcodec-extra \
    curl \
    sqlite3 \
    libgl1 \
    libglib2.0-0 \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create unprivileged application user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/bash appuser

# Set up virtual environment and install backend Python dependencies
ENV VIRTUAL_ENV=/app/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source code
COPY backend ./backend
COPY scripts ./scripts

# Copy built frontend public & static assets
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create media storage and data directories
RUN mkdir -p /app/media_storage /app/backups && \
    chown -R appuser:appgroup /app

USER appuser

# Environment defaults
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000
ENV MEDIA_STORAGE_DIR=/app/media_storage
ENV DATABASE_PATH=/app/backend/shorts_factory.db

EXPOSE 8000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Launch production server via Uvicorn with standard concurrency
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers"]

