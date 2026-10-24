# HireIQ - AI-Powered Candidate Discovery Engine

A full-stack app that uses the Groq LLM to automatically score and rank resumes against a job description, turning hours of manual screening into seconds.

## Tech Stack

- **Frontend**: React, react-router-dom, axios, react-dropzone, recharts
- **Backend**: FastAPI, Python
- **AI**: Groq API (LLM)
- **Resume parsing**: pdfplumber, python-docx, pytesseract (OCR)
- **Database**: PostgreSQL + SQLAlchemy (SQLite also works for local development)
- **Auth**: JWT (python-jose + passlib)
- **Email**: Gmail SMTP
- **Deploy**: Docker Compose

## Features

- Upload multiple resumes at once (PDF / DOCX)
- Groq AI scores each resume 0-100 against the job description
- Auto-extracts candidate name, email, matched skills and missing skills
- Ranked candidate list with color-coded score rings
- Candidate match-details page with score breakdown, skills overlap and similar candidates
- Search and filter candidates by name or recommendation
- Candidate shortlisting
- AI-generated interview questions with expected answers
- AI-written accept / reject emails, sent through Gmail
- CSV export of ranked candidates (API endpoint)
- JWT authentication
- Background processing so uploads return instantly

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd HireIQ
```

### 2. Set environment variables

Create `backend/.env` (you can copy `backend/.env.example`) with:

```
DATABASE_URL=sqlite:///./hireiq.db
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=any_long_random_text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

`SMTP_*` is only needed if you want to send emails.
For PostgreSQL use `DATABASE_URL=postgresql://user:password@localhost:5432/candidate_db`.

Frontend (optional, defaults to http://localhost:8000):

```
REACT_APP_API_URL=http://localhost:8000
```

### 3. Run without Docker (local development)

**Backend** (terminal 1):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app
```

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm start
```

App runs at:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### 4. Run with Docker

Put the same variables in a `.env` file next to `docker-compose.yml`
(`GROQ_API_KEY`, `SECRET_KEY`, `SMTP_*`), then run:

```bash
docker-compose up --build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new account |
| POST | /auth/login | Login, get JWT token |
| GET / PUT | /auth/profile | View / update company profile |
| POST | /auth/reset-password | Change password |
| POST | /jobs/ | Create a new job |
| GET | /jobs/ | List all your jobs |
| GET | /jobs/{id} | Get job details |
| PUT | /jobs/{id} | Update a job |
| DELETE | /jobs/{id} | Delete a job |
| POST | /candidates/jobs/{id}/upload | Upload resumes (bulk) |
| GET | /candidates/jobs/{id}/candidates | Get ranked candidates |
| DELETE | /candidates/{id} | Remove a candidate |
| GET | /candidates/jobs/{id}/export | Download CSV |
| POST | /shortlist/candidates/{id}/shortlist | Add / remove from shortlist |
| GET | /shortlist/jobs/{id}/shortlisted | List shortlisted candidates |
| GET | /interview/candidates/{id}/interview-questions | AI interview questions |
| POST | /email/send, /email/send-bulk | Send emails |
| POST | /email/generate-ai-email, /email/send-ai-bulk | AI-written accept / reject emails |

## Project Structure

```
HireIQ/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── database.py          # DB connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth_utils.py        # JWT utilities
│   ├── routers/
│   │   ├── auth.py
│   │   ├── jobs.py
│   │   ├── candidates.py
│   │   ├── shortlist.py
│   │   ├── interview.py
│   │   └── email_router.py
│   └── services/
│       ├── resume_parser.py # PDF / DOCX / OCR text extraction
│       └── ai_scorer.py     # Groq scoring
├── frontend/
│   └── src/
│       ├── App.js
│       ├── api/client.js
│       ├── hooks/useAuth.js
│       ├── components/      # AppShell, Icon, ScoreRing, NewJobModal
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── JobDetail.jsx
│           ├── MatchDetails.jsx
│           ├── InterviewQuestions.jsx
│           └── Profile.jsx
└── docker-compose.yml
```

