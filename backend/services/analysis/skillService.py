from utils.llm import llm_router
from utils.llm.token_optimizer import optimize_resume_text, optimize_job_description


def get_missing_and_matched_skills(job_description: str, resume_text: str) -> dict:
    # Only skills + brief experience needed — apply aggressive trimming
    trimmed_resume = optimize_resume_text("missing_skills", resume_text)
    trimmed_jd = optimize_job_description("missing_skills", job_description)

    prompt = f"""Recruiter doing skill gap analysis. Analyze the resume against the Job Description (JD).
Return ONLY a valid JSON object with the following structure:
{{
  "missing_skills": ["skill1", "skill2"],
  "matched_skills": ["skill3", "skill4"]
}}

Rules:
- "missing_skills" are skills required by the JD that are not present or evidenced in the resume.
- "matched_skills" are skills required by the JD that are present in the resume.
- Limit each list to a maximum of 8 skills.
- Do NOT include any explanations or markdown outside the JSON.

JD: {trimmed_jd}
Resume: {trimmed_resume}""".strip()

    data = llm_router.generate_json(
        task="missing_skills",
        prompt=prompt,
        temperature=0.2,
        max_tokens=800,
    )

    missing = [str(s).strip() for s in data.get("missing_skills", []) if str(s).strip()][:8]
    matched = [str(s).strip() for s in data.get("matched_skills", []) if str(s).strip()][:8]

    return {
        "missing_skills": missing,
        "matched_skills": matched,
    }


def get_missing_skills(job_description: str, resume_text: str) -> dict:
    # Retained for backwards compatibility if needed elsewhere
    res = get_missing_and_matched_skills(job_description, resume_text)
    return {
        "missing_skills": res["missing_skills"],
        "matched_skills": res["matched_skills"],
        "gap_severity": "medium",
        "one_line_verdict": "",
    }