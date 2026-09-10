"""
LLM error hierarchy for CareerLens.

Two concrete classes allow callers and Celery retry logic to distinguish
between errors that are worth retrying and those that will never recover:

    TransientLLMError  — 429, timeouts, connection resets  → retry with backoff
    PermanentLLMError  — 400, 401, 403, 404, bad key       → raise immediately
"""


class LLMError(Exception):
    """Base class for all LLM orchestration errors."""

    def __init__(self, message: str, provider: str = "", model: str = ""):
        super().__init__(message)
        self.provider = provider
        self.model = model

    def __str__(self) -> str:
        parts = [super().__str__()]
        if self.provider:
            parts.append(f"provider={self.provider}")
        if self.model:
            parts.append(f"model={self.model}")
        return " | ".join(parts)


class TransientLLMError(LLMError):
    """
    Raised for errors that may resolve on retry.

    Examples:
        - HTTP 429 (rate limit / quota exhausted)
        - RESOURCE_EXHAUSTED gRPC status
        - Connection timeout
        - Network reset
    """


class PermanentLLMError(LLMError):
    """
    Raised for errors that will NOT resolve on retry.

    Examples:
        - HTTP 400 (malformed request)
        - HTTP 401 (invalid API key)
        - HTTP 403 (forbidden)
        - HTTP 404 (model not found)
        - Invalid model name
    """


class AllProvidersExhaustedError(LLMError):
    """
    Raised when every provider in the fallback chain has failed.
    Carries the last error from each provider for diagnostics.
    """

    def __init__(self, task: str, provider_errors: dict[str, str]):
        self.task = task
        self.provider_errors = provider_errors  # {provider_name: error_message}
        details = "; ".join(f"{p}: {e}" for p, e in provider_errors.items())
        super().__init__(f"All LLM providers failed for task '{task}'. Details: {details}")
