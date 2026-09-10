"""
Task-to-provider routing configuration for the LLM router.

Design:
    - Each task maps to an ORDERED list of ProviderConfig entries.
    - The router tries them left-to-right; first success wins.
    - All values are read from environment variables so they are
      overridable at deploy time without code changes.

Fallback chain per task (4 slots):
    primary_provider/primary_model
    → groq_secondary (llama-3.1-8b-instant — higher free-tier rate limits)
    → fallback_provider/fallback_model
    → final_provider/final_model

Adding a new task:
    1. Add an entry to TASK_ROUTES with an ordered fallback list.
    2. No other file needs to change.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderConfig:
    """Immutable configuration for a single provider slot in a task route."""

    provider: str        # "gemini" | "groq" | "openrouter"
    model: str           # model identifier string
    max_retries: int     # transient-error retry attempts for this slot
    base_delay: float    # seconds; actual delay = base_delay * 2^attempt + jitter


# ---------------------------------------------------------------------------
# Read model names and retry settings from environment (safe defaults)
# ---------------------------------------------------------------------------

_GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

# Groq primary: most capable model
_GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Groq secondary: lighter model with a separate, higher TPD rate-limit bucket.
# When the primary model hits its daily token cap, this model often still has
# remaining quota — providing an in-provider fallback before crossing providers.
_GROQ_SECONDARY_MODEL: str = os.getenv(
    "GROQ_SECONDARY_MODEL", "llama-3.1-8b-instant"
)

_OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "qwen/qwen3-235b-a22b")

_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "3"))
_BASE_DELAY: float = float(os.getenv("LLM_BASE_DELAY", "2.0"))


# ---------------------------------------------------------------------------
# Provider slot factories
# ---------------------------------------------------------------------------

def _gemini(max_retries: int = _MAX_RETRIES) -> ProviderConfig:
    return ProviderConfig(
        provider="gemini",
        model=_GEMINI_MODEL,
        max_retries=max_retries,
        base_delay=_BASE_DELAY,
    )


def _groq(max_retries: int = _MAX_RETRIES) -> ProviderConfig:
    """Primary Groq slot — llama-3.3-70b-versatile."""
    return ProviderConfig(
        provider="groq",
        model=_GROQ_MODEL,
        max_retries=max_retries,
        base_delay=_BASE_DELAY,
    )


def _groq_secondary(max_retries: int = 2) -> ProviderConfig:
    """
    Secondary Groq slot — llama-3.1-8b-instant.

    Used as an in-provider fallback when the primary Groq model is rate-limited
    or quota-exhausted. Only 2 retries here since if the org is globally rate
    limited, a lighter model also becomes unavailable quickly.
    """
    return ProviderConfig(
        provider="groq",
        model=_GROQ_SECONDARY_MODEL,
        max_retries=max_retries,
        base_delay=_BASE_DELAY,
    )


def _openrouter(max_retries: int = _MAX_RETRIES) -> ProviderConfig:
    return ProviderConfig(
        provider="openrouter",
        model=_OPENROUTER_MODEL,
        max_retries=max_retries,
        base_delay=_BASE_DELAY,
    )


# ---------------------------------------------------------------------------
# Task routing table  (left = primary, right = last resort)
# ---------------------------------------------------------------------------
# Each task now has 4 slots:
#   1. Primary provider/model
#   2. Secondary Groq model  (separate rate-limit bucket on free tier)
#   3. Cross-provider fallback
#   4. Final cross-provider fallback
#
# NOTE: For Groq-primary tasks the secondary slot IS Groq but a lighter model.
#       For Gemini-primary tasks the secondary slot jumps straight to Groq.
# ---------------------------------------------------------------------------

TASK_ROUTES: dict[str, list[ProviderConfig]] = {
    # ── Resume scoring: Gemini primary (structured reasoning) ──────────────
    "resume_score": [
        _gemini(),
        _groq(),
        _groq_secondary(),
        _openrouter(),
    ],

    # ── Skill gap analysis: Gemini primary ─────────────────────────────────
    "missing_skills": [
        _gemini(),
        _groq(),
        _groq_secondary(),
        _openrouter(),
    ],

    # ── Summary + suggestions: Groq primary (fast, concise) ────────────────
    "summary_and_suggestions": [
        _groq(),
        _groq_secondary(),     # ← in-provider model fallback
        _gemini(),
        _openrouter(),
    ],

    # ── ATS resume: OpenRouter/Qwen primary (long-form rewriting) ──────────
    "ats_resume": [
        _openrouter(),
        _gemini(),
        _groq(),
        _groq_secondary(),
    ],

    # ── Interview questions: Groq primary ──────────────────────────────────
    "interview_questions": [
        _groq(),
        _groq_secondary(),     # ← in-provider model fallback
        _gemini(),
        _openrouter(),
    ],

    # ── Perfect job roles: Groq primary ────────────────────────────────────
    "perfect_job_roles": [
        _groq(),
        _groq_secondary(),
        _gemini(),
        _openrouter(),
    ],

    # ── Learning resources: Groq primary ───────────────────────────────────
    "resources": [
        _groq(),
        _groq_secondary(),
        _gemini(),
        _openrouter(),
    ],

    # ── Default (unknown tasks) ─────────────────────────────────────────────
    "default": [
        _groq(),
        _groq_secondary(),
        _gemini(),
        _openrouter(),
    ],
}


def get_route(task: str) -> list[ProviderConfig]:
    """Return the ordered provider list for a task, falling back to 'default'."""
    return TASK_ROUTES.get(task) or TASK_ROUTES["default"]
