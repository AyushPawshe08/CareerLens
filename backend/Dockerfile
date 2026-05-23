# --------------------------------------------------------------------------
# Dockerfile for CareerLensAI backend (Celery worker + Flower)
# --------------------------------------------------------------------------
# The FastAPI app runs locally (uvicorn).  Only Redis, the Celery worker
# and Flower run inside Docker via docker-compose.
# --------------------------------------------------------------------------

FROM python:3.11-slim

# Prevents Python from writing .pyc files and enables unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps (needed for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source
COPY . .

# Convert Windows line endings (CRLF) to Unix line endings (LF) for start.sh and make it executable
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Default command runs both FastAPI and Celery worker
CMD ["./start.sh"]
