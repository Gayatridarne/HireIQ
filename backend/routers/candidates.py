from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth_utils import get_current_user
from services.resume_parser import extract_text_from_file
from services.ai_scorer import score_candidate, extract_candidate_info
import models, schemas, os, shutil, csv, io

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def process_resume(candidate_id: int, file_path: str, job_description: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
        if not candidate:
            return
        raw_text = extract_text_from_file(file_path)
        if not raw_text.strip():
            candidate.status = "failed"
            db.commit()
            return
        candidate.raw_text = raw_text
        info = extract_candidate_info(raw_text)
        candidate.name = info.get("name", "Unknown")
        candidate.email = info.get("email")
        db.commit()
        result = score_candidate(raw_text, job_description)
        score = models.Score(
            candidate_id=candidate.id,
            score=result.get("score", 0),
            matched_skills=result.get("matched_skills", []),
            missing_skills=result.get("missing_skills", []),
            summary=result.get("summary", ""),
            recommendation=result.get("recommendation", "No")
        )
        db.add(score)
        candidate.status = "done"
        db.commit()
    except Exception as e:
        print(f"Processing error: {e}")
        candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
        if candidate:
            candidate.status = "failed"
            db.commit()
    finally:
        db.close()

@router.post("/jobs/{job_id}/upload")
async def upload_resumes(
    job_id: int,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    uploaded = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf", ".docx", ".jpg", ".jpeg", ".png"]:
            continue
        save_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        candidate = models.Candidate(file_name=file.filename, job_id=job_id, status="processing")
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        background_tasks.add_task(process_resume, candidate.id, save_path, job.description)
        uploaded.append({"id": candidate.id, "file_name": file.filename, "status": "processing"})
    return {"message": f"{len(uploaded)} resumes uploaded", "candidates": uploaded}

@router.get("/jobs/{job_id}/candidates", response_model=List[schemas.CandidateOut])
def get_candidates(job_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = (
        db.query(models.Candidate)
        .filter(models.Candidate.job_id == job_id)
        .all()
    )
    candidates.sort(key=lambda c: (c.score.score if c.score else 0), reverse=True)
    return candidates

@router.get("/{candidate_id}", response_model=schemas.CandidateOut)
def get_candidate(candidate_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(candidate)
    db.commit()
    return {"message": "Candidate deleted"}

@router.get("/jobs/{job_id}/export")
def export_csv(job_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = db.query(models.Candidate).filter(models.Candidate.job_id == job_id).all()
    candidates.sort(key=lambda c: (c.score.score if c.score else 0), reverse=True)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Email", "Score", "Recommendation", "Matched Skills", "Missing Skills", "Summary"])
    for i, c in enumerate(candidates, 1):
        s = c.score
        writer.writerow([
            i, c.name or "Unknown", c.email or "",
            s.score if s else "", s.recommendation if s else "",
            ", ".join(s.matched_skills) if s else "",
            ", ".join(s.missing_skills) if s else "",
            s.summary if s else ""
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=candidates_job_{job_id}.csv"}
    )
