from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
import models
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from pydantic import BaseModel
from groq import Groq
import json
import re

router = APIRouter()

api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=api_key) if api_key else None
MODEL_NAME = "openai/gpt-oss-120b"

class EmailRequest(BaseModel):
    candidate_id: int
    subject: str
    message: str

class BulkEmailRequest(BaseModel):
    job_id: int
    subject: str
    message: str

class AIEmailRequest(BaseModel):
    candidate_id: int
    email_type: str

class AIBulkEmailRequest(BaseModel):
    job_id: int
    email_type: str

def generate_ai_email(candidate, job, email_type: str) -> dict:
    if not groq_client:
        return {"subject": "Update on your application", "message": "Dear candidate, thank you for applying."}
    score = candidate.score
    matched = score.matched_skills if score else []
    missing = score.missing_skills if score else []
    summary = score.summary if score else ""
    prompt = f"""You are an expert HR professional. Write a highly personalized {email_type} email for a job candidate.
Candidate Name: {candidate.name or "Candidate"}
Applied for: {job.title}
AI Score: {score.score if score else "N/A"}/100
Matched Skills: {", ".join(matched) if matched else "None"}
Missing Skills: {", ".join(missing) if missing else "None"}
AI Assessment: {summary}
Write a professional warm personalized {"acceptance/shortlisting" if email_type == "acceptance" else "rejection"} email.
{"Mention their strong skills and express excitement about moving forward." if email_type == "acceptance" else "Be kind, mention areas they can improve, and encourage them to apply in future."}
Return ONLY valid JSON:
{{"subject": "email subject here", "message": "full email body here (use newline for new lines)"}}"""
    try:
        response = groq_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"AI email error: {e}")
        if email_type == "acceptance":
            return {"subject": f"Congratulations! Shortlisted for {job.title}", "message": f"Dear {candidate.name or 'Candidate'},\n\nWe are pleased to inform you that you have been shortlisted for {job.title}.\n\nPlease reply to confirm your availability.\n\nBest regards,\nHR Team"}
        else:
            return {"subject": f"Update on your application for {job.title}", "message": f"Dear {candidate.name or 'Candidate'},\n\nThank you for applying for {job.title}.\n\nAfter careful consideration, we will not be moving forward at this time. We encourage you to apply for future openings.\n\nBest regards,\nHR Team"}

@router.post("/generate-ai-email")
def generate_email_preview(req: AIEmailRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    email_content = generate_ai_email(candidate, job, req.email_type)
    return {"subject": email_content["subject"], "message": email_content["message"], "candidate_name": candidate.name, "candidate_email": candidate.email}

@router.post("/send-ai-email")
def send_ai_email(req: AIEmailRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.email:
        raise HTTPException(status_code=400, detail="Candidate email not found")
    job = db.query(models.Job).filter(models.Job.id == candidate.job_id).first()
    email_content = generate_ai_email(candidate, job, req.email_type)
    try:
        _send_mail(candidate.email, email_content["subject"], email_content["message"], current_user.email)
        return {"message": f"AI personalized email sent to {candidate.email}", "subject": email_content["subject"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send email: " + str(e))

@router.post("/send-ai-bulk")
def send_ai_bulk_email(req: AIBulkEmailRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    job = db.query(models.Job).filter(models.Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = db.query(models.Candidate).filter(models.Candidate.job_id == req.job_id, models.Candidate.is_shortlisted == True).all()
    if not candidates:
        raise HTTPException(status_code=400, detail="No shortlisted candidates found")
    sent = []
    failed = []
    for c in candidates:
        if c.email:
            try:
                email_content = generate_ai_email(c, job, req.email_type)
                _send_mail(c.email, email_content["subject"], email_content["message"], current_user.email)
                sent.append(c.email)
            except Exception as e:
                failed.append(c.email)
        else:
            failed.append((c.name or c.file_name) + " (no email)")
    return {"sent": sent, "failed": failed}

@router.post("/send")
def send_email(req: EmailRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.email:
        raise HTTPException(status_code=400, detail="Candidate email not found")
    try:
        _send_mail(candidate.email, req.subject, req.message, current_user.email)
        return {"message": "Email sent to " + candidate.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send email: " + str(e))

@router.post("/send-bulk")
def send_bulk_email(req: BulkEmailRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidates = db.query(models.Candidate).filter(models.Candidate.job_id == req.job_id, models.Candidate.is_shortlisted == True).all()
    if not candidates:
        raise HTTPException(status_code=400, detail="No shortlisted candidates found")
    sent = []
    failed = []
    for c in candidates:
        if c.email:
            try:
                _send_mail(c.email, req.subject, req.message, current_user.email)
                sent.append(c.email)
            except Exception as e:
                failed.append(c.email)
        else:
            failed.append(c.name or c.file_name + " (no email)")
    return {"sent": sent, "failed": failed}

def _send_mail(to_email: str, subject: str, message: str, from_email: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    if not smtp_user or not smtp_pass:
        raise Exception("SMTP credentials not configured")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #4f46e5; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">HireIQ</h2>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            {message.replace(chr(10), '<br>')}
            <br><br>
            <p style="color: #888; font-size: 0.85rem;">Sent via HireIQ from {from_email}</p>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html_body, "html"))
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())
