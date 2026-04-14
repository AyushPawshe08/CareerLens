from pydantic import BaseModel
from typing import List, Optional


class AnalysisResponse(BaseModel):
    """Full analysis result — returned when status == 'completed'."""
    id: str
    career_input_id: str
    user_id: str
    summary: str
    missing_skills: List[str]
    matched_skills: List[str]
    perfect_job_roles: List[str]
    resume_suggestions: List[str]
    resume_score: Optional[int] = None

    class Config:
        from_attributes = True


class AnalysisTriggerResponse(BaseModel):
    """
    Returned immediately after POST /career-analysis/{career_input_id}.
    The client should poll GET /career-analysis/status/{task_id}.
    """
    task_id: Optional[str] = None
    status: str  # "queued" | "completed" (if already cached)
    analysis_id: Optional[str] = None  # set when status == "completed" immediately
    message: str = ""


class AnalysisStatusResponse(BaseModel):
    """
    Returned by GET /career-analysis/status/{task_id}.
    `result` is populated only when status == 'completed'.
    """
    task_id: str
    status: str  # "queued" | "processing" | "completed" | "failed"
    result: Optional[AnalysisResponse] = None
    error: Optional[str] = None
