"""
FastAPI router for the ATS Resume Rewriter module.

Endpoints
─────────
POST /ats-resume/{career_input_id}
    Triggers async ATS resume generation.
    Auth: required. Ownership enforced.

GET /ats-resume/status/{task_id}
    Polls Celery task state.
    Auth: required.

GET /ats-resume/{career_input_id}
    Returns the persisted ATS resume from DB.
    Auth: required. Ownership enforced.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from auth.auth_dependency import get_authenticated_user
from auth.auth_models import User
from modules.inputJob.career_model import CareerInput

from .ats_resume_handler import trigger_ats_resume, poll_ats_resume
from .ats_resume_model import ATSResumeModel
from .ats_resume_schema import (
    ATSResumeResponse,
    ATSResumeTriggerResponse,
    ATSResumeStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ats-resume", tags=["ats-resume"])


# ---------------------------------------------------------------------------
# Internal helper — ownership check
# ---------------------------------------------------------------------------

def _get_owned_career_input(
    career_input_id: str,
    current_user: User,
    db: Session,
) -> CareerInput:
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
# POST /ats-resume/{career_input_id}  — trigger generation
# ---------------------------------------------------------------------------

@router.post(
    "/{career_input_id}",
    response_model=ATSResumeTriggerResponse,
    status_code=202,
)
def trigger_ats_resume_route(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Triggers ATS resume generation for the given career input.

    **Prerequisites:**
    - Resume text or self description must be present.
    - Analysis must be completed for this career_input_id.

    Returns a `task_id` immediately. Poll
    `GET /ats-resume/status/{task_id}` to track progress.
    """
    _get_owned_career_input(career_input_id, current_user, db)

    try:
        trigger_result = trigger_ats_resume(db=db, career_input_id=career_input_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Failed to trigger ATS resume for %s: %s", career_input_id, exc
        )
        raise HTTPException(
            status_code=500, detail="Failed to trigger ATS resume generation."
        ) from exc

    if trigger_result["status"] == "completed":
        return ATSResumeTriggerResponse(
            status="completed",
            ats_resume_id=trigger_result.get("ats_resume_id"),
            message=(
                "ATS resume already generated. "
                "Fetch it via GET /ats-resume/{career_input_id}."
            ),
        )

    return ATSResumeTriggerResponse(
        task_id=trigger_result["task_id"],
        status="queued",
        message=(
            "ATS resume generation queued. "
            "Poll GET /ats-resume/status/{task_id} for results."
        ),
    )


# ---------------------------------------------------------------------------
# GET /ats-resume/status/{task_id}  — poll Celery task
# ---------------------------------------------------------------------------

@router.get(
    "/status/{task_id}",
    response_model=ATSResumeStatusResponse,
)
def get_ats_resume_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Polls the Celery task for the current state.

    - `status == "queued"`     → waiting in queue
    - `status == "processing"` → LLM is rewriting the resume
    - `status == "completed"`  → result available
    - `status == "failed"`     → check the `error` field
    """
    try:
        poll_result = poll_ats_resume(db=db, task_id=task_id)
    except Exception as exc:
        logger.exception(
            "Failed to poll ATS resume task %s: %s", task_id, exc
        )
        raise HTTPException(
            status_code=500, detail="Failed to poll ATS resume status."
        ) from exc

    return ATSResumeStatusResponse(
        task_id=task_id,
        status=poll_result["status"],
        result=poll_result.get("result"),
        error=poll_result.get("error"),
    )


# ---------------------------------------------------------------------------
# GET /ats-resume/{career_input_id}  — fetch from DB
# ---------------------------------------------------------------------------

@router.get(
    "/{career_input_id}",
    response_model=ATSResumeResponse,
)
def get_ats_resume_result(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Returns the completed ATS-optimized resume for a given career input.

    Returns 404 if the resume has not been generated yet — trigger
    generation via POST /ats-resume/{career_input_id}.
    """
    _get_owned_career_input(career_input_id, current_user, db)

    record: ATSResumeModel = (
        db.query(ATSResumeModel)
        .filter(ATSResumeModel.career_input_id == career_input_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail=(
                "ATS resume not found. "
                "Trigger generation via POST /ats-resume/{career_input_id}."
            ),
        )
    return record
