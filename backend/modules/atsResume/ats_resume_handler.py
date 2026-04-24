"""
Handler for the ATS Resume Rewriter module.

Architecture (fire-and-poll — mirrors resources_handler.py):
  1. POST /ats-resume/{career_input_id}
       → Validates career input + completed analysis exist
       → Fires the Celery task (task_generate_ats_resume)
       → Returns {task_id, status: "queued"} in < 100 ms
  2. GET  /ats-resume/status/{task_id}
       → Polls Celery AsyncResult
       → On SUCCESS, persists to DB (idempotent) and returns full result
  3. GET  /ats-resume/{career_input_id}
       → Direct DB fetch for cached/completed result
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from utils.celery_worker import celery
from modules.inputJob.career_model import CareerInput
from modules.analysis.analysis_model import AnalysisModel
from .ats_resume_model import ATSResumeModel
from .ats_resume_tasks import task_generate_ats_resume

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Trigger — called by POST /ats-resume/{career_input_id}
# ---------------------------------------------------------------------------

def trigger_ats_resume(db: Session, career_input_id: str) -> dict:
    """
    Validates inputs and fires the async Celery ATS resume task.

    Requires:
      - A valid CareerInput with resume_text or self_description
      - A completed AnalysisModel (provides missing_skills)

    Returns:
        {"task_id": str, "status": "queued"}
        OR {"task_id": None, "status": "completed", "ats_resume_id": str}

    Raises:
        ValueError: If prerequisites are not met.
    """
    # 1. Career input must exist
    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )
    if not career_input:
        raise ValueError(f"Career input '{career_input_id}' not found.")

    # 2. Resume text or self description required
    resume_text = career_input.resume_text or career_input.self_description
    if not resume_text:
        raise ValueError(
            "Resume text or self description is required to generate an ATS resume."
        )

    # 3. Analysis must be completed (provides missing_skills)
    analysis: Optional[AnalysisModel] = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if not analysis:
        raise ValueError(
            "Analysis must be completed before generating an ATS resume. "
            "Run POST /career-analysis/{career_input_id} first."
        )

    # 4. Idempotency — already generated?
    existing: Optional[ATSResumeModel] = (
        db.query(ATSResumeModel)
        .filter(ATSResumeModel.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return {
            "task_id": None,
            "status": "completed",
            "ats_resume_id": existing.id,
        }

    # 5. Dispatch Celery task (non-blocking)
    task = task_generate_ats_resume.apply_async(
        args=[
            career_input_id,
            career_input.job_description,
            resume_text,
            analysis.missing_skills or [],
        ]
    )

    logger.info(
        "ATS resume task %s queued for career_input=%s",
        task.id,
        career_input_id,
    )

    return {"task_id": task.id, "status": "queued"}


# ---------------------------------------------------------------------------
# Poll — called by GET /ats-resume/status/{task_id}
# ---------------------------------------------------------------------------

def poll_ats_resume(db: Session, task_id: str) -> dict:
    """
    Checks Celery task state and, on SUCCESS, persists result to DB.

    Returns:
        {
            "task_id": str,
            "status": "queued" | "processing" | "completed" | "failed",
            "result": ATSResumeModel | None,
            "error": str | None,
        }
    """
    try:
        result = celery.AsyncResult(task_id)
    except Exception as e:
        logger.error("Failed to get Celery result for task %s: %s", task_id, e)
        return {
            "task_id": task_id, "status": "failed",
            "result": None, "error": f"Failed to retrieve task status: {str(e)}",
        }

    state = result.state

    if state in ("PENDING", "RETRY"):
        return {"task_id": task_id, "status": "queued",     "result": None, "error": None}

    if state == "STARTED":
        return {"task_id": task_id, "status": "processing", "result": None, "error": None}

    if state == "FAILURE":
        logger.error("ATS resume task %s failed: %s", task_id, result.result)
        try:
            error_info = str(result.result) if result.result else "Unknown error"
        except Exception:
            error_info = "Unknown error"
        return {"task_id": task_id, "status": "failed", "result": None, "error": error_info}

    # SUCCESS — idempotent DB write
    try:
        data: dict = result.result
        career_input_id = data.get("career_input_id")

        existing: Optional[ATSResumeModel] = (
            db.query(ATSResumeModel)
            .filter(ATSResumeModel.career_input_id == career_input_id)
            .first()
        )
        if existing:
            return {"task_id": task_id, "status": "completed", "result": existing, "error": None}

        career_input: Optional[CareerInput] = (
            db.query(CareerInput)
            .filter(CareerInput.id == career_input_id)
            .first()
        )

        record = ATSResumeModel(
            career_input_id=career_input_id,
            user_id=career_input.user_id if career_input else None,
            rewritten_resume=data.get("rewritten_resume", ""),
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        logger.info("ATS resume persisted to DB for career_input=%s", career_input_id)
        return {"task_id": task_id, "status": "completed", "result": record, "error": None}

    except Exception as e:
        logger.error("Failed to persist ATS resume for task %s: %s", task_id, e)
        return {
            "task_id": task_id, "status": "failed",
            "result": None, "error": f"Failed to process results: {str(e)}",
        }
