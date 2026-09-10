from utils.llm import llm_router
from utils.llm.token_optimizer import optimize_resume_text
from services.analysis._llm_utils import clamp_list


def get_perfect_job_roles(resume_text: str) -> list[str]:
    # Only skills + experience + education needed for role matching
    trimmed_resume = optimize_resume_text("perfect_job_roles", resume_text)

    prompt = f"""
Based on the resume, suggest ideal job roles.
Return ONLY valid JSON with key:
- perfect_job_roles: array of 6 to 8 roles

Resume / Self Description:
{trimmed_resume}
""".strip()

    data = llm_router.generate_json(
        task="perfect_job_roles",
        prompt=prompt,
        temperature=0.3,
        max_tokens=400,
    )

    return clamp_list(data.get("perfect_job_roles", []), 6, 8)
