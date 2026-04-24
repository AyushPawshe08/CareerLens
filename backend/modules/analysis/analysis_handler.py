"""
Handler for the analysis module.

Architecture (fire-and-poll):
  1. POST /career-analysis/{career_input_id}
       → Triggers the Celery orchestrator task immediately
       → Returns {task_id, status: "queued"} in < 100 ms
  2. GET  /career-analysis/status/{task_id}
       → Polls Celery for the task's state
       → When state == SUCCESS, persists the result to DB and returns the
         full AnalysisResponse
       → Idempotent — repeated polls are safe, DB write happens only once

This means the FastAPI worker is never blocked waiting for LLM responses.
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session
from utils.celery_worker import celery

from modules.inputJob.career_model import CareerInput
from .analysis_model import AnalysisModel
from .analysis_tasks import task_run_full_analysis

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Trigger — called by POST route
# ---------------------------------------------------------------------------

def trigger_analysis(db: Session, career_input_id: str) -> dict:
    """
    Validates the career input and fires the async Celery task.

    Returns:
        {"task_id": str, "status": "queued"} immediately.

    Raises:
        ValueError: If career_input_id is invalid or no text content found.
    """
    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )
    if not career_input:
        raise ValueError(f"Career input '{career_input_id}' not found.")

    resume_text = career_input.resume_text or career_input.self_description
    if not resume_text:
        raise ValueError("Resume text or self description is required for analysis.")

    # If already completed, return the existing result immediately
    existing: Optional[AnalysisModel] = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return {"task_id": None, "status": "completed", "analysis_id": existing.id}

    # Mark as processing
    career_input.processing_status = "processing"
    db.commit()

    # Dispatch Celery orchestrator task (non-blocking)
    task: AsyncResult = task_run_full_analysis.apply_async(
        args=[career_input_id, career_input.job_description, resume_text],
        # Store the career_input_id in task metadata for polling
        task_id=None,  # Let Celery generate a UUID
    )

    logger.info("Analysis task %s queued for career_input=%s", task.id, career_input_id)

    return {"task_id": task.id, "status": "queued"}


# ---------------------------------------------------------------------------
# Poll — called by GET route
# ---------------------------------------------------------------------------

def poll_analysis(db: Session, task_id: str) -> dict:
    """
    Checks the Celery task state and, on SUCCESS, persists the result to DB.

    Returns a dict with shape:
      {
        "task_id": str,
        "status": "queued" | "processing" | "completed" | "failed",
        "result": AnalysisModel | None,
      }
    """
    result = celery.AsyncResult(task_id)
    state = result.state  # PENDING | STARTED | SUCCESS | FAILURE | RETRY

    if state in ("PENDING", "RETRY"):
        return {"task_id": task_id, "status": "queued", "result": None}

    if state == "STARTED":
        return {"task_id": task_id, "status": "processing", "result": None}

    if state == "FAILURE":
        logger.error("Analysis task %s failed: %s", task_id, result.result)
        # Update the career input status to 'failed' if we can determine it
        try:
            # result.result on failure is the exception info
            error_info = str(result.result) if result.result else "Unknown error"
        except Exception:
            error_info = "Unknown error"
        return {"task_id": task_id, "status": "failed", "result": None, "error": error_info}

    # SUCCESS — check if already persisted (idempotent)
    data: dict = result.result
    career_input_id = data.get("career_input_id")

    existing: Optional[AnalysisModel] = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return {"task_id": task_id, "status": "completed", "result": existing}

    # Persist result for the first time
    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )

    analysis = AnalysisModel(
        career_input_id=career_input_id,
        user_id=career_input.user_id if career_input else "unknown",
        summary=data.get("summary", ""),
        missing_skills=data.get("missing_skills", []),
        matched_skills=data.get("matched_skills", []),
        perfect_job_roles=data.get("perfect_job_roles", []),
        resume_suggestions=data.get("suggestions", []),
        resume_score=data.get("resume_score"),
    )

    db.add(analysis)
    if career_input:
        career_input.processing_status = "completed"
    db.commit()
    db.refresh(analysis)

    logger.info("Analysis persisted to DB for career_input=%s", career_input_id)

    return {"task_id": task_id, "status": "completed", "result": analysis}


# ---------------------------------------------------------------------------
# Legacy synchronous path (kept for fallback / testing without Redis)
# ---------------------------------------------------------------------------

def analyze_career_input_sync(db: Session, career_input_id: str) -> AnalysisModel:
    """
    Runs the full analysis synchronously in-process.
    Use only for local testing when Redis / Celery are not running.
    """
    from services.analysis.role_service import get_perfect_job_roles
    from services.analysis.scoring_service import get_resume_score
    from services.analysis.skillService import get_missing_and_matched_skills
    from services.analysis.summaryAndImprovements import get_summary_and_suggestions

    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )
    if not career_input:
        raise ValueError("Career input not found.")

    existing = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return existing

    resume_text = career_input.resume_text or career_input.self_description
    if not resume_text:
        raise ValueError("Resume text or self description is required for analysis.")

    career_input.processing_status = "processing"
    db.commit()

    summary_data = get_summary_and_suggestions(career_input.job_description, resume_text)
    skills_data = get_missing_and_matched_skills(career_input.job_description, resume_text)
    roles = get_perfect_job_roles(resume_text)
    score = get_resume_score(career_input.job_description, resume_text)

    analysis = AnalysisModel(
        career_input_id=career_input.id,
        user_id=career_input.user_id,
        summary=summary_data["summary"],
        missing_skills=skills_data["missing_skills"],
        matched_skills=skills_data["matched_skills"],
        perfect_job_roles=roles,
        resume_suggestions=summary_data["suggestions"],
        resume_score=score,
    )

    db.add(analysis)
    career_input.processing_status = "completed"
    db.commit()
    db.refresh(analysis)
    return analysis
