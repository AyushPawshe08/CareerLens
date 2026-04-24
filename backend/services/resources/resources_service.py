"""
LLM service for the Resources module.

Calls the LLM once with ALL missing skills in a single prompt,
returning a structured list of ResourceItem dicts — one per skill.

Design decision: batch all skills in one request to reduce latency
and API calls vs. one request per skill.
"""

import json
import logging

from utils.callLLM import call_llm
from services.analysis._llm_utils import extract_json

logger = logging.getLogger(__name__)

# Fallback resources used when the LLM returns empty/invalid data for a skill
_FALLBACK_RESOURCE = {
    "videos": [
        "Search on YouTube: '<skill> tutorial for beginners'",
        "Search on YouTube: '<skill> crash course'",
    ],
    "documentation": [
        "https://devdocs.io",
        "https://developer.mozilla.org",
    ],
    "practice": [
        "https://www.freecodecamp.org",
        "https://www.codecademy.com",
    ],
    "roadmap": "https://roadmap.sh",
}


def generate_resources_llm(missing_skills: list[str]) -> list[dict]:
    """
    Calls the LLM and returns a list of resource dicts — one per skill.

    Each dict shape:
        {
            "skill":         str,
            "videos":        list[str],   # 2 items
            "documentation": list[str],   # 2 items
            "practice":      list[str],   # 2 items
            "roadmap":       str | None
        }

    Falls back gracefully per skill if LLM data is incomplete.

    Args:
        missing_skills: List of skill strings from the resume analysis.

    Returns:
        List of resource dicts.

    Raises:
        RuntimeError: If the LLM call fails completely.
    """
    if not missing_skills:
        return []

    skills_str = "\n".join(f"- {s}" for s in missing_skills)

    prompt = f"""
You are an expert technical mentor and career advisor.

Generate high-quality learning resources for EACH of the following missing skills.

Missing Skills:
{skills_str}

Rules:
- Resources must be beginner to intermediate friendly.
- Prefer official documentation over third-party blogs.
- Prefer widely trusted platforms (YouTube, official docs, freeCodeCamp, Codecademy, roadmap.sh, etc.).
- Do NOT include duplicate platforms across a single skill's resources.
- Keep resource names concise.
- Do NOT include explanations or markdown outside the JSON.
- Return ONLY valid JSON in exactly this format:

{{
  "resources": [
    {{
      "skill": "Docker",
      "videos": [
        "Docker Crash Course for Beginners - freeCodeCamp",
        "Docker Tutorial for Beginners - TechWorld with Nana"
      ],
      "documentation": [
        "https://docs.docker.com/get-started/",
        "https://docker-curriculum.com"
      ],
      "practice": [
        "https://labs.play-with-docker.com",
        "https://www.katacoda.com/courses/docker"
      ],
      "roadmap": "https://roadmap.sh/devops"
    }}
  ]
}}

Generate a resource object for EVERY skill listed above. Do not skip any.
""".strip()

    response = call_llm(prompt, temperature=0.2, max_tokens=3000)
    data = extract_json(response)

    raw_resources: list = data.get("resources", [])

    # Validate and clean each resource item
    result = []
    for item in raw_resources:
        if not isinstance(item, dict):
            continue

        skill = str(item.get("skill", "")).strip()
        if not skill:
            continue

        videos   = _clean_list(item.get("videos", []),        2)
        docs     = _clean_list(item.get("documentation", []), 2)
        practice = _clean_list(item.get("practice", []),      2)
        roadmap  = item.get("roadmap") or None
        if isinstance(roadmap, str):
            roadmap = roadmap.strip() or None

        result.append({
            "skill":         skill,
            "videos":        videos,
            "documentation": docs,
            "practice":      practice,
            "roadmap":       roadmap,
        })

    # Ensure every requested skill has a result (fallback if LLM skipped it)
    returned_skills = {r["skill"].lower() for r in result}
    for skill in missing_skills:
        if skill.lower() not in returned_skills:
            logger.warning("LLM skipped skill '%s' — using fallback resources.", skill)
            fallback = {
                k: [v.replace("<skill>", skill) for v in vals] if isinstance(vals, list) else vals
                for k, vals in _FALLBACK_RESOURCE.items()
            }
            result.append({"skill": skill, **fallback})

    logger.info("Resources generated for %d skills.", len(result))
    return result


def _clean_list(items: object, max_items: int) -> list[str]:
    """Coerce to list[str], strip blanks, cap at max_items."""
    if not isinstance(items, list):
        return []
    cleaned = [str(i).strip() for i in items if str(i).strip()]
    return cleaned[:max_items]
