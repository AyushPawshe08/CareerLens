"""
utils/llm — LLM Orchestration Layer for CareerLens.

Public exports:
    llm_router          Central router instance (use this in all services)
    TransientLLMError   Retry-safe error
    PermanentLLMError   Do-not-retry error
    AllProvidersExhaustedError  All providers failed
    LLMError            Base class

Usage:
    from utils.llm import llm_router

    # Raw text (with caching + fallback)
    text = llm_router.generate(task="resume_score", prompt=my_prompt)

    # Validated JSON dict
    data = llm_router.generate_json(task="resume_score", prompt=my_prompt)
"""

from utils.llm.exceptions import (
    AllProvidersExhaustedError,
    LLMError,
    PermanentLLMError,
    TransientLLMError,
)
from utils.llm.router import LLMRouter, llm_router

__all__ = [
    "llm_router",
    "LLMRouter",
    "LLMError",
    "TransientLLMError",
    "PermanentLLMError",
    "AllProvidersExhaustedError",
]
