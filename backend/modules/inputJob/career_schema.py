"""
Pydantic schemas for the inputJob module.

Note: The creation schema is NOT used for the multipart/form-data route
(Form fields + UploadFile cannot be wrapped in a Pydantic model directly in
FastAPI). The response schema IS used for all responses.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class CareerInputResponse(BaseModel):
    """Schema returned to the client after creating or retrieving a CareerInput."""

    id: str

    user_id: int

    job_description: str

    self_description: Optional[str] = None

    resume_file_path: Optional[str] = None

    resume_text: Optional[str] = None

    created_at: datetime

    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
