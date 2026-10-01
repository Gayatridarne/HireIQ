import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import api from "../api/client";

const scoreBadge = (s) => s >= 80 ? "badge-success" : s >= 50 ? "badge-warning" : "badge-danger";
const scoreColor = (s) => s >= 80 ? "var(--color-success)" : s >= 50 ? "var(--color-warning)" : "var(--color-danger)";
const scoreBg = (s) => s >= 80 ? "var(--color-success-bg)" : s >= 50 ? "var(--color-warning-bg)" : "var(--color-danger-bg)";

const SkillRadarChart = ({ score }) => {
  if (!score) return null;
  const matched = (score.matched_skills || []).slice(0, 6).map((s) => ({ skill: s, value: 100 }));
  const missing = (score.missing_skills || []).slice(0, 5).map((s) => ({ skill: s, value: 0 }));
  const data = [...matched, ...missing];
  if (data.length < 3) {
    return <p className="text-faint" style={{ fontSize: "0.8rem", padding: "0.5rem 0" }}>Not enough skill data to chart.</p>;
  }
  return (
    <div className="fade-in" style={{ width: "100%", height: 240, marginTop: "0.6rem" }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#eee" />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#555" }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Fit" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex gap-md" style={{ justifyContent: "center", marginTop: "0.3rem" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--color-success)" }}>● Matched skill</span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-danger)" }}>● Missing skill</span>
      </div>
    </div>
  );
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [shortlisted, setShortlisted] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);
  const [emailForm, setEmailForm] = useState({ subject: "", message: "" });
  const [emailMsg, setEmailMsg] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedChart, setExpandedChart] = useState({});
  const [showDesc, setShowDesc] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descForm, setDescForm] = useState({ title: "", description: "" });
  const [descMsg, setDescMsg] = useState("");
  const [descError, setDescError] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [bulkAiMsg, setBulkAiMsg] = useState("");

  const toggleChart = (candidateId) => {
    setExpandedChart((prev) => ({ ...prev, [candidateId]: !prev[candidateId] }));
  };

  const openEditDesc = () => {
    setDescForm({ title: job.title, description: job.description });
    setEditingDesc(true);
    setShowDesc(true);
    setDescMsg("");
    setDescError("");
  };

  const cancelEditDesc = () => {
    setEditingDesc(false);
    setDescMsg("");
    setDescError("");
  };

  const saveDesc = async () => {
    setSavingDesc(true);
    setDescMsg("");
    setDescError("");
    try {
      const res = await api.put("/jobs/" + id, {
        title: descForm.title,
        description: descForm.description
      });
      setJob(res.data);
      setEditingDesc(false);
      setDescMsg("Job description updated! New uploads will be scored against the updated description.");
    } catch (err) {
      setDescError(err.response?.data?.detail || "Failed to update job description");
    } finally {
      setSavingDesc(false);
    }
  };

  useEffect(() => { fetchJob(); fetchCandidates(); fetchShortlisted(); }, [id]);

  const fetchJob = async () => {
    const res = await api.get("/jobs/" + id);
    setJob(res.data);
  };

  const fetchCandidates = async () => {
    const res = await api.get("/candidates/jobs/" + id + "/candidates");
    setCandidates(res.data);
  };

  const fetchShortlisted = async () => {
    const res = await api.get("/shortlist/jobs/" + id + "/shortlisted");
    setShortlisted(res.data);
  };

  const toggleShortlist = async (candidateId) => {
    await api.post("/shortlist/candidates/" + candidateId + "/shortlist");
    fetchCandidates();
    fetchShortlisted();
  };

  const openEmailModal = (candidate) => {
    setEmailTarget(candidate);
    setEmailForm({
      subject: "Interview Invitation - " + (job?.title || ""),
      message: "Dear " + (candidate?.name || "Candidate") + ",\n\nWe are pleased to inform you that you have been shortlisted for the position of " + (job?.title || "") + ".\n\nWe would like to invite you for an interview. Please reply to this email to confirm your availability.\n\nBest regards,\nHR Team"
    });
    setEmailMsg("");
    setEmailError("");
    setShowEmailModal(true);
  };

  const openBulkEmailModal = () => {
    setEmailTarget("bulk");
    setEmailForm({
      subject: "Interview Invitation - " + (job?.title || ""),
      message: "Dear Candidate,\n\nWe are pleased to inform you that you have been shortlisted for the position of " + (job?.title || "") + ".\n\nWe would like to invite you for an interview. Please reply to this email to confirm your availability.\n\nBest regards,\nHR Team"
    });
    setEmailMsg("");
    setEmailError("");
    setShowEmailModal(true);
  };

  const generateAIEmail = async (candidate, emailType) => {
    setEmailTarget(candidate);
    setEmailForm({ subject: "Generating...", message: "Please wait while AI drafts a personalized email..." });
    setEmailMsg("");
    setEmailError("");
    setShowEmailModal(true);
    setGeneratingEmail(true);
    try {
      const res = await api.post("/email/generate-ai-email", {
        candidate_id: candidate.id,
        email_type: emailType
      });
      setEmailForm({ subject: res.data.subject, message: res.data.message });
    } catch (err) {
      setEmailError(err.response?.data?.detail || "Failed to generate AI email");
      setEmailForm({ subject: "", message: "" });
    } finally {
      setGeneratingEmail(false);
    }
  };

  const sendAIBulkEmail = async (emailType) => {
    const label = emailType === "acceptance" ? "acceptance" : "rejection";
    if (!window.confirm("Send AI-personalized " + label + " emails to all " + shortlisted.length + " shortlisted candidates?")) return;
    setBulkAiMsg("Sending...");
    try {
      const res = await api.post("/email/send-ai-bulk", {
        job_id: parseInt(id),
        email_type: emailType
      });
      setBulkAiMsg("Sent to " + res.data.sent.length + " candidates" + (res.data.failed.length ? (", " + res.data.failed.length + " failed") : "") + ".");
    } catch (err) {
      setBulkAiMsg(err.response?.data?.detail || "Failed to send bulk AI emails");
    }
  };

  const sendEmail = async () => {
    setSending(true);
    setEmailMsg("");
    setEmailError("");
    try {
      if (emailTarget === "bulk") {
        const res = await api.post("/email/send-bulk", {
          job_id: parseInt(id),
          subject: emailForm.subject,
          message: emailForm.message
        });
        setEmailMsg("Sent to " + res.data.sent.length + " candidates!");
      } else {
        await api.post("/email/send", {
          candidate_id: emailTarget.id,
          subject: emailForm.subject,
          message: emailForm.message
        });
        setEmailMsg("Email sent to " + emailTarget.email + "!");
      }
    } catch (err) {
      setEmailError(err.response?.data?.detail || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach((f) => formData.append("files", f));
    try {
      await api.post("/candidates/jobs/" + id + "/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchCandidates();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    multiple: true
  });

  const deleteCandidate = async (cid) => {
    if (!window.confirm("Remove this candidate?")) return;
    await api.delete("/candidates/" + cid);
    fetchCandidates();
    fetchShortlisted();
  };

  const filtered = candidates.filter((c) => {
    const matchSearch = (c.name || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (c.score?.recommendation || "").toLowerCase().includes(filter.toLowerCase());
    return matchSearch && matchFilter;
  });

  if (!job) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );

  const CandidateCard = ({ c, index, showInterview, showEmail }) => (
    <div className="card card-hover" style={{ marginBottom: "0.9rem" }}>
      <div className="flex-between" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex gap-md flex-wrap" style={{ alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>#{index + 1} {c.name || c.file_name}</span>
            {c.status === "processing" && <span className="badge badge-warning">Analyzing...</span>}
            {c.status === "failed" && <span className="badge badge-danger">Failed</span>}
            {c.is_shortlisted && <span className="badge badge-success">⭐ Shortlisted</span>}
          </div>
          {c.email && <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>📧 {c.email}</p>}
        </div>
        {c.score && (
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: scoreColor(c.score.score), background: scoreBg(c.score.score), padding: "0.3rem 0.85rem", borderRadius: "var(--radius-md)", marginBottom: "0.3rem" }}>
              {c.score.score}
            </div>
            <span className={"badge " + scoreBadge(c.score.score)}>{c.score.recommendation}</span>
          </div>
        )}
      </div>
      {c.score && (
        <div style={{ marginTop: "0.9rem" }}>
          <div className="flex flex-wrap gap-sm" style={{ marginBottom: "0.6rem" }}>
            {c.score.matched_skills?.slice(0, 5).map((s) => (<span key={s} className="badge badge-success">{s}</span>))}
            {c.score.missing_skills?.slice(0, 3).map((s) => (<span key={s} className="badge badge-danger">{s}</span>))}
          </div>
          <p className="text-muted" style={{ fontSize: "0.85rem", lineHeight: 1.55 }}>{c.score.summary}</p>
          {expandedChart[c.id] && <SkillRadarChart score={c.score} />}
        </div>
      )}
      <div className="flex gap-md flex-wrap" style={{ marginTop: "1.1rem", paddingTop: "0.9rem", borderTop: "1px solid var(--color-border)" }}>
        <button onClick={() => toggleShortlist(c.id)} className={"btn btn-sm " + (c.is_shortlisted ? "btn-danger-outline" : "btn-success")}>
          {c.is_shortlisted ? "Remove Shortlist" : "⭐ Shortlist"}
        </button>
        {c.score && (
          <button onClick={() => toggleChart(c.id)} className="btn btn-sm btn-purple-outline">
            {expandedChart[c.id] ? "📊 Hide Chart" : "📊 Skill Chart"}
          </button>
        )}
        {showInterview && (
          <button onClick={() => navigate("/jobs/" + id + "/candidates/" + c.id + "/interview")} className="btn btn-sm btn-info-outline">
            🤖 Interview Q&A
          </button>
        )}
        {showEmail && c.email && (
          <button onClick={() => openEmailModal(c)} className="btn btn-sm btn-purple-outline">
            📧 Send Email
          </button>
        )}
        {showEmail && c.email && (
          <button onClick={() => generateAIEmail(c, "acceptance")} className="btn btn-sm btn-success">
            ✨ AI Accept Email
          </button>
        )}
        {showEmail && c.email && (
          <button onClick={() => generateAIEmail(c, "rejection")} className="btn btn-sm btn-danger-outline">
            ✨ AI Reject Email
          </button>
        )}
        <button onClick={() => deleteCandidate(c.id)} className="btn btn-sm btn-text-danger" style={{ marginLeft: "auto" }}>
          Remove
        </button>
      </div>
    </div>
  );

  return (
    <div className="page">
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {emailTarget === "bulk" ? "📧 Email All Shortlisted (" + shortlisted.length + ")" : "📧 Send Email to " + (emailTarget?.name || emailTarget?.email)}
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="modal-close">✕</button>
            </div>
            {emailTarget !== "bulk" && emailTarget?.email && (
              <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>To: {emailTarget.email}</p>
            )}
            {emailTarget === "bulk" && (
              <div style={{ background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", borderRadius: "var(--radius-md)", padding: "0.8rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--color-success)", fontWeight: 600 }}>Sending to {shortlisted.length} shortlisted candidates</p>
              </div>
            )}
            <div className="field">
              <label className="field-label">Subject</label>
              <input value={emailForm.subject} disabled={generatingEmail} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="input" />
            </div>
            <div className="field">
              <label className="field-label">Message</label>
              <textarea value={emailForm.message} disabled={generatingEmail} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} rows={8} className="textarea" />
            </div>
            {emailMsg && <p className="msg-success">✅ {emailMsg}</p>}
            {emailError && <p className="msg-error">❌ {emailError}</p>}
            <div className="flex gap-md">
              <button onClick={sendEmail} disabled={sending || generatingEmail} className="btn btn-primary">
                {sending ? "Sending..." : generatingEmail ? "Generating..." : "Send Email"}
              </button>
              <button onClick={() => setShowEmailModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="flex gap-md" style={{ alignItems: "center", minWidth: 0 }}>
          <button onClick={() => navigate("/")} className="btn btn-ghost btn-sm">← Back</button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</h1>
            <p className="text-faint" style={{ fontSize: "0.82rem" }}>{candidates.length} candidates · {shortlisted.length} shortlisted</p>
          </div>
        </div>
        <div className="flex gap-md topbar-actions-group">
          <button onClick={() => setShowDesc((v) => !v)} className="btn btn-ghost btn-sm">
            📄 {showDesc ? "Hide Description" : "Show Description"}
          </button>
          {shortlisted.length > 0 && (
            <button onClick={openBulkEmailModal} className="btn btn-primary btn-sm">
              📧 Email Shortlisted ({shortlisted.length})
            </button>
          )}
          {shortlisted.length > 0 && (
            <button onClick={() => sendAIBulkEmail("acceptance")} className="btn btn-success btn-sm">
              ✨ AI Accept All
            </button>
          )}
          {shortlisted.length > 0 && (
            <button onClick={() => sendAIBulkEmail("rejection")} className="btn btn-danger-outline btn-sm">
              ✨ AI Reject All
            </button>
          )}
        </div>
      </div>
      {bulkAiMsg && (
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <p className="msg-success" style={{ maxWidth: "900px", margin: "0 auto 1rem" }}>{bulkAiMsg}</p>
        </div>
      )}

      {showDesc && (
        <div className="container" style={{ paddingBottom: 0 }}>
          <div className="card fade-in">
            <div className="flex-between" style={{ marginBottom: "0.9rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>📄 Job Description</h2>
              {!editingDesc && (
                <button onClick={openEditDesc} className="btn btn-sm btn-info-outline">
                  ✏️ Edit
                </button>
              )}
            </div>

            {!editingDesc ? (
              <>
                <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{job.title}</p>
                <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{job.description}</p>
              </>
            ) : (
              <>
                <div className="field">
                  <label className="field-label">Job Title</label>
                  <input value={descForm.title} onChange={(e) => setDescForm({ ...descForm, title: e.target.value })} className="input" />
                </div>
                <div className="field">
                  <label className="field-label">Job Description</label>
                  <textarea value={descForm.description} onChange={(e) => setDescForm({ ...descForm, description: e.target.value })} rows={10} className="textarea" />
                </div>
                <p className="text-faint" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>
                  Tip: after saving, only resumes you upload from now on will be scored against the updated description. Existing candidates keep their old scores.
                </p>
                {descMsg && <p className="msg-success">✅ {descMsg}</p>}
                {descError && <p className="msg-error">❌ {descError}</p>}
                <div className="flex gap-md">
                  <button onClick={saveDesc} disabled={savingDesc} className="btn btn-primary">
                    {savingDesc ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={cancelEditDesc} className="btn btn-secondary">Cancel</button>
                </div>
              </>
            )}
            {!editingDesc && descMsg && <p className="msg-success" style={{ marginTop: "0.8rem", marginBottom: 0 }}>✅ {descMsg}</p>}
          </div>
        </div>
      )}

      <div className="container">
        <div {...getRootProps()} className={"dropzone" + (isDragActive ? " active" : "")}>
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex gap-sm" style={{ justifyContent: "center", color: "var(--color-primary)" }}>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              <span>Uploading and processing resumes...</span>
            </div>
          ) : (
            <>
              <div className="empty-state-icon" style={{ margin: "0 auto 0.5rem" }}>📤</div>
              <p style={{ fontWeight: 600, marginBottom: "0.3rem" }}>Drop resumes here or click to upload</p>
              <p className="text-faint" style={{ fontSize: "0.85rem" }}>Supports PDF and DOCX</p>
            </>
          )}
        </div>

        <div className="flex gap-md stack-mobile" style={{ marginBottom: "1rem" }}>
          <input placeholder="🔍 Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select" style={{ maxWidth: "200px" }}>
            <option value="all">All</option>
            <option value="strong yes">Strong Yes</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="tabs">
          <button onClick={() => setActiveTab("all")} className={"tab" + (activeTab === "all" ? " active" : "")}>
            All Candidates ({candidates.length})
          </button>
          <button onClick={() => setActiveTab("shortlisted")} className={"tab" + (activeTab === "shortlisted" ? " active tab-success" : "")}>
            ⭐ Shortlisted ({shortlisted.length})
          </button>
        </div>

        {activeTab === "shortlisted" && (
          shortlisted.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">⭐</div>
              <p className="empty-state-title">No shortlisted candidates yet.</p>
              <p className="empty-state-sub">Click the ⭐ Shortlist button on any candidate to add them here.</p>
            </div>
          ) : (
            shortlisted.map((c, i) => <CandidateCard key={c.id} c={c} index={i} showInterview={false} showEmail={true} />)
          )
        )}

        {activeTab === "all" && (
          filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">👤</div>
              <p className="empty-state-title">No candidates yet</p>
              <p className="empty-state-sub">Upload resumes above to get started.</p>
            </div>
          ) : (
            filtered.map((c, i) => <CandidateCard key={c.id} c={c} index={i} showInterview={true} showEmail={false} />)
          )
        )}
      </div>
    </div>
  );
}
