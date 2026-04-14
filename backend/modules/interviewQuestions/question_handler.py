"""
Handler for the interviewQuestions module.

Architecture (fire-and-poll — mirrors analysis_handler.py):
  1. POST /interview-questions/{career_input_id}
       → Validates career input + analysis results exist
       → Fires the Celery orchestrator task
       → Returns {task_id, status: "queued"} in < 100 ms
  2. GET  /interview-questions/status/{task_id}
       → Polls Celery AsyncResult
       → On SUCCESS, persists to DB (idempotent) and returns full result
  3. GET  /interview-questions/{career_input_id}
       → Direct DB fetch for cached/completed results
"""

import logging
from typing import Optional

from celery.result import AsyncResult
from sqlalchemy.orm import Session

from modules.inputJob.career_model import CareerInput
from modules.analysis.analysis_model import AnalysisModel
from .question_model import InterviewQuestion
from .question_tasks import task_generate_interview_questions

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Trigger — called by POST route
# ---------------------------------------------------------------------------

def trigger_interview_questions(db: Session, career_input_id: str) -> dict:
    """
    Validates inputs and fires the async Celery interview question task.

    Requires:
      - A valid CareerInput record with resume_text or self_description
      - A completed AnalysisModel record (provides matched/missing skills)

    Returns:
        {"task_id": str, "status": "queued"}
        OR {"task_id": None, "status": "completed", "interview_question_id": str}

    Raises:
        ValueError: If career input, resume text, or analysis result is missing.
    """
    # 1. Validate career input exists
    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )
    if not career_input:
        raise ValueError(f"Career input '{career_input_id}' not found.")

    # 2. Ensure resume text is present
    resume_text = career_input.resume_text or career_input.self_description
    if not resume_text:
        raise ValueError(
            "Resume text or self description is required to generate interview questions."
        )

    # 3. Ensure analysis has been completed (we need matched/missing skills)
    analysis: Optional[AnalysisModel] = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if not analysis:
        raise ValueError(
            "Analysis must be completed before generating interview questions. "
            "Please run POST /career-analysis/{career_input_id} first."
        )

    # 4. Idempotency — if already completed, return immediately
    existing: Optional[InterviewQuestion] = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return {
            "task_id": None,
            "status": "completed",
            "interview_question_id": existing.id,
        }

    # 5. Dispatch Celery orchestrator task (non-blocking)
    task: AsyncResult = task_generate_interview_questions.apply_async(
        args=[
            career_input_id,
            career_input.job_description,
            resume_text,
            analysis.matched_skills,
            analysis.missing_skills,
        ]
    )

    logger.info(
        "Interview question task %s queued for career_input=%s",
        task.id,
        career_input_id,
    )

    return {"task_id": task.id, "status": "queued"}


# ---------------------------------------------------------------------------
# Poll — called by GET /status/{task_id}
# ---------------------------------------------------------------------------

def poll_interview_questions(db: Session, task_id: str) -> dict:
    """
    Checks the Celery task state and, on SUCCESS, persists results to DB.

    Returns:
        {
            "task_id": str,
            "status": "queued" | "processing" | "completed" | "failed",
            "result": InterviewQuestion | None,
            "error": str | None,
        }
    """
    result: AsyncResult = AsyncResult(task_id)
    state = result.state  # PENDING | STARTED | SUCCESS | FAILURE | RETRY

    if state in ("PENDING", "RETRY"):
        return {"task_id": task_id, "status": "queued", "result": None}

    if state == "STARTED":
        return {"task_id": task_id, "status": "processing", "result": None}

    if state == "FAILURE":
        logger.error("Interview question task %s failed: %s", task_id, result.result)
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

    # SUCCESS path — idempotent DB write
    data: dict = result.result
    career_input_id = data.get("career_input_id")

    # Check if already persisted
    existing: Optional[InterviewQuestion] = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.career_input_id == career_input_id)
        .first()
    )
    if existing:
        return {"task_id": task_id, "status": "completed", "result": existing}

    # Fetch the career input to get user_id
    career_input: Optional[CareerInput] = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )

    # Persist for the first time
    interview_question = InterviewQuestion(
        career_input_id=career_input_id,
        user_id=str(career_input.user_id) if career_input else "unknown",
        technical_questions=data.get("technical_questions", []),
        behavioural_questions=data.get("behavioural_questions", []),
        hr_questions=data.get("hr_questions", []),
    )

    db.add(interview_question)
    db.commit()
    db.refresh(interview_question)

    logger.info(
        "Interview questions persisted to DB for career_input=%s", career_input_id
    )

    return {"task_id": task_id, "status": "completed", "result": interview_question}
