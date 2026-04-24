"""
Celery task for the Resources module.

Architecture (mirrors question_tasks.py):
  - Single orchestrator task: task_generate_resources
    → Calls LLM once with ALL missing skills (batch prompt)
    → Returns a dict that the handler persists to DB via poll endpoint

Import path for Celery autodiscovery:
    modules.resources.resources_tasks
"""

import logging

from utils.celery_worker import celery
from services.resources.resources_service import generate_resources_llm

logger = logging.getLogger(__name__)


@celery.task(
    name="resources.generate_resources",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def task_generate_resources(
    self,
    career_input_id: str,
    missing_skills: list,
) -> dict:
    """
    Orchestrator task — calls LLM to generate learning resources for
    every missing skill in a single batched prompt.

    Returns:
        {
            "career_input_id": str,
            "resources": list[dict]   # one ResourceItem dict per skill
        }
    """
    logger.info(
        "Starting resource generation for career_input=%s (%d skills)",
        career_input_id,
        len(missing_skills),
    )

    # Signal the frontend that the worker has picked this up
    self.update_state(state="STARTED", meta={"career_input_id": career_input_id})

    try:
        resources = generate_resources_llm(missing_skills)
    except Exception as exc:
        logger.warning(
            "Resource generation failed (attempt %s/%s) for career_input=%s: %s",
            self.request.retries + 1,
            self.max_retries + 1,
            career_input_id,
            exc,
        )
        raise self.retry(exc=exc)

    logger.info(
        "Resource generation completed for career_input=%s | %d resources",
        career_input_id,
        len(resources),
    )

    return {
        "career_input_id": career_input_id,
        "resources": resources,
    }
