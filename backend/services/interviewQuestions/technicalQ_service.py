"""
Technical interview question generator.

Builds a focused prompt using:
  - job_description  → what skills/tech the role demands
  - matched_skills   → what the candidate already knows (probe deeper)
  - missing_skills   → gaps to expose (validate awareness / learning intent)

Returns a list of 5-8 technical interview questions.
"""

import logging

from utils.callLLM import call_llm
from services.analysis._llm_utils import extract_json, clamp_list

logger = logging.getLogger(__name__)


def generate_technical_questions_llm(
    job_description: str,
    matched_skills: list[str],
    missing_skills: list[str],
) -> list[str]:
    """
    Calls Groq LLM and returns 5–8 technical interview questions.

    Args:
        job_description: Full JD text.
        matched_skills:  Skills the candidate already has.
        missing_skills:  Skills the candidate is missing.

    Returns:
        List of 5–8 technical question strings.

    Raises:
        RuntimeError: If LLM call or JSON parsing fails.
    """
    matched_str = ", ".join(matched_skills) if matched_skills else "Not provided"
    missing_str = ", ".join(missing_skills) if missing_skills else "Not provided"

    prompt = f"""
You are a senior technical interviewer preparing questions for a job candidate.

Use the information below to generate exactly 5 to 8 technical interview questions.

Rules:
- Questions must directly test the candidate's knowledge of the technologies, frameworks, and concepts in the job description.
- Include at least 2 questions that probe depth on the candidate's MATCHED SKILLS (things they claim to know).
- Include at least 2 questions that test awareness of MISSING SKILLS (gaps vs the role).
- Questions should be specific, not generic (e.g. "Explain how React's reconciliation algorithm works" not "Tell me about React").
- Return ONLY valid JSON with a single key: "technical_questions" containing an array of 5 to 8 question strings.
- Do NOT include any explanations, markdown, or extra text outside the JSON.

Job Description:
{job_description}

Candidate's Matched Skills (they already have these):
{matched_str}

Candidate's Missing Skills (gaps vs the role):
{missing_str}
""".strip()

    response = call_llm(prompt, temperature=0.3, max_tokens=1200)
    data = extract_json(response)

    questions = clamp_list(data.get("technical_questions", []), 5, 8)

    if len(questions) < 5:
        logger.warning(
            "Technical LLM returned only %d questions (expected 5–8). "
            "Padding with fallback questions.",
            len(questions),
        )
        fallback = [
            "Walk me through a challenging technical problem you solved recently.",
            "How do you stay current with new technologies relevant to this role?",
            "Describe your approach to debugging a production issue.",
            "How do you ensure code quality in your projects?",
            "Explain the trade-offs you consider when choosing a technology or library.",
        ]
        for q in fallback:
            if len(questions) >= 5:
                break
            if q not in questions:
                questions.append(q)

    logger.info("Technical questions generated: %d questions", len(questions))
    return questions
