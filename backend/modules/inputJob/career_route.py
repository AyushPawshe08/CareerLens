"""
FastAPI router for the inputJob module.

POST /career-inputs/
  Accepts multipart/form-data with:
    - job_description  (form field, required)
    - self_description (form field, optional)
    - resume           (file upload, optional PDF)

  Auth: Bearer JWT required.
  The user_id is derived from the authenticated user — NOT from the form.

  After creating the CareerInput record, the Celery analysis task is
  triggered automatically so the frontend can immediately redirect to
  the analysis page.

GET /career-inputs/
  Returns all career inputs for the authenticated user.

GET /career-inputs/{career_input_id}
  Returns a single career input.
  Enforces ownership: 403 if the record belongs to another user.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from sqlalchemy.orm import Session

from config.database import get_db
from auth.auth_dependency import get_authenticated_user
from auth.auth_models import User

from .carrer_handler import create_career_input, get_career_input, list_career_inputs
from .career_schema import CareerInputResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/career-inputs", tags=["career-inputs"])


# ---------------------------------------------------------------------------
# POST  /career-inputs/
# ---------------------------------------------------------------------------

@router.post("/", response_model=CareerInputResponse, status_code=201)
async def create_career_input_route(
    job_description: str = Form(..., min_length=1, description="The job description text"),
    self_description: Optional[str] = Form(None, description="Optional free-text self-description"),
    resume: Optional[UploadFile] = File(None, description="Optional resume PDF file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Create a new CareerInput record for the authenticated user.

    - **job_description** is always required.
    - At least one of **self_description** or **resume** (PDF) must be provided.
    - After creation, the Celery analysis pipeline is triggered automatically.
    - Returns the created record including its UUID `id`.
    """
    resume_bytes: Optional[bytes] = None
    resume_filename: Optional[str] = None

    if resume is not None:
        if resume.content_type not in ("application/pdf", "application/octet-stream"):
            raise HTTPException(
                status_code=400,
                detail="resume must be a PDF file (application/pdf).",
            )
        resume_bytes = await resume.read()
        resume_filename = resume.filename

    try:
        record = create_career_input(
            db=db,
            user_id=current_user.id,          # ← derived from JWT, never from form
            job_description=job_description,
            self_description=self_description or None,
            resume_filename=resume_filename,
            resume_bytes=resume_bytes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error in create_career_input_route: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create career input: {exc}",
        ) from exc

    # ── Trigger Celery analysis pipeline (fire-and-forget) ──────────────────
    try:
        from modules.analysis.analysis_handler import trigger_analysis
        trigger_analysis(db=db, career_input_id=record.id)
        logger.info("Analysis task queued for career_input=%s", record.id)
    except Exception as exc:
        # Do NOT fail the request if Celery is unavailable — the user can
        # trigger analysis manually from the analysis page.
        logger.warning(
            "Could not auto-trigger analysis for career_input=%s: %s",
            record.id, exc,
        )

    return record


# ---------------------------------------------------------------------------
# GET  /career-inputs/
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[CareerInputResponse])
def list_career_inputs_route(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """Return all CareerInput records for the authenticated user, newest first."""
    return list_career_inputs(db=db, user_id=current_user.id)


# ---------------------------------------------------------------------------
# GET  /career-inputs/{career_input_id}
# ---------------------------------------------------------------------------

@router.get("/{career_input_id}", response_model=CareerInputResponse)
def get_career_input_route(
    career_input_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    """
    Return a single CareerInput by its ID.

    Enforces ownership — returns 403 if the record belongs to a different user.
    """
    record = get_career_input(db=db, career_input_id=career_input_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Career input not found.")

    # ── Ownership check ──────────────────────────────────────────────────────
    if record.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: this career input belongs to another user.",
        )

    return record
