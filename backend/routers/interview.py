from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
import models
from groq import Groq
import os
import json
import re
router = APIRouter()
api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None
@router.get("/candidates/{candidate_id}/interview-questions")
def generate_interview_questions(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.raw_text:
        raise HTTPException(status_code=400, detail="No resume text found")
    if not client:
        raise HTTPException(status_code=500, detail="AI service not configured")
    score = candidate.score
    matched_skills = score.matched_skills if score else []
    missing_skills = score.missing_skills if score else []
    prompt = f"""You are an expert technical interviewer. Based on the candidate resume, generate 10 interview questions WITH detailed answers.
Candidate Name: {candidate.name or "Unknown"}
Matched Skills: {", ".join(matched_skills) if matched_skills else "Not available"}
Missing Skills: {", ".join(missing_skills) if missing_skills else "Not available"}
AI Score: {score.score if score else "Not scored"}
Resume:
{candidate.raw_text[:2000]}
Generate exactly 10 questions WITH answers in these categories:
- 3 Technical questions (based on matched skills)
- 2 Project/Experience questions (based on resume)
- 2 Problem-solving questions
- 2 Behavioral questions
- 1 Missing skills question
Return ONLY valid JSON, no extra text:
{{
  "candidate_name": "{candidate.name or "Candidate"}",
  "questions": [
    {{
      "category": "Technical",
      "question": "question text here",
      "answer": "detailed expected answer here",
      "why_asked": "brief reason why this question is relevant"
    }}
  ]
}}"""
    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000,
        )
        response_text = response.choices[0].message.content.strip()
        response_text = re.sub(r"```json|```", "", response_text).strip()
        return json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
