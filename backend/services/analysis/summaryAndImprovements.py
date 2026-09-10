from utils.llm import llm_router
from utils.llm.token_optimizer import optimize_resume_text, optimize_job_description
from services.analysis._llm_utils import extract_json


def get_summary_and_suggestions(job_description: str, resume_text: str) -> dict:
    # Apply token optimization — only experience/skills/projects needed for summary
    trimmed_resume = optimize_resume_text("summary_and_suggestions", resume_text)
    trimmed_jd = optimize_job_description("summary_and_suggestions", job_description)

    prompt = f"""Senior recruiter. Analyze resume vs JD. Return ONLY JSON:
{{"summary": "2-3 sentences: fit verdict, top strength, critical gap. No filler.", "suggestions": [{{"action": "verb", "text": "JD-specific fix, <20 words", "impact": "high|medium|low"}}]}}
Rules: exactly 6 suggestions, ordered by impact, each starts with Add/Quantify/Remove/Reframe/Highlight/Move. No generic advice.

JD: {trimmed_jd}
Resume: {trimmed_resume}""".strip()

    data = llm_router.generate_json(
        task="summary_and_suggestions",
        prompt=prompt,
        temperature=0.2,
        max_tokens=1500,
    )

    summary = str(data.get("summary", "")).strip()
    suggestions = [
        s for s in data.get("suggestions", [])
        if isinstance(s, dict) and s.get("text")
    ][:6]

    return {
        "summary": summary,
        "suggestions": suggestions,
    }