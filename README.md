# AI-Powered Candidate Discovery Engine

A full-stack app that uses Claude AI to automatically score and rank resumes against a job description — turning hours of manual screening into seconds.

## Tech Stack

- **Frontend**: React, react-dropzone, react-router-dom
- **Backend**: FastAPI, Python
- **AI**: Anthropic Claude API
- **OCR**: pdfplumber, pytesseract
- **Database**: PostgreSQL + SQLAlchemy
- **Auth**: JWT (python-jose + passlib)
- **Deploy**: Docker Compose

## Features

- Upload multiple resumes at once (PDF / DOCX)
- Claude AI scores each resume 0–100 against the job description
- Auto-extracts candidate name, email, matched skills, missing skills
- Ranked candidate dashboard with color-coded scores
- Search and filter candidates by name or recommendation
- Export shortlist as CSV
- JWT authentication with per-company data isolation
- Background processing so uploads return instantly

## Quick Start

### 1. Clone and set up environment

```bash
git clone <your-repo-url>
cd candidate-discovery
```

### 2. Set environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and add your ANTHROPIC_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Run with Docker

```bash
ANTHROPIC_API_KEY=your_key SECRET_KEY=your_secret docker-compose up --build
```

App runs at:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### 4. Run without Docker (local dev)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Make sure PostgreSQL is running and .env is configured
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new account |
| POST | /auth/login | Login, get JWT token |
| POST | /jobs/ | Create a new job |
| GET | /jobs/ | List all your jobs |
| GET | /jobs/{id} | Get job details |
| DELETE | /jobs/{id} | Delete a job |
| POST | /candidates/jobs/{id}/upload | Upload resumes (bulk) |
| GET | /candidates/jobs/{id}/candidates | Get ranked candidates |
| DELETE | /candidates/{id} | Remove a candidate |
| GET | /candidates/jobs/{id}/export | Download CSV |

## Project Structure

```
candidate-discovery/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── database.py          # DB connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth_utils.py        # JWT utilities
│   ├── routers/
│   │   ├── auth.py
│   │   ├── jobs.py
│   │   └── candidates.py
│   └── services/
│       ├── resume_parser.py # OCR extraction
│       └── ai_scorer.py     # Claude API
├── frontend/
│   └── src/
│       ├── App.js
│       ├── api/client.js
│       ├── hooks/useAuth.js
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           └── JobDetail.jsx
└── docker-compose.yml
```

## Resume Bullet Points

- Built an AI-powered candidate ranking engine using Claude API to score resumes against job descriptions, reducing shortlisting time from hours to seconds
- Engineered a bulk resume processing pipeline in FastAPI handling simultaneous PDF/DOCX uploads with async background tasks
- Developed a React recruiter dashboard with AI-generated match scores, skill gap analysis, and CSV export
