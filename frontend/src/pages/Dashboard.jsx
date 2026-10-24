import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import NewJobModal from "../components/NewJobModal";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/jobs/").then((r) => setJobs(r.data)).finally(() => setLoading(false));
  }, []);

  const deleteJob = async (id) => {
    if (!window.confirm("Delete this job?")) return;
    await api.delete("/jobs/" + id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const totalCandidates = jobs.reduce((n, j) => n + (j.candidate_count || 0), 0);
  const waiting = jobs.filter((j) => !j.candidate_count).length;
  const stats = [
    { label: "Open jobs", value: jobs.length, icon: "jobs", tone: "" },
    { label: "Resumes uploaded", value: totalCandidates, icon: "users", tone: "blue" },
    { label: "Jobs waiting for resumes", value: waiting, icon: "file", tone: "amber" },
  ];

  const shown = jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      {showNew && <NewJobModal onClose={() => setShowNew(false)} />}

      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Your jobs and uploaded candidates at a glance.</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setShowNew(true)} className="btn btn-primary">
            <Icon name="plus" size={16} className="" /> New job
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="card stat" key={s.label}>
            <div className={"stat-icon " + s.tone}><Icon name={s.icon} size={22} className="" /></div>
            <div>
              <div className="stat-value">{loading ? "\u2013" : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-between flex-wrap gap-md" style={{ marginBottom: "0.9rem" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Jobs</h2>
        <div className="search" style={{ maxWidth: 320 }}>
          <Icon name="search" size={17} />
          <input className="input" placeholder="Search jobs" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search jobs" />
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : shown.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Icon name="jobs" size={24} className="" /></div>
          <p className="empty-state-title">{jobs.length === 0 ? "No jobs yet" : "No jobs match your search"}</p>
          <p className="empty-state-sub" style={{ marginBottom: jobs.length === 0 ? "1rem" : 0 }}>
            {jobs.length === 0 ? "Create your first job to start discovering candidates." : "Try a different title."}
          </p>
          {jobs.length === 0 && <button onClick={() => setShowNew(true)} className="btn btn-primary">Create job</button>}
        </div>
      ) : (
        <div className="panel">
          <div className="job-row head">
            <span>Job</span>
            <span>Candidates</span>
            <span>Posted</span>
            <span />
          </div>
          {shown.map((job) => (
            <div className="job-row" key={job.id}>
              <div style={{ minWidth: 0 }}>
                <button className="btn-link job-title" style={{ color: "var(--text)", textAlign: "left" }} onClick={() => navigate("/jobs/" + job.id)}>
                  {job.title}
                </button>
              </div>
              <span className="num col-extra">{job.candidate_count}</span>
              <span className="col-extra text-muted">{new Date(job.created_at).toLocaleDateString()}</span>
              <div className="flex gap-sm">
                <button onClick={() => navigate("/jobs/" + job.id)} className="btn btn-outline btn-sm">View candidates</button>
                <button onClick={() => deleteJob(job.id)} className="btn btn-text-danger btn-sm" aria-label={"Delete " + job.title} title="Delete job">
                  <Icon name="trash" size={16} className="" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
