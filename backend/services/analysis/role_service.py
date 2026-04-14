from utils.callLLM import call_llm

from ._llm_utils import extract_json, clamp_list


def get_perfect_job_roles(resume_text: str) -> list[str]:
    prompt = f"""
Based on the resume, suggest ideal job roles.
Return ONLY valid JSON with key:
- perfect_job_roles: array of 6 to 8 roles

Resume / Self Description:
{resume_text}
""".strip()

    response = call_llm(prompt)
    data = extract_json(response)

    return clamp_list(data.get("perfect_job_roles", []), 6, 8)
