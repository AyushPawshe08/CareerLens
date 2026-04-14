from utils.callLLM import call_llm

from ._llm_utils import extract_json


def get_resume_score(job_description: str, resume_text: str) -> int:
    prompt = f"""
Score how well the resume matches the job description on a 0-100 scale.
Return ONLY valid JSON with key:
- resume_score: integer between 0 and 100

Job Description:
{job_description}

Resume / Self Description:
{resume_text}
""".strip()

    response = call_llm(prompt)
    data = extract_json(response)

    score = data.get("resume_score", 0)
    try:
        score_int = int(score)
    except Exception:
        return 0

    if score_int < 0:
        return 0
    if score_int > 100:
        return 100
    return score_int
