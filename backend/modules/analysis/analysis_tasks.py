"""
Celery tasks for the analysis pipeline.

Each LLM service call is wrapped in its own task so the four independent
calls (summary, skills, roles, score) can be dispatched in parallel
via a Celery `group`, cutting total wall-clock time from ~4× LLM latency
down to ~1× LLM latency.

Import path expected by Celery autodiscover: modules.analysis.analysis_tasks
"""

import logging

from utils.celery_worker import celery

from services.analysis.summaryAndImprovements import get_summary_and_suggestions
from services.analysis.skillService import get_missing_and_matched_skills
from services.analysis.role_service import get_perfect_job_roles
from services.analysis.scoring_service import get_resume_score

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Individual LLM tasks  (all run concurrently inside a Celery group)
# ---------------------------------------------------------------------------

@celery.task(
    name="analysis.get_summary_and_suggestions",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_get_summary_and_suggestions(self, job_description: str, resume_text: str) -> dict:
    """Returns {'summary': str, 'suggestions': list[str]}"""
    try:
        result = get_summary_and_suggestions(job_description, resume_text)
        logger.info("Summary task completed successfully")
        return result
    except Exception as exc:
        logger.warning("Summary task failed (attempt %s/%s): %s", self.request.retries + 1, self.max_retries + 1, exc)
        raise self.retry(exc=exc)


@celery.task(
    name="analysis.get_missing_and_matched_skills",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_get_missing_and_matched_skills(self, job_description: str, resume_text: str) -> dict:
    """Returns {'missing_skills': list[str], 'matched_skills': list[str]}"""
    try:
        result = get_missing_and_matched_skills(job_description, resume_text)
        logger.info("Skills task completed successfully")
        return result
    except Exception as exc:
        logger.warning("Skills task failed (attempt %s/%s): %s", self.request.retries + 1, self.max_retries + 1, exc)
        raise self.retry(exc=exc)


@celery.task(
    name="analysis.get_perfect_job_roles",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_get_perfect_job_roles(self, resume_text: str) -> list:
    """Returns list[str] of ideal job role names."""
    try:
        result = get_perfect_job_roles(resume_text)
        logger.info("Roles task completed successfully")
        return result
    except Exception as exc:
        logger.warning("Roles task failed (attempt %s/%s): %s", self.request.retries + 1, self.max_retries + 1, exc)
        raise self.retry(exc=exc)


@celery.task(
    name="analysis.get_resume_score",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_get_resume_score(self, job_description: str, resume_text: str) -> int:
    """Returns an integer score between 0 and 100."""
    try:
        result = get_resume_score(job_description, resume_text)
        logger.info("Score task completed successfully")
        return result
    except Exception as exc:
        logger.warning("Score task failed (attempt %s/%s): %s", self.request.retries + 1, self.max_retries + 1, exc)
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Orchestrator task  — dispatches the four subtasks in parallel and
# collects results.  This is what the FastAPI route triggers.
# ---------------------------------------------------------------------------

@celery.task(
    name="analysis.run_full_analysis",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
)
def task_run_full_analysis(self, career_input_id: str, job_description: str, resume_text: str) -> dict:
    """
    Orchestrates the four LLM tasks in parallel using a Celery group.

    Returns a single dict with all analysis results:
    {
        "career_input_id": str,
        "summary": str,
        "suggestions": list[str],
        "missing_skills": list[str],
        "matched_skills": list[str],
        "perfect_job_roles": list[str],
        "resume_score": int,
    }
    """
    from celery import group

    logger.info("Starting full analysis for career_input=%s", career_input_id)

    # Update state so the frontend can show "processing"
    self.update_state(state="STARTED", meta={"career_input_id": career_input_id})

    # Dispatch all 4 LLM calls simultaneously
    job = group(
        task_get_summary_and_suggestions.s(job_description, resume_text),
        task_get_missing_and_matched_skills.s(job_description, resume_text),
        task_get_perfect_job_roles.s(resume_text),
        task_get_resume_score.s(job_description, resume_text),
    )

    # .get() blocks inside the worker until all subtasks finish.
    # This is safe because we use the 'threads' pool (not prefork),
    # and this task itself runs in a worker thread, not in the FastAPI event loop.
    group_result = job.apply_async()

    try:
        results = group_result.get(timeout=120, disable_sync_subtasks=False)
    except Exception as exc:
        logger.error("Group subtasks failed for career_input=%s: %s", career_input_id, exc)
        raise self.retry(exc=exc)

    summary_data, skills_data, roles, score = results

    logger.info("Full analysis completed for career_input=%s", career_input_id)

    return {
        "career_input_id": career_input_id,
        "summary": summary_data.get("summary", ""),
        "suggestions": summary_data.get("suggestions", []),
        "missing_skills": skills_data.get("missing_skills", []),
        "matched_skills": skills_data.get("matched_skills", []),
        "perfect_job_roles": roles,
        "resume_score": score,
    }
