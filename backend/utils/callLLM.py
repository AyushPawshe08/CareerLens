"""
utils/callLLM.py — Backward-compatibility shim.

IMPORTANT: Do not add new LLM logic here.
           All new code should use:  from utils.llm import llm_router

This module is kept so that any legacy import of `call_llm` or
`handle_celery_task_exception` continues to work without modification.
Both functions delegate to the new utils.llm orchestration layer.

Deprecated call pattern (still supported):
    from utils.callLLM import call_llm
    text = call_llm(prompt, task="resume_score")

Preferred call pattern (new code):
    from utils.llm import llm_router
    text = llm_router.generate(task="resume_score", prompt=prompt)
"""

import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# call_llm — shim delegating to llm_router.generate()
# ---------------------------------------------------------------------------

def call_llm(
    prompt: str,
    model: str = None,       # kept for signature compatibility; ignored by router
    temperature: float = 0.2,
    max_tokens: int = 1500,
    task: str = None,
) -> str:
    """
    Legacy LLM caller — now delegates to the central LLM router.

    The `model` parameter is ignored; model selection is controlled by the
    routing_config.TASK_ROUTES mapping based on `task`.

    Args:
        prompt:      Full prompt string.
        model:       IGNORED (kept for backward compatibility only).
        temperature: Sampling temperature passed to the provider.
        max_tokens:  Max tokens to generate.
        task:        Task identifier for routing (e.g. "resume_score").
                     If None or not found in routes, falls back to "default".

    Returns:
        Raw LLM response string.

    Raises:
        RuntimeError: If all providers fail (wraps AllProvidersExhaustedError).
    """
    from utils.llm import llm_router, AllProvidersExhaustedError

    if model is not None:
        logger.debug(
            "call_llm: 'model' parameter '%s' is ignored — use task routing instead.",
            model,
        )

    effective_task = task or "default"

    try:
        return llm_router.generate(
            task=effective_task,
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except AllProvidersExhaustedError as exc:
        # Preserve the original RuntimeError interface expected by legacy callers
        raise RuntimeError(str(exc)) from exc


# ---------------------------------------------------------------------------
# handle_celery_task_exception — updated to recognise typed LLM errors
# ---------------------------------------------------------------------------

def handle_celery_task_exception(task, exc: Exception) -> None:
    """
    Centralized handler for Celery task exceptions.

    Classification:
        PermanentLLMError       → raise immediately (no retry)
        TransientLLMError       → retry with 30-second countdown
        AllProvidersExhaustedError → raise immediately (exhausted all options)
        "404 / not_found" text  → raise immediately (permanent)
        "429 / rate_limit" text → retry with 30-second countdown (legacy path)
        Other exceptions        → retry with default task settings

    This function ALWAYS raises (either the original exc or a retry signal).
    It never returns normally.
    """
    from utils.llm.exceptions import (
        AllProvidersExhaustedError,
        PermanentLLMError,
        TransientLLMError,
    )

    exc_str = str(exc).lower()

    # ── Typed errors from the new orchestration layer ──────────────────────

    if isinstance(exc, PermanentLLMError):
        logger.error(
            "Permanent LLM error (no retry). task=%s provider=%s model=%s error=%s",
            task.name,
            getattr(exc, "provider", ""),
            getattr(exc, "model", ""),
            exc,
        )
        raise exc

    if isinstance(exc, AllProvidersExhaustedError):
        logger.error(
            "All LLM providers exhausted (no retry). task=%s error=%s",
            task.name,
            exc,
        )
        raise exc

    if isinstance(exc, TransientLLMError):
        logger.warning(
            "Transient LLM error (attempt %s/%s). Retrying task %s in 30s. "
            "provider=%s model=%s error=%s",
            task.request.retries + 1,
            task.max_retries + 1,
            task.name,
            getattr(exc, "provider", ""),
            getattr(exc, "model", ""),
            exc,
        )
        raise task.retry(exc=exc, countdown=30)

    # ── Legacy text-based classification (for non-typed exceptions) ─────────

    # 404 / model-not-found is permanent
    if "404" in exc_str or "not found" in exc_str or "not_found" in exc_str:
        logger.error(
            "Permanent 404/not-found error (no retry). task=%s error=%s",
            task.name,
            exc,
        )
        raise exc

    # 400 / 401 / 403 are permanent
    if any(code in exc_str for code in ["400", "401", "403",
                                         "invalid api key", "permission denied",
                                         "bad request", "forbidden"]):
        logger.error(
            "Permanent auth/bad-request error (no retry). task=%s error=%s",
            task.name,
            exc,
        )
        raise exc

    # 429 / rate-limit is transient
    if any(term in exc_str for term in ["429", "resource_exhausted",
                                         "rate limit", "quota"]):
        logger.warning(
            "Transient rate-limit error (attempt %s/%s). "
            "Retrying task %s in 30s. error=%s",
            task.request.retries + 1,
            task.max_retries + 1,
            task.name,
            exc,
        )
        raise task.retry(exc=exc, countdown=30)

    # All other exceptions — retry with task default delay
    logger.warning(
        "Unexpected error (attempt %s/%s). Retrying task %s. error=%s",
        task.request.retries + 1,
        task.max_retries + 1,
        task.name,
        exc,
    )
    raise task.retry(exc=exc)
