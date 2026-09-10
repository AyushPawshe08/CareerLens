"""
Central LLM router for CareerLens.

Public API:
    from utils.llm import llm_router

    # Returns raw text (cached, with fallback)
    text = llm_router.generate(task="resume_score", prompt=prompt)

    # Returns validated dict (JSON tasks only)
    data = llm_router.generate_json(task="resume_score", prompt=prompt)

Internal flow for generate():
    1.  Check Redis cache → return immediately on HIT (logs cache_hit)
    2.  Iterate provider fallback chain (from routing_config.TASK_ROUTES)
    3.  For each provider:
            a. Attempt call via providers.PROVIDER_CALLERS[provider]
            b. On TransientLLMError: exponential backoff, retry up to max_retries
            c. On PermanentLLMError: log and skip to next provider immediately
            d. On success: cache the result, log metrics, return text
    4.  If all providers exhausted: raise AllProvidersExhaustedError

Internal flow for generate_json():
    1.  Call generate() to get raw text
    2.  Extract JSON from text (robust parser)
    3.  Validate with Pydantic schema (from output_schemas.TASK_SCHEMA_MAP)
    4.  On validation failure: retry ONCE with a repair prompt via generate()
    5.  On second failure: raise with descriptive error message
    6.  Return validated dict

Logging contract (one structured log line per request):
    provider, model, latency_ms, retries, cache_hit, fallback_used, task,
    validation_ok, repair_attempted
"""

from __future__ import annotations

import json
import logging
import random
import time
from typing import Any, Optional

