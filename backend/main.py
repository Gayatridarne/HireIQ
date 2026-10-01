from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import jobs, candidates, auth, interview, shortlist, email_router
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HireIQ")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])
app.include_router(shortlist.router, prefix="/shortlist", tags=["shortlist"])
app.include_router(email_router.router, prefix="/email", tags=["email"])

@app.get("/")
def root():
    return {"message": "HireIQ API"}
