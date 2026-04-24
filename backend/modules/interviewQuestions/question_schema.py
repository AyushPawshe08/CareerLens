"""
Pydantic schemas for the interviewQuestions module.

InterviewQuestionTriggerResponse  — returned immediately after POST
InterviewQuestionStatusResponse   — returned by GET /status/{task_id}
InterviewQuestionResponse         — full result, returned after completion
"""

from pydantic import BaseModel
from typing import List, Optional


class InterviewQuestionResponse(BaseModel):
    """Full interview question result — returned when status == 'completed'."""
    id: str
    career_input_id: str
    user_id: int
    technical_questions: List[str]
    behavioural_questions: List[str]
    hr_questions: List[str]

    class Config:
        from_attributes = True


class InterviewQuestionTriggerResponse(BaseModel):
    """
    Returned immediately after POST /interview-questions/{career_input_id}.
    The client should poll GET /interview-questions/status/{task_id}.
    """
    task_id: Optional[str] = None
    status: str  # "queued" | "completed" (if already cached)
    interview_question_id: Optional[str] = None  # set when already completed
    message: str = ""


class InterviewQuestionStatusResponse(BaseModel):
    """
    Returned by GET /interview-questions/status/{task_id}.
    `result` is populated only when status == 'completed'.
    """
    task_id: str
    status: str  # "queued" | "processing" | "completed" | "failed"
    result: Optional[InterviewQuestionResponse] = None
    error: Optional[str] = None
