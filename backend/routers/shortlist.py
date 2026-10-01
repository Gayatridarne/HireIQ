from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
import models

router = APIRouter()

@router.post("/candidates/{candidate_id}/shortlist")
def toggle_shortlist(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.is_shortlisted = not candidate.is_shortlisted
    db.commit()
    return {"is_shortlisted": candidate.is_shortlisted}

@router.get("/jobs/{job_id}/shortlisted")
def get_shortlisted(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidates = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id,
        models.Candidate.is_shortlisted == True
    ).all()
    return candidates
