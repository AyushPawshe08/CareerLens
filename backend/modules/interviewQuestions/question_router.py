"""
FastAPI router for the interviewQuestions module.

Endpoints
─────────
POST /interview-questions/{career_input_id}
    Triggers async Celery interview question generation pipeline.
    Auth: required. Ownership enforced.

GET /interview-questions/status/{task_id}
    Polls the Celery task state.
    Auth: required.

GET /interview-questions/{career_input_id}
    Returns persisted interview questions directly from DB.
    Auth: required. Ownership enforced.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from auth.auth_dependency import get_authenticated_user
from auth.auth_models import User
from modules.inputJob.career_model import CareerInput

from .question_handler import trigger_interview_questions, poll_interview_questions
from .question_model import InterviewQuestion
from .question_schema import (
    InterviewQuestionResponse,
    InterviewQuestionTriggerResponse,
    InterviewQuestionStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview-questions", tags=["interview-questions"])


# ---------------------------------------------------------------------------
# Internal helper — resolve career input with ownership check
# ---------------------------------------------------------------------------

def _get_owned_career_input(
    career_input_id: str,
    current_user: User,
    db: Session,
) -> CareerInput:
    """
    Fetch the CareerInput and assert it belongs to `current_user`.
    Raises 404 or 403 as appropriate.
    """
    career_input = (
        db.query(CareerInput)
        .filter(CareerInput.id == career_input_id)
        .first()
    )
    if not career_input:
        raise HTTPException(status_code=404, detail="Career input not found.")

    if career_input.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: this career input belongs to another user.",
        )
    return career_input


# ---------------------------------------------------------------------------
# POST /interview-questions/{career_input_id}
# Fire the async Celery pipeline
# ---------------------------------------------------------------------------

@router.post(
    "/{career_input_id}",
    response_model=InterviewQuestionTriggerResponse,
    status_code=202,
)
def trigger_interview_questions_route(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Triggers interview question generation for a given career input.

    Ownership validated: the career input must belong to the authenticated user.

    **Prerequisites:** Analysis must already be complete for this career_input_id.

    Returns a `task_id` immediately. Poll `GET /interview-questions/status/{task_id}`
    to check progress and retrieve the result.
    """
    # Ownership check before triggering
    _get_owned_career_input(career_input_id, current_user, db)

    try:
        trigger_result = trigger_interview_questions(
            db=db, career_input_id=career_input_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Failed to trigger interview questions for %s: %s", career_input_id, exc
        )
        raise HTTPException(
            status_code=500, detail="Failed to trigger interview question generation."
        ) from exc

    if trigger_result["status"] == "completed":
        return InterviewQuestionTriggerResponse(
            status="completed",
            interview_question_id=trigger_result.get("interview_question_id"),
            message=(
                "Interview questions already generated. "
                "Fetch them via GET /interview-questions/{career_input_id}."
            ),
        )

    return InterviewQuestionTriggerResponse(
        task_id=trigger_result["task_id"],
        status="queued",
        message=(
            "Interview question generation queued. "
            "Poll GET /interview-questions/status/{task_id} for results."
        ),
    )


# ---------------------------------------------------------------------------
# GET /interview-questions/status/{task_id}
# Poll Celery task state
# ---------------------------------------------------------------------------

@router.get(
    "/status/{task_id}",
    response_model=InterviewQuestionStatusResponse,
)
def get_interview_questions_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Polls the Celery task for the current state.

    - `status == "queued"`     → still waiting in the queue
    - `status == "processing"` → worker is running the 3 LLM tasks in parallel
    - `status == "completed"`  → result is in the `result` field
    - `status == "failed"`     → an error occurred; check the `error` field
    """
    try:
        poll_result = poll_interview_questions(db=db, task_id=task_id)
    except Exception as exc:
        logger.exception(
            "Failed to poll interview question task %s: %s", task_id, exc
        )
        raise HTTPException(
            status_code=500, detail="Failed to poll interview question status."
        ) from exc

    return InterviewQuestionStatusResponse(
        task_id=task_id,
        status=poll_result["status"],
        result=poll_result.get("result"),
        error=poll_result.get("error"),
    )


# ---------------------------------------------------------------------------
# GET /interview-questions/{career_input_id}
# Fetch persisted result directly from DB
# ---------------------------------------------------------------------------

@router.get(
    "/{career_input_id}",
    response_model=InterviewQuestionResponse,
)
def get_interview_questions_result(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Returns the completed interview questions for a given career input.

    Ownership validated: the career input must belong to the authenticated user.
    Returns 404 if questions have not been generated yet.
    """
    # Ownership check on the parent career input
    _get_owned_career_input(career_input_id, current_user, db)

    record: InterviewQuestion = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.career_input_id == career_input_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail=(
                "Interview questions not found. "
                "Trigger generation via POST /interview-questions/{career_input_id}."
            ),
        )
    return record