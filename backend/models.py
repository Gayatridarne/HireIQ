from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    jobs = relationship("Job", back_populates="owner")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="jobs")
    candidates = relationship("Candidate", back_populates="job", cascade="all, delete")

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    file_name = Column(String)
    raw_text = Column(Text)
    status = Column(String, default="processing")
    is_shortlisted = Column(Boolean, default=False)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    job = relationship("Job", back_populates="candidates")
    score = relationship("Score", back_populates="candidate", uselist=False, cascade="all, delete")

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    score = Column(Float)
    matched_skills = Column(JSON)
    missing_skills = Column(JSON)
    summary = Column(Text)
    recommendation = Column(String)
    candidate = relationship("Candidate", back_populates="score")
