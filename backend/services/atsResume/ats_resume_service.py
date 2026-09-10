"""
LLM service for the ATS Resume Rewriter module.
Returns a fully rewritten ATS-optimized plain-text resume.
Output is plain text — NOT JSON.
"""

import logging
from utils.llm import llm_router

logger = logging.getLogger(__name__)


def generate_ats_resume_llm(
    job_description: str,
    resume_text: str,
    missing_skills: list[str],
) -> str:
    """
    Calls the LLM and returns an ATS-optimized plain-text resume.

    Uses OpenRouter (Qwen) as the primary provider — excellent at long-form
    document rewriting. Falls back to Gemini then Groq automatically.

    Note: ats_resume sends the FULL resume (no token optimization applied)
    because accurate document rewriting requires the complete original text.

    Args:
        job_description: Full job description text.
        resume_text:     User's original resume text / self description.
        missing_skills:  Skill gaps identified by the analysis.

    Returns:
        Plain-text ATS resume string (no JSON, no markdown, no commentary).

    Raises:
        RuntimeError: If all LLM providers fail.
    """
    missing_str = ", ".join(missing_skills) if missing_skills else "None"

    prompt = f"""ATS resume writer. Rewrite the resume to match the JD.

Rules:
- Sections in order: NAME → PROFESSIONAL SUMMARY → SKILLS → EXPERIENCE → PROJECTS → EDUCATION
- Section titles UPPERCASE, bullets start with "- " + action verb, 1-2 lines each
- Integrate missing skills naturally only where factually accurate
- Mirror JD keywords exactly. Never fabricate experience or achievements.
- Plain text only. No markdown, tables, JSON, or commentary.
- Start output immediately with candidate's name. Nothing before or after.

JD: {job_description}
Resume: {resume_text}
Missing skills to integrate: {missing_str}""".strip()

    # ATS resume is plain text — use generate() not generate_json()
    response = llm_router.generate(
        task="ats_resume",
        prompt=prompt,
        temperature=0.3,
        max_tokens=2500,
    )

    if not response or not response.strip():
        raise RuntimeError("LLM returned an empty response for ATS resume generation.")

    rewritten = response.strip()
    logger.info("ATS resume generated successfully (%d characters).", len(rewritten))
    return rewritten