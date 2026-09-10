"""
Pydantic v2 output schemas for every structured LLM task in CareerLens.

Purpose:
    Validate and coerce raw LLM JSON responses into typed Python objects.
    If validation fails, the router retries once with a repair prompt before
    raising an error.

Design:
    - Each schema matches exactly what the corresponding service expects back.
    - Schemas are permissive where safe (e.g. extra fields ignored via
      model_config = ConfigDict(extra="ignore")).
    - The TASK_SCHEMA_MAP links task names to their schema classes.
    - Tasks that return plain text (e.g. "ats_resume") are NOT listed here;
      the router skips validation for them.
"""

from __future__ import annotations

from typing import Any, Optional, Type

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Base config shared by all output schemas
# ---------------------------------------------------------------------------

class _BaseOutput(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)


# ---------------------------------------------------------------------------
# resume_score
# ---------------------------------------------------------------------------

class ScoringOutput(_BaseOutput):
    resume_score: int = Field(ge=0, le=100)
    dimension_scores: Optional[dict[str, Any]] = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_required: list[str] = Field(default_factory=list)
    one_line_reason: str = ""

    @field_validator("resume_score", mode="before")
    @classmethod
    def coerce_score(cls, v: Any) -> int:
        try:
            return max(0, min(100, int(v)))
        except (TypeError, ValueError):
            return 0


# ---------------------------------------------------------------------------
# missing_skills
# ---------------------------------------------------------------------------

class SkillsOutput(_BaseOutput):
    missing_skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)

    @field_validator("missing_skills", "matched_skills", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(item).strip() for item in v if str(item).strip()][:8]


# ---------------------------------------------------------------------------
# summary_and_suggestions
# ---------------------------------------------------------------------------

class SuggestionItem(_BaseOutput):
    action: str = ""
    text: str
    impact: str = "medium"


class SummaryAndSuggestionsOutput(_BaseOutput):
    summary: str
    suggestions: list[SuggestionItem] = Field(default_factory=list)

    @field_validator("summary", mode="before")
    @classmethod
    def coerce_summary(cls, v: Any) -> str:
        return str(v).strip() if v else ""

    @field_validator("suggestions", mode="before")
    @classmethod
    def coerce_suggestions(cls, v: Any) -> list:
        if not isinstance(v, list):
            return []
        return [s for s in v if isinstance(s, dict) and s.get("text")][:6]


# ---------------------------------------------------------------------------
# perfect_job_roles
# ---------------------------------------------------------------------------

class PerfectRolesOutput(_BaseOutput):
    perfect_job_roles: list[str] = Field(default_factory=list)

    @field_validator("perfect_job_roles", mode="before")
    @classmethod
    def coerce_roles(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            return []
        cleaned = [str(item).strip() for item in v if str(item).strip()]
        # Clamp to 6–8 items
        return cleaned[:8] if len(cleaned) <= 8 else cleaned[:8]


# ---------------------------------------------------------------------------
# interview_questions  (technical / behavioural / hr share this task name)
# ---------------------------------------------------------------------------

class InterviewQuestionsOutput(_BaseOutput):
    # Each service uses a different top-level key; all are optional here
    technical_questions: list[str] = Field(default_factory=list)
    behavioural_questions: list[str] = Field(default_factory=list)
    hr_questions: list[str] = Field(default_factory=list)

    @field_validator(
        "technical_questions", "behavioural_questions", "hr_questions",
        mode="before"
    )
    @classmethod
    def coerce_questions(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(q).strip() for q in v if str(q).strip()][:8]


# ---------------------------------------------------------------------------
# resources
# ---------------------------------------------------------------------------

class ResourceItem(_BaseOutput):
    skill: str
    videos: list[str] = Field(default_factory=list)
    documentation: list[str] = Field(default_factory=list)
    practice: list[str] = Field(default_factory=list)
    roadmap: Optional[str] = None


class ResourcesOutput(_BaseOutput):
    resources: list[ResourceItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Task → Schema mapping
# ---------------------------------------------------------------------------
# Tasks that return plain text (ats_resume) are NOT included.
# The router checks this map; if the task is absent, it skips JSON validation.
# ---------------------------------------------------------------------------

TASK_SCHEMA_MAP: dict[str, Type[_BaseOutput]] = {
    "resume_score": ScoringOutput,
    "missing_skills": SkillsOutput,
    "summary_and_suggestions": SummaryAndSuggestionsOutput,
    "perfect_job_roles": PerfectRolesOutput,
    "interview_questions": InterviewQuestionsOutput,
    "resources": ResourcesOutput,
}


# ---------------------------------------------------------------------------
# Repair prompt builder
# ---------------------------------------------------------------------------

def build_repair_prompt(original_prompt: str, bad_response: str, schema_hint: str) -> str:
    """
    Constructs a one-shot repair prompt when the first LLM response failed
    Pydantic validation.

    Args:
        original_prompt: The original task prompt.
        bad_response:    The invalid LLM output.
        schema_hint:     A short description of the expected JSON structure.

    Returns:
        A new prompt asking the LLM to return valid JSON.
    """
    return (
        f"Your previous response was not valid JSON or did not match the required schema.\n"
        f"Required structure: {schema_hint}\n\n"
        f"Bad response you gave:\n{bad_response}\n\n"
        f"Original task:\n{original_prompt}\n\n"
        f"Return ONLY valid JSON matching the required structure. "
        f"No markdown, no explanation, no code blocks."
    )