from utils.llm.cache import llm_cache
from utils.llm.exceptions import (
    AllProvidersExhaustedError,
    LLMError,
    PermanentLLMError,
    TransientLLMError,
)
from utils.llm.output_schemas import TASK_SCHEMA_MAP, build_repair_prompt
from utils.llm.providers import PROVIDER_CALLERS
from utils.llm.routing_config import ProviderConfig, get_route

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_json_robust(text: str) -> dict[str, Any]:
    """
    Extract the first top-level JSON object from an LLM response.

    More robust than a naive find/rfind approach:
        1. Try parsing the whole string first (common for clean responses).
        2. Walk forward to the first '{', then walk back from the last '}'.
        3. Raise ValueError if no valid JSON object is found.
    """
    if not text or not text.strip():
        raise ValueError("LLM returned empty response.")

    # Attempt 1: clean response (no extra text)
    stripped = text.strip()
    if stripped.startswith("{"):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass

    # Attempt 2: extract between first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM response contains no JSON object.")

    candidate = text[start: end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON extraction failed: {exc}") from exc


def _call_with_retries(
    provider_cfg: ProviderConfig,
    prompt: str,
    temperature: float,
    max_tokens: int,
    task: str,
) -> tuple[str, int]:
    """
    Call a single provider with exponential-backoff retries on transient errors.

    Returns:
        (response_text, attempts_used)

    Raises:
        PermanentLLMError: immediately on permanent failure.
        TransientLLMError: after all retries are exhausted.
    """
    caller = PROVIDER_CALLERS.get(provider_cfg.provider)
    if caller is None:
        raise PermanentLLMError(
            f"Unknown provider '{provider_cfg.provider}'",
            provider=provider_cfg.provider,
            model=provider_cfg.model,
        )

    last_exc: Optional[TransientLLMError] = None

    for attempt in range(provider_cfg.max_retries):
        try:
            text = caller(
                prompt=prompt,
                model=provider_cfg.model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return text, attempt + 1

        except PermanentLLMError:
            # Never retry permanent errors — re-raise immediately
            raise

        except TransientLLMError as exc:
            last_exc = exc
            if attempt < provider_cfg.max_retries - 1:
                delay = provider_cfg.base_delay * (2 ** attempt) + random.uniform(0.2, 1.0)
                logger.warning(
                    "Transient error on %s/%s (attempt %d/%d) for task=%s. "
                    "Retrying in %.1fs. Error: %s",
                    provider_cfg.provider,
                    provider_cfg.model,
                    attempt + 1,
                    provider_cfg.max_retries,
                    task,
                    delay,
                    exc,
                )
                time.sleep(delay)
            else:
                logger.warning(
                    "Transient error on %s/%s: all %d retries exhausted for task=%s.",
                    provider_cfg.provider,
                    provider_cfg.model,
                    provider_cfg.max_retries,
                    task,
                )

    # All retries exhausted — raise the last transient error
    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# LLMRouter
# ---------------------------------------------------------------------------

class LLMRouter:
    """
    Central LLM orchestration router.

    Methods:
        generate(task, prompt, ...)         → str   (raw text, cached)
        generate_json(task, prompt, ...)    → dict  (validated JSON dict)
    """

    # ------------------------------------------------------------------
    # generate() — raw text with caching + fallback
    # ------------------------------------------------------------------

    def generate(
        self,
        task: str,
        prompt: str,
        *,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        _skip_cache: bool = False,      # internal flag used by repair loop
    ) -> str:
        """
        Generate a raw text response for the given task.

        Args:
            task:         Task identifier (must match a key in TASK_ROUTES or
                          falls back to "default").
            prompt:       Full prompt string.
            temperature:  Sampling temperature (passed to provider).
            max_tokens:   Maximum tokens to generate (passed to provider).
            _skip_cache:  If True, bypass cache lookup (used internally by
                          the repair retry).

        Returns:
            Raw LLM response string.

        Raises:
            AllProvidersExhaustedError: if every provider in the chain failed.
        """
        # 1. Cache check
        if not _skip_cache:
            cached = llm_cache.get(task, prompt)
            if cached is not None:
                logger.info(
                    "LLM request served | task=%s | cache_hit=True | latency_ms=0",
                    task,
                )
                return cached

        # 2. Iterate provider chain
        provider_errors: dict[str, str] = {}
        route = get_route(task)
        fallback_used = False

        for idx, provider_cfg in enumerate(route):
            if idx > 0:
                fallback_used = True

            t_start = time.perf_counter()

            try:
                text, attempts = _call_with_retries(
                    provider_cfg=provider_cfg,
                    prompt=prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    task=task,
                )

                latency_ms = int((time.perf_counter() - t_start) * 1000)

                logger.info(
                    "LLM request completed | task=%s | provider=%s | model=%s "
                    "| latency_ms=%d | retries=%d | cache_hit=False | fallback_used=%s",
                    task,
                    provider_cfg.provider,
                    provider_cfg.model,
                    latency_ms,
                    attempts - 1,
                    fallback_used,
                )

                # 3. Store in cache
                if not _skip_cache:
                    llm_cache.set(task, prompt, text)

                return text

            except PermanentLLMError as exc:
                # Log and skip this provider — permanent errors won't recover
                logger.error(
                    "Permanent error on %s/%s for task=%s — skipping provider. Error: %s",
                    provider_cfg.provider,
                    provider_cfg.model,
                    task,
                    exc,
                )
                provider_errors[provider_cfg.provider] = str(exc)

            except TransientLLMError as exc:
                # Retries exhausted for this provider — try next
                logger.error(
                    "All retries exhausted on %s/%s for task=%s — trying next provider. Error: %s",
                    provider_cfg.provider,
                    provider_cfg.model,
                    task,
                    exc,
                )
                provider_errors[provider_cfg.provider] = str(exc)

            except LLMError as exc:
                # Any other LLM error — log and try next
                logger.error(
                    "LLMError on %s/%s for task=%s: %s",
                    provider_cfg.provider,
                    provider_cfg.model,
                    task,
                    exc,
                )
                provider_errors[provider_cfg.provider] = str(exc)

        # 4. All providers exhausted
        raise AllProvidersExhaustedError(task=task, provider_errors=provider_errors)

    # ------------------------------------------------------------------
    # generate_json() — validated JSON dict with repair retry
    # ------------------------------------------------------------------

    def generate_json(
        self,
        task: str,
        prompt: str,
        *,
        temperature: float = 0.2,
        max_tokens: int = 1500,
    ) -> dict[str, Any]:
        """
        Generate and validate a structured JSON response for the given task.

        Validation flow:
            1. Call generate() → raw text
            2. Extract JSON with _extract_json_robust()
            3. Validate with Pydantic schema (TASK_SCHEMA_MAP[task])
            4. On failure: build a repair prompt and retry ONCE (cache bypassed)
            5. On second failure: raise ValueError with clear message

        Args:
            task:        Task identifier.
            prompt:      Full prompt string.
            temperature: Sampling temperature.
            max_tokens:  Max tokens to generate.

        Returns:
            Validated dict matching the task's Pydantic schema.

        Raises:
            AllProvidersExhaustedError: if LLM generation fails entirely.
            ValueError:                 if JSON validation fails after repair.
        """
        schema_cls = TASK_SCHEMA_MAP.get(task)

        # --- First attempt ---
        raw = self.generate(task=task, prompt=prompt,
                            temperature=temperature, max_tokens=max_tokens)

        parsed, validation_error = self._validate_response(raw, schema_cls, task)
        if parsed is not None:
            logger.debug("LLM JSON validation OK | task=%s", task)
            return parsed

        # --- Repair attempt ---
        logger.warning(
            "LLM JSON validation FAILED for task=%s. "
            "Attempting repair. Error: %s",
            task,
            validation_error,
        )

        schema_hint = schema_cls.model_json_schema() if schema_cls else "valid JSON object"
        repair_prompt = build_repair_prompt(
            original_prompt=prompt,
            bad_response=raw,
            schema_hint=str(schema_hint),
        )

        try:
            repaired_raw = self.generate(
                task=task,
                prompt=repair_prompt,
                temperature=0.1,          # lower temperature for repair
                max_tokens=max_tokens,
                _skip_cache=True,         # repair responses must not be cached
            )
        except LLMError as exc:
            raise ValueError(
                f"LLM repair attempt failed for task '{task}': {exc}"
            ) from exc

        parsed, second_error = self._validate_response(repaired_raw, schema_cls, task)
        if parsed is not None:
            logger.info("LLM JSON repair succeeded | task=%s", task)
            return parsed

        logger.error(
            "LLM JSON validation FAILED after repair | task=%s | error=%s",
            task,
            second_error,
        )
        raise ValueError(
            f"LLM response for task '{task}' failed JSON validation twice. "
            f"Last error: {second_error}. "
            f"Raw response (first 300 chars): {raw[:300]}"
        )

    # ------------------------------------------------------------------
    # Internal helper
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_response(
        raw: str,
        schema_cls,
        task: str,
    ) -> tuple[Optional[dict[str, Any]], Optional[str]]:
        """
        Try to extract and validate a JSON dict from raw text.

        Returns:
            (validated_dict, None)   on success
            (None, error_message)    on failure
        """
        try:
            data = _extract_json_robust(raw)
        except ValueError as exc:
            return None, f"JSON extraction error: {exc}"

        if schema_cls is None:
            # No schema registered — return raw dict as-is
            return data, None

        try:
            validated = schema_cls.model_validate(data)
            return validated.model_dump(), None
        except Exception as exc:
            return None, f"Pydantic validation error: {exc}"


# ---------------------------------------------------------------------------
# Module-level singleton — the only instance that services should import
# ---------------------------------------------------------------------------

llm_router = LLMRouter()
