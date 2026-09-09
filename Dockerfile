# ==============================================================================
# RoutY All-in-One Production Dockerfile
# Multi-stage build: Compiles React Native/Expo Web & packages FastAPI backend
# ==============================================================================

# --- Stage 1: Build Frontend Web Bundle ---
FROM node:20-alpine AS web-builder

WORKDIR /app/frontend

# Install dependencies with lockfile caching
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile || yarn install

# Copy frontend source
COPY frontend/ ./

# Export production static web distribution
ENV CI=1
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
RUN npx expo export -p web --output-dir dist

# --- Stage 2: Production Runtime (FastAPI + Embedded Simulation & Static Web) ---
FROM python:3.12-slim AS runner

WORKDIR /app

# Install system dependencies (curl for container healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ ./

# Copy compiled web assets from Stage 1 into backend static directory
COPY --from=web-builder /app/frontend/dist ./static

# Configure runtime environment
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

# Container healthcheck against root API status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/ || exit 1

# Launch backend with uvicorn (serves both /api/* and frontend web at /)
CMD ["python3", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
