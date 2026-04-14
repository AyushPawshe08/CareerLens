import os
from dotenv import load_dotenv
from groq import Groq


load_dotenv()


GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment variables")


client = Groq(api_key=GROQ_API_KEY)


def call_llm(prompt: str,
             model: str = "llama-3.3-70b-versatile",
             temperature: float = 0.2,
             max_tokens: int = 1500):
    """
    Generic LLM caller function.

    Args:
        prompt (str): Input prompt
        model (str): Groq model name
        temperature (float): Creativity level
        max_tokens (int): Max tokens to generate

    Returns:
        str: LLM response text
    """

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert resume analyzer and career advisor."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )

        return response.choices[0].message.content

    except Exception as e:
        raise RuntimeError(f"LLM call failed: {e}") from e
