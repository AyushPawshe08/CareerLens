from utils.callLLM import call_llm

from ._llm_utils import extract_json, clamp_list


def get_summary_and_suggestions(job_description: str, resume_text: str) -> dict:
    prompt = f"""
You will analyze a resume against a job description.
Return ONLY valid JSON with keys:
- summary: string
- suggestions: array of 6 to 8 concise improvement suggestions

Job Description:
{job_description}

Resume / Self Description:
{resume_text}
""".strip()

    response = call_llm(prompt)
    data = extract_json(response)

    summary = str(data.get("summary", "")).strip()
    suggestions = clamp_list(data.get("suggestions", []), 6, 8)

    return {
        "summary": summary,
        "suggestions": suggestions,
    }
