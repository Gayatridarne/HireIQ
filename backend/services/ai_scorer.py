import json
import os
import re
from groq import Groq

api_key_env = os.getenv("GROQ_API_KEY")
if not api_key_env:
    api_key_env = None
    client = None
else:
    client = Groq(api_key=api_key_env)

MODEL_NAME = "openai/gpt-oss-120b"


def score_candidate(resume_text: str, job_description: str) -> dict:
    prompt = f"""You are an expert technical recruiter. Carefully compare the resume below against the job description.

Return ONLY a valid JSON object with no extra text or markdown:
{{
  "score": <integer 0-100>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "experience_years": <integer>,
  "summary": "<2 sentence explanation of the score>",
  "recommendation": "<one of: Strong Yes, Yes, Maybe, No>"
}}

JOB DESCRIPTION:
{job_description}

RESUME:
{resume_text}
"""
    if not client:
        return _default_score()
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1000,
        )
        response_text = response.choices[0].message.content.strip()
        response_text = re.sub(r"```json|```", "", response_text).strip()
        return json.loads(response_text)
    except json.JSONDecodeError:
        return _default_score()
    except Exception as e:
        print(f"Groq API error: {e}")
        return _default_score()


def extract_candidate_info(resume_text: str) -> dict:
    prompt = f"""Extract candidate name and email from this resume text.
Return ONLY valid JSON:
{{"name": "<full name or Unknown>", "email": "<email or null>"}}

Resume:
{resume_text[:1000]}
"""
    if not client:
        return {"name": "Unknown", "email": None}
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=100,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"Groq API error: {e}")
        return {"name": "Unknown", "email": None}


def _default_score() -> dict:
    return {
        "score": 0,
        "matched_skills": [],
        "missing_skills": [],
        "experience_years": 0,
        "summary": "Could not analyze this resume.",
        "recommendation": "No"
    }