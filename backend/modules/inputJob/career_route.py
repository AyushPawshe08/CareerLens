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



# Register for BOTH /career-inputs/ and /career-inputs (no slash).
# Next.js proxy strips the trailing slash before forwarding, so both
# variants must be handled. With redirect_slashes=False on the FastAPI
# app, there is no automatic 307 redirect between the two paths.
@router.post("/", response_model=CareerInputResponse, status_code=201)
@router.post("",  response_model=CareerInputResponse, status_code=201, include_in_schema=False)
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

    # ── Trigger analysis pipeline ────────────────────────────────────────────
    # Primary path: dispatch to Celery (non-blocking, requires Redis).
    # Fallback path: run analysis synchronously in-process when Redis is down.
    # Using BaseException so OS-level socket errors (ECONNRESET, ECONNREFUSED)
    # from the Redis connection pool are also caught before they can abort the
    # HTTP response.
    try:
        from modules.analysis.analysis_handler import trigger_analysis
        trigger_analysis(db=db, career_input_id=record.id)
        logger.info("Analysis task queued via Celery for career_input=%s", record.id)
    except BaseException as exc:
        logger.warning(
            "Celery unavailable for career_input=%s (%s). "
            "Falling back to synchronous analysis.",
            record.id, exc,
        )
        try:
            from modules.analysis.analysis_handler import analyze_career_input_sync
            analyze_career_input_sync(db=db, career_input_id=record.id)
            logger.info("Synchronous analysis completed for career_input=%s", record.id)
        except BaseException as sync_exc:
            # Analysis failed entirely — log but still return the record.
            # The user can retry from the analysis page.
            logger.error(
                "Synchronous analysis also failed for career_input=%s: %s",
                record.id, sync_exc,
            )

    return record



# ---------------------------------------------------------------------------
# GET  /career-inputs/
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[CareerInputResponse])
@router.get("",  response_model=list[CareerInputResponse], include_in_schema=False)
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
