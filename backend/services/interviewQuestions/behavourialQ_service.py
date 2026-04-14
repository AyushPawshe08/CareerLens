"""
Behavioural interview question generator.

Focuses on:
  - Teamwork and collaboration
  - Leadership and ownership
  - Conflict resolution
  - Real-world STAR-format situations

Returns a list of 5-8 behavioural interview questions.
"""

import logging

from utils.callLLM import call_llm
from services.analysis._llm_utils import extract_json, clamp_list

logger = logging.getLogger(__name__)


def generate_behavioural_questions_llm(
    job_description: str,
    resume_text: str,
) -> list[str]:
    """
    Calls Groq LLM and returns 5–8 behavioural interview questions.

    Args:
        job_description: Full JD text (used to tailor team/leadership context).
        resume_text:     Candidate's resume or self-description.

    Returns:
        List of 5–8 behavioural question strings.

    Raises:
        RuntimeError: If LLM call or JSON parsing fails.
    """
    prompt = f"""
You are an experienced HR interviewer assessing a candidate's soft skills and work style.

Use the information below to generate exactly 5 to 8 behavioural interview questions.

Rules:
- Questions must use the STAR format framing (Situation, Task, Action, Result) — e.g. "Tell me about a time when..."
- Cover these themes across your questions (do not repeat the same theme twice):
    1. Teamwork and cross-functional collaboration
    2. Leadership or taking ownership without being asked
    3. Handling conflict or disagreement with a colleague or manager
    4. Dealing with failure, setbacks, or a project that did not go as planned
    5. Working under pressure or tight deadlines
    6. Adapting to change or ambiguity
- Tailor the questions to the seniority and domain implied by the job description.
- Return ONLY valid JSON with a single key: "behavioural_questions" containing an array of 5 to 8 question strings.
- Do NOT include any explanations, markdown, or extra text outside the JSON.

Job Description:
{job_description}

Candidate Background:
{resume_text}
""".strip()

    response = call_llm(prompt, temperature=0.4, max_tokens=1200)
    data = extract_json(response)

    questions = clamp_list(data.get("behavioural_questions", []), 5, 8)

    if len(questions) < 5:
        logger.warning(
            "Behavioural LLM returned only %d questions (expected 5–8). "
            "Padding with fallback questions.",
            len(questions),
        )
        fallback = [
            "Tell me about a time you had to collaborate with a difficult team member. How did you handle it?",
            "Describe a situation where you took ownership of a problem that was not officially yours to solve.",
            "Give me an example of a time you failed to meet a deadline. What happened and what did you learn?",
            "Tell me about a time you disagreed with your manager's decision. How did you handle it?",
            "Describe a situation where you had to adapt quickly to a major change at work.",
        ]
        for q in fallback:
            if len(questions) >= 5:
                break
            if q not in questions:
                questions.append(q)

    logger.info("Behavioural questions generated: %d questions", len(questions))
    return questions
