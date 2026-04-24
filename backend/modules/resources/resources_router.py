"""
FastAPI router for the Resources module.

Endpoints
─────────
POST /resources/{career_input_id}
    Triggers async resource generation for missing skills.
    Auth: required. Ownership enforced.

GET /resources/status/{task_id}
    Polls Celery task state.
    Auth: required.

GET /resources/{career_input_id}
    Returns persisted resources from DB.
    Auth: required. Ownership enforced.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from auth.auth_dependency import get_authenticated_user
from auth.auth_models import User
from modules.inputJob.career_model import CareerInput

from .resources_handler import trigger_resources, poll_resources
from .resources_model import ResourceModel
from .resources_schema import (
    ResourcesResponse,
    ResourcesTriggerResponse,
    ResourcesStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resources", tags=["resources"])


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
# POST /resources/{career_input_id}  — trigger generation
# ---------------------------------------------------------------------------

@router.post(
    "/{career_input_id}",
    response_model=ResourcesTriggerResponse,
    status_code=202,
)
def trigger_resources_route(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Triggers learning resource generation for all missing skills
    identified in the career analysis.

    **Prerequisites:** Analysis must be completed for this career_input_id.

    Returns a `task_id` immediately. Poll
    `GET /resources/status/{task_id}` to track progress.
    """
    _get_owned_career_input(career_input_id, current_user, db)

    try:
        trigger_result = trigger_resources(db=db, career_input_id=career_input_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Failed to trigger resources for %s: %s", career_input_id, exc
        )
        raise HTTPException(
            status_code=500, detail="Failed to trigger resource generation."
        ) from exc

    if trigger_result["status"] == "completed":
        return ResourcesTriggerResponse(
            status="completed",
            resource_record_id=trigger_result.get("resource_record_id"),
            message=(
                "Resources already generated. "
                "Fetch them via GET /resources/{career_input_id}."
            ),
        )

    return ResourcesTriggerResponse(
        task_id=trigger_result["task_id"],
        status="queued",
        message=(
            "Resource generation queued. "
            "Poll GET /resources/status/{task_id} for results."
        ),
    )


# ---------------------------------------------------------------------------
# GET /resources/status/{task_id}  — poll Celery task
# ---------------------------------------------------------------------------

@router.get(
    "/status/{task_id}",
    response_model=ResourcesStatusResponse,
)
def get_resources_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Polls the Celery task for the current state.

    - `status == "queued"`     → waiting in queue
    - `status == "processing"` → LLM is generating resources
    - `status == "completed"`  → result available
    - `status == "failed"`     → check the `error` field
    """
    try:
        poll_result = poll_resources(db=db, task_id=task_id)
    except Exception as exc:
        logger.exception(
            "Failed to poll resources task %s: %s", task_id, exc
        )
        raise HTTPException(
            status_code=500, detail="Failed to poll resource generation status."
        ) from exc

    return ResourcesStatusResponse(
        task_id=task_id,
        status=poll_result["status"],
        result=poll_result.get("result"),
        error=poll_result.get("error"),
    )


# ---------------------------------------------------------------------------
# GET /resources/{career_input_id}  — fetch from DB
# ---------------------------------------------------------------------------

@router.get(
    "/{career_input_id}",
    response_model=ResourcesResponse,
)
def get_resources_result(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Returns the completed learning resources for a given career input.

    Returns 404 if resources have not been generated yet — trigger
    generation via POST /resources/{career_input_id}.
    """
    _get_owned_career_input(career_input_id, current_user, db)

    record: ResourceModel = (
        db.query(ResourceModel)
        .filter(ResourceModel.career_input_id == career_input_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail=(
                "Resources not found. "
                "Trigger generation via POST /resources/{career_input_id}."
            ),
        )
    return record
