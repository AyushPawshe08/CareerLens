"""
Pydantic schemas for the ATS Resume Rewriter module.

ATSResumeResponse        — full DB result (returned when status == 'completed')
ATSResumeTriggerResponse — returned immediately after POST
ATSResumeStatusResponse  — returned by GET /ats-resume/status/{task_id}
"""

from pydantic import BaseModel
from typing import Optional


class ATSResumeResponse(BaseModel):
    """Full result — returned when status == 'completed'."""
    id: str
    career_input_id: str
    user_id: int
    rewritten_resume: str       # plain-text ATS-optimized resume

    class Config:
        from_attributes = True


class ATSResumeTriggerResponse(BaseModel):
    """
    Returned immediately after POST /ats-resume/{career_input_id}.
    Client polls GET /ats-resume/status/{task_id}.
    """
    task_id: Optional[str] = None
    status: str                          # "queued" | "completed"
    ats_resume_id: Optional[str] = None  # set when already cached
    message: str = ""


class ATSResumeStatusResponse(BaseModel):
    """Returned by GET /ats-resume/status/{task_id}."""
    task_id: str
    status: str  # "queued" | "processing" | "completed" | "failed"
    result: Optional[ATSResumeResponse] = None
    error: Optional[str] = None
