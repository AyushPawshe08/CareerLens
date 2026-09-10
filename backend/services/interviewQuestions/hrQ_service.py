"""
HR interview question generator.

Focuses on:
  - Career goals and long-term vision
  - Motivation for applying to this specific role/company
  - Culture fit and values alignment
  - Salary expectations and work preferences

Returns a list of 5-8 HR interview questions.
"""

import logging

from utils.llm import llm_router
from utils.llm.token_optimizer import optimize_resume_text, optimize_job_description
from services.analysis._llm_utils import clamp_list

logger = logging.getLogger(__name__)


def generate_hr_questions_llm(
    job_description: str,
    resume_text: str,
) -> list[str]:
    """
    Calls the LLM router and returns 5–8 HR interview questions.

    Uses Groq as the primary provider with Gemini + OpenRouter fallback.

    Args:
        job_description: Full JD text (used to align culture/goals questions).
        resume_text:     Candidate's resume or self-description.

    Returns:
        List of 5–8 HR question strings.

    Raises:
        RuntimeError: If all LLM providers fail.
    """
    trimmed_resume = optimize_resume_text("interview_questions", resume_text)
    trimmed_jd = optimize_job_description("interview_questions", job_description)

    prompt = f"""
You are a seasoned HR recruiter conducting an initial screening interview.

Use the information below to generate exactly 5 to 8 HR interview questions.

Rules:
- Questions should be open-ended and conversational, not technical.
- Cover these themes across your questions (do not repeat the same theme twice):
    1. Career goals and where the candidate sees themselves in 3-5 years
    2. Why they are interested in this specific role or company
    3. Core values and what kind of work culture they thrive in
    4. Motivation and what drives their professional growth
    5. Salary expectations or work arrangement preferences (remote/hybrid/office)
    6. Reason for leaving or seeking a new opportunity
- Tailor the questions to the seniority and role implied by the job description.
- Avoid yes/no questions — all must require a thoughtful, elaborated answer.
- Return ONLY valid JSON with a single key: "hr_questions" containing an array of 5 to 8 question strings.
- Do NOT include any explanations, markdown, or extra text outside the JSON.

Job Description:
{trimmed_jd}

Candidate Background:
{trimmed_resume}
""".strip()

    data = llm_router.generate_json(
        task="interview_questions",
        prompt=prompt,
        temperature=0.4,
        max_tokens=1200,
    )

    questions = clamp_list(data.get("hr_questions", []), 5, 8)

    if len(questions) < 5:
        logger.warning(
            "HR LLM returned only %d questions (expected 5–8). "
            "Padding with fallback questions.",
            len(questions),
        )
        fallback = [
            "Tell me about yourself and your professional journey so far.",
            "Why are you interested in this particular role and company?",
            "Where do you see yourself professionally in the next three to five years?",
            "What kind of work environment do you feel you do your best work in?",
            "What are your salary expectations for this position?",
        ]
        for q in fallback:
            if len(questions) >= 5:
                break
            if q not in questions:
                questions.append(q)

    logger.info("HR questions generated: %d questions", len(questions))
    return questions
