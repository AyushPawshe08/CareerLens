"""
Token optimizer for the LLM router.

Problem:
    Every LLM call currently receives the full resume_text, which can be
    several thousand tokens.  Many tasks only need a subset of that content.
    Sending unnecessary tokens wastes money and increases latency.

Solution:
    For each task, define the maximum number of characters to include from
    the resume text.  Tasks that need the full resume get no limit.
    Tasks focused on skills/roles get a trimmed version.

Current approach: character-level truncation with ellipsis.
Future path:      If resumes are stored as structured JSON (sections dict),
                  this module can be upgraded to extract only the relevant
                  sections (skills, experience, etc.) without full text.

Usage:
    from utils.llm.token_optimizer import optimize_resume_text

    trimmed = optimize_resume_text(task="resume_score", resume_text=full_text)
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-task character limits for resume_text
#
# Approximate token ratios:
#   1 token ≈ 4 chars (English)
#   1500 chars ≈ 375 tokens — enough for skills + experience summary
#   3000 chars ≈ 750 tokens — enough for a full mid-length resume
#   None       — no limit (full text required)
# ---------------------------------------------------------------------------

_TASK_CHAR_LIMITS: dict[str, int | None] = {
    # Needs skills + experience for scoring
    "resume_score": 3000,

    # Only needs the skills section and brief experience
    "missing_skills": 2000,

    # Needs experience, skills, and projects context
    "summary_and_suggestions": 3000,

    # Full resume needed — document rewriting
    "ats_resume": None,

    # Only needs skills and projects for question generation
    "interview_questions": 2000,

    # Only needs skills, experience, education for role matching
    "perfect_job_roles": 2000,

    # Resources task doesn't use resume_text at all (uses skill list only)
    "resources": 0,

    # Default: pass through unchanged
    "default": None,
}

_ELLIPSIS = "\n... [resume truncated for token efficiency]"


def optimize_resume_text(task: str, resume_text: str) -> str:
    """
    Return a token-optimized version of resume_text for the given task.

    Args:
        task:        Task identifier (e.g. "resume_score").
        resume_text: Full original resume text.

    Returns:
        Possibly truncated resume text string.
        Returns empty string if the task does not use resume text at all.
    """
    if not resume_text:
        return ""

    limit = _TASK_CHAR_LIMITS.get(task, None)

    # Task does not use resume_text
    if limit == 0:
        return ""

    # No limit — return full text
    if limit is None:
        return resume_text

    # Apply character cap
    if len(resume_text) <= limit:
        return resume_text

    trimmed = resume_text[:limit] + _ELLIPSIS
    original_chars = len(resume_text)
    saved_chars = original_chars - len(trimmed)
    saved_tokens_approx = saved_chars // 4

    logger.debug(
        "Token optimizer | task=%s | original=%d chars | trimmed=%d chars "
        "| ~%d tokens saved",
        task,
        original_chars,
        len(trimmed),
        saved_tokens_approx,
    )

    return trimmed


def optimize_job_description(task: str, job_description: str) -> str:
    """
    Return a token-optimized version of job_description for the given task.

    Most tasks need the full JD, so this is currently a passthrough.
    Added here for future extensibility without changing call sites.

    Args:
        task:            Task identifier.
        job_description: Full job description text.

    Returns:
        Possibly truncated JD string.
    """
    # JD is almost always short enough; cap at 4000 chars as a safety net
    _JD_MAX = 4000
    if not job_description or len(job_description) <= _JD_MAX:
        return job_description or ""
    trimmed = job_description[:_JD_MAX] + "\n... [job description truncated]"
    logger.debug(
        "Token optimizer | JD truncated | task=%s | original=%d | trimmed=%d",
        task,
        len(job_description),
        len(trimmed),
    )
    return trimmed
