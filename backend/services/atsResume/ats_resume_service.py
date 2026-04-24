"""
LLM service for the ATS Resume Rewriter module.

Sends the user's original resume, job description, and missing skills
to the LLM and receives a fully rewritten ATS-optimized plain-text resume.

Output is plain text — NOT JSON.
"""

import logging

from utils.callLLM import call_llm

logger = logging.getLogger(__name__)


def generate_ats_resume_llm(
    job_description: str,
    resume_text: str,
    missing_skills: list[str],
) -> str:
    """
    Calls the LLM and returns an ATS-optimized plain-text resume.

    Args:
        job_description: Full job description text.
        resume_text:     User's original resume text / self description.
        missing_skills:  Skill gaps identified by the analysis.

    Returns:
        Plain-text ATS resume string (no JSON, no markdown, no commentary).

    Raises:
        RuntimeError: If LLM returns an empty response.
    """
    missing_str = (
        ", ".join(missing_skills) if missing_skills else "None identified"
    )

    prompt = f"""
You are an expert ATS Resume Writer.

Rewrite the user's resume into a highly structured, ATS-optimized resume
aligned with the given job description.

STRICT RULES:
1. Maintain consistent alignment across sections.
2. Use bullet points starting with strong action verbs.
3. Keep bullet points concise (1-2 lines each).
4. Integrate the missing skills naturally where factually appropriate.
5. Optimize the resume using keywords from the job description.
6. Preserve factual accuracy — do NOT fabricate experiences or achievements.
7. Do NOT use tables, graphics, or special characters.
8. Use plain text ATS-friendly structure only.
9. Sections must appear in this exact order:
   NAME → PROFESSIONAL SUMMARY → SKILLS → EXPERIENCE → PROJECTS → EDUCATION

FORMATTING RULES:
- Section titles must be UPPERCASE.
- Use dash bullet points: "- "
- No excessive blank lines between bullets.
- Consistent indentation throughout.
- No markdown, no JSON, no commentary.

INPUT DATA:

JOB DESCRIPTION:
{job_description}

ORIGINAL RESUME:
{resume_text}

MISSING SKILLS TO INTEGRATE (where factually appropriate):
{missing_str}

OUTPUT RULES:
- Return ONLY the rewritten resume text.
- Do NOT return JSON.
- Do NOT add commentary, headers, or explanations before or after the resume.
- Begin immediately with the candidate's name.
""".strip()

    response = call_llm(prompt, temperature=0.3, max_tokens=2500)

    if not response or not response.strip():
        raise RuntimeError("LLM returned an empty response for ATS resume generation.")

    rewritten = response.strip()
    logger.info(
        "ATS resume generated successfully (%d characters).", len(rewritten)
    )
    return rewritten
