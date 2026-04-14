"""
Handler (business logic) for the inputJob module.

Responsibilities:
  - Accept job description (text), resume (PDF bytes), and self-description (text).
  - Extract text from the uploaded PDF via the shared utility.
  - Persist all inputs in the `career_inputs` table.
  - Provide a query helper to list a user's inputs.
"""

import os
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from utils.extractPDF import extract_text_from_pdf
from .career_model import CareerInput


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _save_pdf_to_disk(user_id: str, filename: str, file_bytes: bytes) -> str:
    """
    Persist the raw PDF bytes to the uploads directory.

    Returns the relative file path (relative to project root) so that the
    path stored in the DB is portable.
    """
    user_upload_dir = os.path.join(UPLOADS_DIR, str(user_id))
    os.makedirs(user_upload_dir, exist_ok=True)

    # Guarantee a unique filename so repeated uploads never collide.
    unique_filename = f"{uuid.uuid4()}_{filename}"
    abs_path = os.path.join(user_upload_dir, unique_filename)

    with open(abs_path, "wb") as f:
        f.write(file_bytes)

    # Store path relative to project root for portability
    rel_path = os.path.relpath(abs_path, start=os.path.join(UPLOADS_DIR, "..", ".."))
    return rel_path.replace("\\", "/")  # normalise to forward-slashes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_career_input(
    db: Session,
    user_id: int,
    job_description: str,
    self_description: Optional[str] = None,
    resume_filename: Optional[str] = None,
    resume_bytes: Optional[bytes] = None,
) -> CareerInput:
    """
    Create and persist a CareerInput record.

    At least one of `self_description` or `resume_bytes` must be provided
    (enforced by the DB-level CHECK constraint as well).

    Args:
        db:               SQLAlchemy session.
        user_id:          ID of the authenticated user.
        job_description:  The raw job description text.
        self_description: Optional free-text self-description from the user.
        resume_filename:  Original filename of the uploaded PDF (used when saving).
        resume_bytes:     Raw bytes of the uploaded PDF file.

    Returns:
        The newly created and committed CareerInput ORM object.

    Raises:
        ValueError: If neither self_description nor resume_bytes are supplied,
                    or if PDF extraction fails.
    """
    if not job_description or not job_description.strip():
        raise ValueError("job_description must not be empty.")

    if not self_description and not resume_bytes:
        raise ValueError(
            "At least one of 'self_description' or a resume PDF must be provided."
        )

    resume_file_path: Optional[str] = None
    resume_text: Optional[str] = None

    if resume_bytes:
        # 1. Extract text from the PDF
        resume_text = extract_text_from_pdf(resume_bytes)

        # 2. Persist the raw PDF to disk
        fname = resume_filename or "resume.pdf"
        resume_file_path = _save_pdf_to_disk(str(user_id), fname, resume_bytes)

    record = CareerInput(
        user_id=int(user_id),
        job_description=job_description.strip(),
        self_description=self_description.strip() if self_description else None,
        resume_file_path=resume_file_path,
        resume_text=resume_text,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def get_career_input(db: Session, career_input_id: str) -> Optional[CareerInput]:
    """
    Fetch a single CareerInput by its primary key.

    Returns None when the record does not exist.
    """
    return db.query(CareerInput).filter(CareerInput.id == career_input_id).first()


def list_career_inputs(db: Session, user_id: int) -> list[CareerInput]:
    """
    Return all CareerInput records that belong to a given user,
    ordered by creation time (newest first).
    """
    return (
        db.query(CareerInput)
        .filter(CareerInput.user_id == int(user_id))
        .order_by(CareerInput.created_at.desc())
        .all()
    )
