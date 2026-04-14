"""
FastAPI router for the analysis module.

Endpoints
─────────
POST /career-analysis/{career_input_id}
    Triggers the async Celery analysis pipeline.
    Returns {task_id, status: "queued"} in < 100 ms.
    If analysis already exists, returns {status: "completed", analysis_id}.
    Auth: required. Ownership enforced.

GET /career-analysis/status/{task_id}
    Polls the Celery task state.
    Returns {task_id, status, result?} where result is populated on completion.
    Auth: required.

GET /career-analysis/{career_input_id}
    Returns the persisted analysis directly (after it has been completed).
    Auth: required. Ownership enforced.

POST /career-analysis/sync/{career_input_id}   [DEV ONLY]
    Runs analysis synchronously (no Celery/Redis required).
    Auth: required. Ownership enforced.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from auth.auth_dependency import get_authenticated_user
from auth.auth_models import User
from modules.inputJob.career_model import CareerInput

from .analysis_handler import trigger_analysis, poll_analysis, analyze_career_input_sync
from .analysis_model import AnalysisModel
from .analysis_schema import AnalysisResponse, AnalysisTriggerResponse, AnalysisStatusResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/career-analysis", tags=["career-analysis"])


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
# POST /career-analysis/{career_input_id}
# Triggers the async analysis pipeline via Celery
# ---------------------------------------------------------------------------

@router.post("/{career_input_id}", response_model=AnalysisTriggerResponse, status_code=202)
def trigger_analysis_route(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Triggers the analysis for a given career input.
    Ownership validated: the career input must belong to the authenticated user.
    Returns a task_id immediately — poll /status/{task_id} for results.
    """
    # Ownership check before triggering
    _get_owned_career_input(career_input_id, current_user, db)

    try:
        trigger_result = trigger_analysis(db=db, career_input_id=career_input_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to trigger analysis for %s: %s", career_input_id, exc)
        raise HTTPException(status_code=500, detail="Failed to trigger analysis.") from exc

    if trigger_result["status"] == "completed":
        return AnalysisTriggerResponse(
            status="completed",
            analysis_id=trigger_result.get("analysis_id"),
            message="Analysis already exists. Fetch it via GET /career-analysis/{career_input_id}.",
        )

    return AnalysisTriggerResponse(
        task_id=trigger_result["task_id"],
        status="queued",
        message="Analysis queued. Poll GET /career-analysis/status/{task_id} for results.",
    )


# ---------------------------------------------------------------------------
# GET /career-analysis/status/{task_id}
# Poll Celery for task state
# ---------------------------------------------------------------------------

@router.get("/status/{task_id}", response_model=AnalysisStatusResponse)
def get_analysis_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Polls the Celery task for the current state.

    - status == "queued"     → still waiting in the queue
    - status == "processing" → worker picked it up, LLMs running in parallel
    - status == "completed"  → result is in the `result` field
    - status == "failed"     → an error occurred during processing
    """
    try:
        poll_result = poll_analysis(db=db, task_id=task_id)
    except Exception as exc:
        logger.exception("Failed to poll analysis task %s: %s", task_id, exc)
        raise HTTPException(status_code=500, detail="Failed to poll analysis status.") from exc

    return AnalysisStatusResponse(
        task_id=task_id,
        status=poll_result["status"],
        result=poll_result.get("result"),
        error=poll_result.get("error"),
    )


# ---------------------------------------------------------------------------
# GET /career-analysis/{career_input_id}
# Fetch the persisted analysis result directly from DB
# ---------------------------------------------------------------------------

@router.get("/{career_input_id}", response_model=AnalysisResponse)
def get_analysis_result(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Returns the completed analysis for a given career input.

    Ownership validated: the career input must belong to the authenticated user.
    Returns 404 if the analysis has not been completed yet.
    """
    # Ownership check on the parent career input
    _get_owned_career_input(career_input_id, current_user, db)

    analysis: AnalysisModel = (
        db.query(AnalysisModel)
        .filter(AnalysisModel.career_input_id == career_input_id)
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found or still processing. Trigger via POST /career-analysis/{career_input_id}.",
        )
    return analysis


# ---------------------------------------------------------------------------
# POST /career-analysis/sync/{career_input_id}   [DEV ONLY]
# Synchronous fallback — works without Celery/Redis
# ---------------------------------------------------------------------------

@router.post("/sync/{career_input_id}", response_model=AnalysisResponse)
def get_analysis_sync(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    [DEV ONLY] Runs the full analysis synchronously.
    This blocks until all 4 LLM calls complete (~10-20s).
    Use only when Celery/Redis are not running.
    Ownership enforced.
    """
    _get_owned_career_input(career_input_id, current_user, db)

    try:
        return analyze_career_input_sync(db=db, career_input_id=career_input_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Sync analysis failed for %s: %s", career_input_id, exc)
        raise HTTPException(status_code=500, detail="Failed to analyze career input.") from exc
