"""
Handler for the Resources module.

Architecture (fire-and-poll — mirrors question_handler.py):
  1. POST /resources/{career_input_id}
       → Validates career input + completed analysis exist
       → Fires the Celery task (task_generate_resources)
       → Returns {task_id, status: "queued"} in < 100 ms
  2. GET  /resources/status/{task_id}
       → Polls Celery AsyncResult
       → On SUCCESS, persists to DB (idempotent) and returns full result
  3. GET  /resources/{career_input_id}
       → Direct DB fetch for cached/completed results
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from utils.celery_worker import celery
from modules.inputJob.career_model import CareerInput
from modules.analysis.analysis_model import AnalysisModel
from .resources_model import ResourceModel
from .resources_tasks import task_generate_resources

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Trigger — called by POST /resources/{career_input_id}
# ---------------------------------------------------------------------------

def trigger_resources(db: Session, career_input_id: str) -> dict:
    """
    Validates inputs and fires the async Celery resources task.

    Requires:
      - A valid CareerInput record
      - A completed AnalysisModel record (provides missing_skills)

    Returns:
        {"task_id": str, "status": "queued"}
        OR {"task_id": None, "status": "completed", "resource_record_id": str}

    Raises:
        ValueError: If career input or analysis result is missing.
    """
    # 1. Career input must exist
    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )
    if not career_input:
        raise ValueError(f"Career input '{career_input_id}' not found.")

    # 2. Analysis must be completed (provides missing_skills)
    analysis: Optional[AnalysisModel] = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if not analysis:
        raise ValueError(
            "Analysis must be completed before generating resources. "
            "Run POST /career-analysis/{career_input_id} first."
        )

    missing_skills: list = analysis.missing_skills or []
    if not missing_skills:
        raise ValueError(
            "No missing skills found in analysis. "
            "Resources are only generated for missing skills."
        )

    # 3. Idempotency — already generated?
    existing: Optional[ResourceModel] = (
        db.query(ResourceModel)
        .filter(ResourceModel.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return {
            "task_id": None,
            "status": "completed",
            "resource_record_id": existing.id,
        }

    # 4. Dispatch Celery task (non-blocking)
    task = task_generate_resources.apply_async(
        args=[career_input_id, missing_skills]
    )

    logger.info(
        "Resources task %s queued for career_input=%s (%d skills)",
        task.id,
        career_input_id,
        len(missing_skills),
    )

    return {"task_id": task.id, "status": "queued"}


# ---------------------------------------------------------------------------
# Poll — called by GET /resources/status/{task_id}
# ---------------------------------------------------------------------------

def poll_resources(db: Session, task_id: str) -> dict:
    """
    Checks the Celery task state and, on SUCCESS, persists results to DB.

    Returns:
        {
            "task_id": str,
            "status": "queued" | "processing" | "completed" | "failed",
            "result": ResourceModel | None,
            "error": str | None,
        }
    """
    try:
        result = celery.AsyncResult(task_id)
    except Exception as e:
        logger.error("Failed to get Celery result for task %s: %s", task_id, e)
        return {
            "task_id": task_id,
            "status": "failed",
            "result": None,
            "error": f"Failed to retrieve task status: {str(e)}",
        }

    state = result.state  # PENDING | STARTED | SUCCESS | FAILURE | RETRY

    if state in ("PENDING", "RETRY"):
        return {"task_id": task_id, "status": "queued",     "result": None, "error": None}

    if state == "STARTED":
        return {"task_id": task_id, "status": "processing", "result": None, "error": None}

    if state == "FAILURE":
        logger.error("Resources task %s failed: %s", task_id, result.result)
        try:
            error_info = str(result.result) if result.result else "Unknown error"
        except Exception:
            error_info = "Unknown error"
        return {
            "task_id": task_id,
            "status": "failed",
            "result": None,
            "error": error_info,
        }

    # SUCCESS — idempotent DB write
    try:
        data: dict = result.result
        career_input_id = data.get("career_input_id")

        # Already persisted?
        existing: Optional[ResourceModel] = (
            db.query(ResourceModel)
            .filter(ResourceModel.career_input_id == career_input_id)
            .first()
        )
        if existing:
            return {"task_id": task_id, "status": "completed", "result": existing, "error": None}

        # Fetch career input for user_id
        career_input: Optional[CareerInput] = (
            db.query(CareerInput)
            .filter(CareerInput.id == career_input_id)
            .first()
        )

        record = ResourceModel(
            career_input_id=career_input_id,
            user_id=career_input.user_id if career_input else None,
            resources=data.get("resources", []),
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        logger.info("Resources persisted to DB for career_input=%s", career_input_id)
        return {"task_id": task_id, "status": "completed", "result": record, "error": None}

    except Exception as e:
        logger.error("Failed to persist resources for task %s: %s", task_id, e)
        return {
            "task_id": task_id,
            "status": "failed",
            "result": None,
            "error": f"Failed to process results: {str(e)}",
        }
