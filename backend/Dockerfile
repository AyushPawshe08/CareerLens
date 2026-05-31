# ============================================================
# Dockerfile — CareerLens Backend (FastAPI + Celery)
# ============================================================
# Runs both FastAPI (uvicorn) + Celery worker in one container
# via start.sh. Suitable for AWS EC2 free tier (t2.micro).
# ============================================================

FROM python:3.11-slim

# Prevent .pyc files and force stdout/stderr to be unbuffered
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install curl for Docker health checks + gcc for some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source
COPY . .

# Fix Windows line endings (CRLF → LF) and make start.sh executable
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Expose the FastAPI port
EXPOSE 8000

# Health check — lets Docker/EC2 know the app is up
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default: start FastAPI + Celery worker together
CMD ["./start.sh"]
