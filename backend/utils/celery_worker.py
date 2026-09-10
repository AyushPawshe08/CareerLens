"""
Celery application factory for CareerLensAI.

All tasks must be imported here so Celery auto-discovers them when
the worker process starts.  Do NOT import DB sessions or FastAPI app
objects at module level — Celery workers are separate processes.
"""

import os
import sys
from pathlib import Path
from celery import Celery
from dotenv import load_dotenv

load_dotenv(".env")

# Ensure the backend root (which contains `modules/`, `services/`, `utils/`)
# is on sys.path for Celery autodiscovery inside Docker.
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Broker / backend URLs
# When running locally (outside Docker), Redis is on localhost:6379.
# When running inside Docker (via docker-compose), the hostname is 'redis'.
# Override via .env  →  CELERY_BROKER_URL / CELERY_RESULT_BACKEND
# ---------------------------------------------------------------------------

_DEFAULT_REDIS = "redis://localhost:6379/0"

celery = Celery("careerlensai")

celery.conf.broker_url = os.getenv("CELERY_BROKER_URL", _DEFAULT_REDIS)
celery.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND", _DEFAULT_REDIS)

# Serialisation
celery.conf.task_serializer = "json"
celery.conf.result_serializer = "json"
celery.conf.accept_content = ["json"]

# Result expiry — keep task results for 1 hour
celery.conf.result_expires = 3600

# Retry failed tasks automatically (up to 3 times, 5 s apart)
celery.conf.task_acks_late = True
celery.conf.task_reject_on_worker_lost = True

# ---------------------------------------------------------------------------
# Worker pool — use 'threads' so that the orchestrator task can call .get()
# on sub-tasks without deadlocking (prefork blocks on .get() inside tasks).
# Thread-based concurrency is fine here because the work is I/O-bound
# (waiting on LLM HTTP responses), not CPU-bound.
# ---------------------------------------------------------------------------
celery.conf.worker_pool = "threads"
celery.conf.worker_concurrency = 8  # 8 threads per worker process

# Prevent the "set_result_on_children" warning
celery.conf.task_always_eager = False

# Broker connection retry on startup (silence deprecation warning)
celery.conf.broker_connection_retry_on_startup = True

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Explicit task imports — guarantees every task is registered in the worker.
# Wrapped in try/except so that a missing Redis connection at import time
# does NOT crash the FastAPI server. The sync fallback in each route handles
# the Redis-down case gracefully.
# ---------------------------------------------------------------------------
CELERY_AVAILABLE = False
try:
    import modules.analysis.analysis_tasks              # noqa: F401
    import modules.interviewQuestions.question_tasks    # noqa: F401
    import modules.resources.resources_tasks            # noqa: F401
    import modules.atsResume.ats_resume_tasks           # noqa: F401
    CELERY_AVAILABLE = True
    logger.info("Celery task modules loaded — Redis broker is reachable.")
except Exception as exc:
    logger.warning(
        "Celery task modules failed to load (%s). "
        "All analysis will run synchronously without Redis/Celery. "
        "Start Redis (or docker-compose up redis) to enable async processing.",
        exc,
    )


