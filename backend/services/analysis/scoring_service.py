from utils.llm import llm_router
from utils.llm.token_optimizer import optimize_resume_text, optimize_job_description


def get_resume_score(job_description: str, resume_text: str) -> int:
    # Full skills + experience needed for scoring
    trimmed_resume = optimize_resume_text("resume_score", resume_text)
    trimmed_jd = optimize_job_description("resume_score", job_description)

    prompt = f"""Recruiter scoring resume vs JD. Return ONLY JSON:
{{"resume_score": <0-100>, "dimension_scores": {{"skills": <0-40>, "experience": <0-30>, "domain": <0-20>, "seniority": <0-10>}}, "matched_skills": ["skill"], "missing_required": ["skill"], "one_line_reason": "<10 words"}}
Rules: skills=40pts, experience=30pts, domain=20pts, seniority=10pts. -8pts per missing required skill (max -24). Evidence of skill counts as present.

JD: {trimmed_jd}
Resume: {trimmed_resume}""".strip()

    data = llm_router.generate_json(
        task="resume_score",
        prompt=prompt,
        temperature=0.2,
        max_tokens=600,
    )

    score = data.get("resume_score", 0)
    try:
        score_int = int(score)
    except Exception:
        return 0

    return max(0, min(100, score_int))