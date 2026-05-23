#!/bin/sh

# Start the Celery worker in the background
echo "Starting Celery worker in background..."
celery -A utils.celery_worker.celery worker --loglevel=info --pool=threads --concurrency=4 &

# Start FastAPI (Uvicorn) in the foreground
echo "Starting FastAPI app on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
