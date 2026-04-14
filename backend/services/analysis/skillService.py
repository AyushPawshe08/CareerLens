from utils.callLLM import call_llm

from ._llm_utils import extract_json, clamp_list


def get_missing_and_matched_skills(job_description: str, resume_text: str) -> dict:
    prompt = f"""
Compare the resume with the job description.
Return ONLY valid JSON with keys:
- missing_skills: array of 6 to 8 skills the candidate lacks
- matched_skills: array of 6 to 8 skills the candidate already has

Job Description:
{job_description}

Resume / Self Description:
{resume_text}
""".strip()

    response = call_llm(prompt)
    data = extract_json(response)

    missing = clamp_list(data.get("missing_skills", []), 6, 8)
    matched = clamp_list(data.get("matched_skills", []), 6, 8)

    return {
        "missing_skills": missing,
        "matched_skills": matched,
    }
