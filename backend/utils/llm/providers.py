"""
Provider-level HTTP callers for the LLM router.

Each function:
    - Accepts a plain prompt string + generation parameters.
    - Returns the raw response text string on success.
    - Raises TransientLLMError for 429 / timeouts / connection issues.
    - Raises PermanentLLMError for 400 / 401 / 403 / 404 / bad model.

No retry logic lives here — retries are handled by the router.
These functions make exactly ONE attempt per call.
"""

from __future__ import annotations

import logging
import os

import httpx
from google import genai
from google.genai import types
from groq import Groq

from utils.llm.exceptions import PermanentLLMError, TransientLLMError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword sets used to classify raw exception text
# ---------------------------------------------------------------------------

_TRANSIENT_KEYWORDS: frozenset[str] = frozenset(
    ["429", "rate limit", "resource_exhausted", "quota", "timeout",
     "timed out", "connection", "temporarily", "server error", "503", "502", "504"]
)

_PERMANENT_KEYWORDS: frozenset[str] = frozenset(
    ["400", "401", "403", "404", "not found", "not_found",
     "invalid api key", "invalid_api_key", "api_key_invalid",
     "permission denied", "forbidden", "bad request",
     "model not found", "no such model", "invalid model"]
)


def _classify_exception(exc: Exception, provider: str, model: str) -> LLMError:
    """Map a raw provider exception to TransientLLMError or PermanentLLMError."""
    from utils.llm.exceptions import LLMError  # avoid circular at top
    err = str(exc).lower()

    if any(k in err for k in _PERMANENT_KEYWORDS):
        return PermanentLLMError(
            f"{provider} permanent error: {exc}", provider=provider, model=model
        )
    if any(k in err for k in _TRANSIENT_KEYWORDS):
        return TransientLLMError(
            f"{provider} transient error: {exc}", provider=provider, model=model
        )
    # Unknown — treat as transient so we don't silently drop requests
    return TransientLLMError(
        f"{provider} unknown error (treated as transient): {exc}",
        provider=provider,
        model=model,
    )


# ---------------------------------------------------------------------------
# Lazy client initialisation (avoids import-time crashes when a key is absent)
# ---------------------------------------------------------------------------

_gemini_client: genai.Client | None = None
_groq_client: Groq | None = None


def _get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise PermanentLLMError(
                "GEMINI_API_KEY is not set", provider="gemini", model=""
            )
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise PermanentLLMError(
                "GROQ_API_KEY is not set", provider="groq", model=""
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------

_GEMINI_SYSTEM_PROMPT = "You are an expert resume analyzer and career advisor."


def call_gemini(
    prompt: str,
    model: str,
    temperature: float = 0.2,
    max_tokens: int = 1500,
) -> str:
    """
    Make a single Gemini generate_content request.

    Raises:
        PermanentLLMError: for 400/401/403/404 and missing API key.
        TransientLLMError: for 429/timeout/connection issues.
    """
    client = _get_gemini_client()  # raises PermanentLLMError if key missing
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_GEMINI_SYSTEM_PROMPT,
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        text = response.text
        if not text or not text.strip():
            raise TransientLLMError(
                "Gemini returned empty response", provider="gemini", model=model
            )
        return text

    except (PermanentLLMError, TransientLLMError):
        raise
    except Exception as exc:
        raise _classify_exception(exc, "gemini", model) from exc


# ---------------------------------------------------------------------------
# Groq
# ---------------------------------------------------------------------------

_GROQ_SYSTEM_PROMPT = "You are an expert resume analyzer and career advisor."


def call_groq(
    prompt: str,
    model: str,
    temperature: float = 0.2,
    max_tokens: int = 1500,
) -> str:
    """
    Make a single Groq chat completion request.

    Raises:
        PermanentLLMError: for 400/401/403/404 and missing API key.
        TransientLLMError: for 429/timeout/connection issues.
    """
    client = _get_groq_client()  # raises PermanentLLMError if key missing
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _GROQ_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        text = response.choices[0].message.content
        if not text or not text.strip():
            raise TransientLLMError(
                "Groq returned empty response", provider="groq", model=model
            )
        return text

    except (PermanentLLMError, TransientLLMError):
        raise
    except Exception as exc:
        raise _classify_exception(exc, "groq", model) from exc


# ---------------------------------------------------------------------------
# OpenRouter (REST via httpx)
# ---------------------------------------------------------------------------

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
_OPENROUTER_SYSTEM_PROMPT = "You are an expert resume analyzer and career advisor."


def call_openrouter(
    prompt: str,
    model: str,
    temperature: float = 0.2,
    max_tokens: int = 1500,
) -> str:
    """
    Make a single OpenRouter chat completion request via httpx (synchronous).

    Raises:
        PermanentLLMError: for 400/401/403/404 and missing API key.
        TransientLLMError: for 429/timeout/connection issues.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise PermanentLLMError(
            "OPENROUTER_API_KEY is not set", provider="openrouter", model=model
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://careerlens.app",
        "X-Title": "CareerLens",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _OPENROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(_OPENROUTER_BASE_URL, json=payload, headers=headers)

        # Classify HTTP status before trying to parse body
        if resp.status_code in (400, 401, 403, 404):
            raise PermanentLLMError(
                f"OpenRouter HTTP {resp.status_code}: {resp.text}",
                provider="openrouter",
                model=model,
            )
        if resp.status_code == 429 or resp.status_code >= 500:
            raise TransientLLMError(
                f"OpenRouter HTTP {resp.status_code}: {resp.text}",
                provider="openrouter",
                model=model,
            )

        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        if not text or not text.strip():
            raise TransientLLMError(
                "OpenRouter returned empty response",
                provider="openrouter",
                model=model,
            )
        return text

    except (PermanentLLMError, TransientLLMError):
        raise
    except httpx.TimeoutException as exc:
        raise TransientLLMError(
            f"OpenRouter request timed out: {exc}", provider="openrouter", model=model
        ) from exc
    except httpx.ConnectError as exc:
        raise TransientLLMError(
            f"OpenRouter connection error: {exc}", provider="openrouter", model=model
        ) from exc
    except Exception as exc:
        raise _classify_exception(exc, "openrouter", model) from exc


# ---------------------------------------------------------------------------
# Dispatch table — used by the router
# ---------------------------------------------------------------------------

PROVIDER_CALLERS: dict[str, callable] = {
    "gemini": call_gemini,
    "groq": call_groq,
    "openrouter": call_openrouter,
}
