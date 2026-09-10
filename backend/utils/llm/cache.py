"""
Redis-backed LLM response cache for CareerLens.

Cache key: sha256(task + "|" + prompt)  — deterministic, no secrets in key.
TTL: LLM_CACHE_TTL_SECONDS env var (default 3600 seconds).

Graceful degradation:
    If Redis is unavailable at call time, both get() and set() log a warning
    and return None / do nothing respectively.  The router continues normally.

Usage:
    from utils.llm.cache import llm_cache

    cached = llm_cache.get(task, prompt)
    if cached is not None:
        return cached

    response = <call provider>

    llm_cache.set(task, prompt, response)
"""

from __future__ import annotations

import hashlib
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_TTL: int = int(os.getenv("LLM_CACHE_TTL_SECONDS", "3600"))
_CACHE_KEY_PREFIX = "llm_cache:"


def _make_key(task: str, prompt: str) -> str:
    """Deterministic Redis key from task name + prompt content."""
    digest = hashlib.sha256(f"{task}|{prompt}".encode("utf-8")).hexdigest()
    return f"{_CACHE_KEY_PREFIX}{task}:{digest}"


class LLMCache:
    """
    Thin wrapper around the application's Redis client.

    Deliberately imports redis_client lazily so that if Redis is down at
    module load time, the import still succeeds (same pattern as celery_worker.py).
    """

    def _client(self):
        """Return the shared redis_client or None if unavailable."""
        try:
            from config.redis import redis_client
            return redis_client
        except Exception as exc:
            logger.debug("LLMCache: Redis client unavailable: %s", exc)
            return None

    def get(self, task: str, prompt: str) -> Optional[str]:
        """
        Return cached LLM response or None on miss / Redis unavailable.

        Args:
            task:   Task identifier (e.g. "resume_score").
            prompt: Full prompt string sent to the LLM.

        Returns:
            Cached response string, or None on cache miss.
        """
        client = self._client()
        if client is None:
            return None

        key = _make_key(task, prompt)
        try:
            value = client.get(key)
            if value is not None:
                logger.info(
                    "LLM cache HIT | task=%s | key_suffix=...%s",
                    task,
                    key[-8:],
                )
            else:
                logger.debug(
                    "LLM cache MISS | task=%s | key_suffix=...%s",
                    task,
                    key[-8:],
                )
            return value  # str (decode_responses=True) or None
        except Exception as exc:
            logger.warning("LLMCache.get failed (Redis error): %s", exc)
            return None

    def set(self, task: str, prompt: str, response: str) -> None:
        """
        Store an LLM response in Redis with TTL.

        Args:
            task:     Task identifier.
            prompt:   Full prompt string.
            response: LLM response text to cache.
        """
        client = self._client()
        if client is None:
            return

        key = _make_key(task, prompt)
        try:
            client.setex(key, _TTL, response)
            logger.debug(
                "LLM cache SET | task=%s | ttl=%ds | key_suffix=...%s",
                task,
                _TTL,
                key[-8:],
            )
        except Exception as exc:
            logger.warning("LLMCache.set failed (Redis error): %s", exc)

    def invalidate(self, task: str, prompt: str) -> None:
        """Explicitly remove a cached entry (useful for testing)."""
        client = self._client()
        if client is None:
            return
        key = _make_key(task, prompt)
        try:
            client.delete(key)
        except Exception as exc:
            logger.warning("LLMCache.invalidate failed: %s", exc)


# Module-level singleton — imported by the router
llm_cache = LLMCache()
