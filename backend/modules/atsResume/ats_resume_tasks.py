"""
Celery task for the ATS Resume Rewriter module.

Single orchestrator task — calls LLM once with the full resume context
and returns the plain-text rewritten resume.

Import path for Celery autodiscovery:
    modules.atsResume.ats_resume_tasks
"""

import logging

from utils.celery_worker import celery
from services.atsResume.ats_resume_service import generate_ats_resume_llm

logger = logging.getLogger(__name__)


@celery.task(
    name="ats_resume.generate_ats_resume",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def task_generate_ats_resume(
    self,
    career_input_id: str,
    job_description: str,
    resume_text: str,
    missing_skills: list,
) -> dict:
    """
    Calls the LLM to rewrite the user's resume in ATS-optimized plain text.

    Returns:
        {
            "career_input_id":  str,
            "rewritten_resume": str   # plain-text ATS resume
        }
    """
    logger.info(
        "Starting ATS resume generation for career_input=%s", career_input_id
    )

    # Signal the frontend that the worker has started
    self.update_state(state="STARTED", meta={"career_input_id": career_input_id})

    try:
        rewritten_resume = generate_ats_resume_llm(
            job_description=job_description,
            resume_text=resume_text,
            missing_skills=missing_skills,
        )
    except Exception as exc:
        logger.warning(
            "ATS resume generation failed (attempt %s/%s) for career_input=%s: %s",
            self.request.retries + 1,
            self.max_retries + 1,
            career_input_id,
            exc,
        )
        raise self.retry(exc=exc)

    logger.info(
        "ATS resume generation completed for career_input=%s (%d chars)",
        career_input_id,
        len(rewritten_resume),
    )

    return {
        "career_input_id":  career_input_id,
        "rewritten_resume": rewritten_resume,
    }
