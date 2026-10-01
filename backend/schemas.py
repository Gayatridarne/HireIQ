from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    company_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class JobCreate(BaseModel):
    title: str
    description: str

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ScoreOut(BaseModel):
    score: float
    matched_skills: List[str]
    missing_skills: List[str]
    summary: str
    recommendation: str

    class Config:
        from_attributes = True

class CandidateOut(BaseModel):
    id: int
    name: Optional[str]
    email: Optional[str]
    file_name: str
    status: str
    created_at: datetime
    score: Optional[ScoreOut]

    class Config:
        from_attributes = True

class JobOut(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime
    candidates: List[CandidateOut] = []

    class Config:
        from_attributes = True

class JobListOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    candidate_count: int

    class Config:
        from_attributes = True
