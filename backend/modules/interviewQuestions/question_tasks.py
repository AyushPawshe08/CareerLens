"""
Celery tasks for the interview question generation pipeline.

Architecture (mirrors analysis_tasks.py):
  - 3 leaf tasks run in PARALLEL via Celery group():
      task_generate_technical_questions
      task_generate_behavioural_questions
      task_generate_hr_questions
  - 1 orchestrator task (task_generate_interview_questions) dispatches the
    group, waits for all results, then returns a combined dict.
  - The handler persists the result to DB via the poll endpoint (fire-and-poll).

Import path for Celery autodiscovery:
    modules.interviewQuestions.question_tasks
"""

import logging

from utils.celery_worker import celery

from services.interviewQuestions.technicalQ_service import generate_technical_questions_llm
from services.interviewQuestions.behavourialQ_service import generate_behavioural_questions_llm
from services.interviewQuestions.hrQ_service import generate_hr_questions_llm

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Leaf task 1 — Technical Questions
# ---------------------------------------------------------------------------

@celery.task(
    name="interview_questions.generate_technical_questions",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_generate_technical_questions(
    self,
    job_description: str,
    matched_skills: list,
    missing_skills: list,
) -> list:
    """Returns a list of 5–8 technical interview question strings."""
    try:
        result = generate_technical_questions_llm(
            job_description=job_description,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
        )
        logger.info("Technical questions task completed: %d questions", len(result))
        return result
    except Exception as exc:
        logger.warning(
            "Technical questions task failed (attempt %s/%s): %s",
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
        )
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Leaf task 2 — Behavioural Questions
# ---------------------------------------------------------------------------

@celery.task(
    name="interview_questions.generate_behavioural_questions",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_generate_behavioural_questions(
    self,
    job_description: str,
    resume_text: str,
) -> list:
    """Returns a list of 5–8 behavioural interview question strings."""
    try:
        result = generate_behavioural_questions_llm(
            job_description=job_description,
            resume_text=resume_text,
        )
        logger.info("Behavioural questions task completed: %d questions", len(result))
        return result
    except Exception as exc:
        logger.warning(
            "Behavioural questions task failed (attempt %s/%s): %s",
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
        )
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Leaf task 3 — HR Questions
# ---------------------------------------------------------------------------

@celery.task(
    name="interview_questions.generate_hr_questions",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
)
def task_generate_hr_questions(
    self,
    job_description: str,
    resume_text: str,
) -> list:
    """Returns a list of 5–8 HR interview question strings."""
    try:
        result = generate_hr_questions_llm(
            job_description=job_description,
            resume_text=resume_text,
        )
        logger.info("HR questions task completed: %d questions", len(result))
        return result
    except Exception as exc:
        logger.warning(
            "HR questions task failed (attempt %s/%s): %s",
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
        )
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Orchestrator task — dispatches all 3 leaf tasks in parallel
# ---------------------------------------------------------------------------

@celery.task(
    name="interview_questions.generate_interview_questions",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
)
def task_generate_interview_questions(
    self,
    career_input_id: str,
    job_description: str,
    resume_text: str,
    matched_skills: list,
    missing_skills: list,
) -> dict:
    """
    Orchestrator: dispatches 3 LLM tasks in parallel via Celery group().

    Returns:
        {
            "career_input_id": str,
            "technical_questions":   list[str],   # 5–8
            "behavioural_questions": list[str],   # 5–8
            "hr_questions":          list[str],   # 5–8
        }
    """
    from celery import group

    logger.info(
        "Starting interview question generation for career_input=%s", career_input_id
    )

    # Signal the frontend that work has started
    self.update_state(state="STARTED", meta={"career_input_id": career_input_id})

    # Dispatch all 3 LLM calls simultaneously
    job = group(
        task_generate_technical_questions.s(
            job_description, matched_skills, missing_skills
        ),
        task_generate_behavioural_questions.s(job_description, resume_text),
        task_generate_hr_questions.s(job_description, resume_text),
    )

    group_result = job.apply_async()

    try:
        # .get() is safe here because worker_pool = "threads" (not prefork)
        results = group_result.get(timeout=180, disable_sync_subtasks=False)
    except Exception as exc:
        logger.error(
            "Group subtasks failed for career_input=%s: %s", career_input_id, exc
        )
        raise self.retry(exc=exc)

    technical_questions, behavioural_questions, hr_questions = results

    logger.info(
        "Interview questions completed for career_input=%s | tech=%d, behav=%d, hr=%d",
        career_input_id,
        len(technical_questions),
        len(behavioural_questions),
        len(hr_questions),
    )

    return {
        "career_input_id": career_input_id,
        "technical_questions": technical_questions,
        "behavioural_questions": behavioural_questions,
        "hr_questions": hr_questions,
    }
