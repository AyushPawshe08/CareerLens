import json
from typing import Any, Dict


def extract_json(text: str) -> Dict[str, Any]:
    if not text:
        raise ValueError("LLM returned empty response.")

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM response does not contain JSON object.")

    candidate = text[start : end + 1]
    return json.loads(candidate)


def clamp_list(items: Any, min_items: int, max_items: int) -> list[str]:
    if not isinstance(items, list):
        return []

    cleaned = [str(item).strip() for item in items if str(item).strip()]
    if len(cleaned) > max_items:
        return cleaned[:max_items]

    return cleaned
