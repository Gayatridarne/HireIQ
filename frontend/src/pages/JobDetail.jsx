import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import ScoreRing, { scoreTone } from "../components/ScoreRing";

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
          <PolarGrid stroke="#e7e9f3" />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#5f6786" }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Fit" dataKey="value" stroke="#4f37e0" fill="#4f37e0" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex gap-md" style={{ justifyContent: "center", marginTop: "0.3rem" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>● Matched skill</span>
        <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>● Missing skill</span>
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
      const res = await api.put("/jobs/" + id, { title: descForm.title, description: descForm.description });
      setJob(res.data);
      setEditingDesc(false);
      setDescMsg("Job description updated. New uploads will be scored against the updated description.");
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
      const res = await api.post("/email/generate-ai-email", { candidate_id: candidate.id, email_type: emailType });
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
      const res = await api.post("/email/send-ai-bulk", { job_id: parseInt(id), email_type: emailType });
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
        const res = await api.post("/email/send-bulk", { job_id: parseInt(id), subject: emailForm.subject, message: emailForm.message });
        setEmailMsg("Sent to " + res.data.sent.length + " candidates!");
      } else {
        await api.post("/email/send", { candidate_id: emailTarget.id, subject: emailForm.subject, message: emailForm.message });
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
      await api.post("/candidates/jobs/" + id + "/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
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
    const matchSearch = (c.name || c.file_name || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (c.score?.recommendation || "").toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  if (!job) return (
    <AppShell>
      <div className="loading-screen"><div className="spinner" /><p>Loading…</p></div>
    </AppShell>
  );

  const shortIds = new Set(shortlisted.map((x) => x.id));
  const isShort = (c) => shortIds.has(c.id);
  const shortlistedFull = candidates.filter((c) => shortIds.has(c.id));

  const openMatch = (c) => navigate("/jobs/" + id + "/candidates/" + c.id);

  const renderCandidate = (c, index, showInterview, showEmail) => (
    <div key={c.id} className="card card-hover" style={{ marginBottom: "0.9rem" }}>
      <div className="cand">
        <div className="cand-rank">#{index + 1}</div>
        <div style={{ minWidth: 0 }}>
          <div className="cand-name">
            <button onClick={() => c.score && openMatch(c)} disabled={!c.score}>{c.name || c.file_name}</button>
            {c.status === "processing" && <span className="badge badge-warning">Analysing…</span>}
            {c.status === "failed" && <span className="badge badge-danger">Failed</span>}
            {isShort(c) && <span className="badge badge-success"><Icon name="star" size={11} className="" /> Shortlisted</span>}
            {c.score && <span className={"badge badge-" + scoreTone(c.score.score)}>{c.score.recommendation}</span>}
          </div>
          {c.email && <p className="cand-sub"><Icon name="mail" size={14} />{c.email}</p>}
          {c.score && (
            <>
              <div className="chips" style={{ marginTop: "0.7rem" }}>
                {c.score.matched_skills?.slice(0, 5).map((s) => (<span key={s} className="chip">{s}</span>))}
                {c.score.missing_skills?.slice(0, 3).map((s) => (<span key={s} className="chip chip-miss">{s}</span>))}
              </div>
              <p className="text-muted" style={{ fontSize: "0.84rem", lineHeight: 1.55, marginTop: "0.7rem" }}>{c.score.summary}</p>
            </>
          )}
        </div>
        {c.score && (
          <div style={{ textAlign: "center" }}>
            <ScoreRing value={c.score.score} size={78} stroke={7} fontSize={19} />
          </div>
        )}
      </div>
      {c.score && expandedChart[c.id] && <SkillRadarChart score={c.score} />}
      <div className="cand-actions">
        {c.score && (
          <button onClick={() => openMatch(c)} className="btn btn-sm btn-primary">View match details</button>
        )}
        <button onClick={() => toggleShortlist(c.id)} className={"btn btn-sm " + (isShort(c) ? "btn-danger-outline" : "btn-success")}>
          <Icon name="star" size={14} className="" /> {isShort(c) ? "Remove shortlist" : "Shortlist"}
        </button>
        {c.score && (
          <button onClick={() => toggleChart(c.id)} className="btn btn-sm btn-purple-outline">
            <Icon name="chart" size={14} className="" /> {expandedChart[c.id] ? "Hide chart" : "Skill chart"}
          </button>
        )}
        {showInterview && (
          <button onClick={() => navigate("/jobs/" + id + "/candidates/" + c.id + "/interview")} className="btn btn-sm btn-info-outline">
            <Icon name="chat" size={14} className="" /> Interview Q&amp;A
          </button>
        )}
        {showEmail && c.email && (
          <>
            <button onClick={() => openEmailModal(c)} className="btn btn-sm btn-purple-outline"><Icon name="mail" size={14} className="" /> Send email</button>
            <button onClick={() => generateAIEmail(c, "acceptance")} className="btn btn-sm btn-success"><Icon name="sparkles" size={14} className="" /> AI accept email</button>
            <button onClick={() => generateAIEmail(c, "rejection")} className="btn btn-sm btn-danger-outline"><Icon name="sparkles" size={14} className="" /> AI reject email</button>
          </>
        )}
        <button onClick={() => deleteCandidate(c.id)} className="btn btn-sm btn-text-danger" style={{ marginLeft: "auto" }}>
          <Icon name="trash" size={14} className="" /> Remove
        </button>
      </div>
    </div>
  );

  return (
    <AppShell>
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {emailTarget === "bulk" ? "Email all shortlisted (" + shortlisted.length + ")" : "Send email to " + (emailTarget?.name || emailTarget?.email)}
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="modal-close" aria-label="Close"><Icon name="x" size={18} className="" /></button>
            </div>
            {emailTarget !== "bulk" && emailTarget?.email && (
              <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>To: {emailTarget.email}</p>
            )}
            {emailTarget === "bulk" && (
              <div className="msg-success"><Icon name="users" size={16} className="" /> Sending to {shortlisted.length} shortlisted candidates</div>
            )}
            <div className="field">
              <label className="field-label">Subject</label>
              <input value={emailForm.subject} disabled={generatingEmail} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="input" />
            </div>
            <div className="field">
              <label className="field-label">Message</label>
              <textarea value={emailForm.message} disabled={generatingEmail} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} rows={8} className="textarea" />
            </div>
            {emailMsg && <p className="msg-success"><Icon name="checkCircle" size={16} className="" /> {emailMsg}</p>}
            {emailError && <p className="msg-error"><Icon name="alert" size={16} className="" /> {emailError}</p>}
            <div className="flex gap-md">
              <button onClick={sendEmail} disabled={sending || generatingEmail} className="btn btn-primary">
                {sending ? "Sending..." : generatingEmail ? "Generating..." : "Send email"}
              </button>
              <button onClick={() => setShowEmailModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Dashboard</Link>
        <Icon name="chevronRight" size={13} className="" />
        <span className="current">{job.title}</span>
      </nav>

      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{job.title}</h1>
          <p className="page-sub">{candidates.length} candidates &nbsp;•&nbsp; {shortlisted.length} shortlisted &nbsp;•&nbsp; Posted {new Date(job.created_at).toLocaleDateString()}</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setShowDesc((v) => !v)} className="btn btn-outline">
            <Icon name="file" size={16} className="" /> {showDesc ? "Hide description" : "Job description"}
          </button>
        </div>
      </div>

      {bulkAiMsg && <p className="msg-success">{bulkAiMsg}</p>}

      {showDesc && (
        <div className="card fade-in" style={{ marginBottom: "1.25rem" }}>
          <div className="flex-between" style={{ marginBottom: "0.9rem" }}>
            <h2 className="card-title" style={{ margin: 0 }}><Icon name="file" size={18} /> Job description</h2>
            {!editingDesc && (
              <button onClick={openEditDesc} className="btn btn-sm btn-outline"><Icon name="edit" size={14} className="" /> Edit</button>
            )}
          </div>

          {!editingDesc ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{job.title}</p>
              <p className="text-muted" style={{ fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{job.description}</p>
            </>
          ) : (
            <>
              <div className="field">
                <label className="field-label">Job title</label>
                <input value={descForm.title} onChange={(e) => setDescForm({ ...descForm, title: e.target.value })} className="input" />
              </div>
              <div className="field">
                <label className="field-label">Job description</label>
                <textarea value={descForm.description} onChange={(e) => setDescForm({ ...descForm, description: e.target.value })} rows={10} className="textarea" />
              </div>
              <p className="text-faint" style={{ fontSize: "0.8rem", marginBottom: "1rem" }}>
                After saving, only resumes you upload from now on are scored against the updated description. Existing candidates keep their old scores.
              </p>
              {descError && <p className="msg-error">{descError}</p>}
              <div className="flex gap-md">
                <button onClick={saveDesc} disabled={savingDesc} className="btn btn-primary">{savingDesc ? "Saving..." : "Save changes"}</button>
                <button onClick={cancelEditDesc} className="btn btn-secondary">Cancel</button>
              </div>
            </>
          )}
          {!editingDesc && descMsg && <p className="msg-success" style={{ marginTop: "0.8rem", marginBottom: 0 }}>{descMsg}</p>}
        </div>
      )}

      <div {...getRootProps()} className={"dropzone" + (isDragActive ? " active" : "")}>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex gap-sm" style={{ justifyContent: "center", color: "var(--primary)" }}>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            <span>Uploading and processing resumes…</span>
          </div>
        ) : (
          <>
            <div className="dropzone-icon"><Icon name="upload" size={22} className="" /></div>
            <p style={{ fontWeight: 600, marginBottom: "0.2rem" }}>Drop resumes here or click to upload</p>
            <p className="text-faint" style={{ fontSize: "0.82rem" }}>PDF and DOCX supported. Each resume is scored against this job.</p>
          </>
        )}
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={activeTab === "all"} onClick={() => setActiveTab("all")} className={"tab" + (activeTab === "all" ? " active" : "")}>
          All candidates <span className="tab-count">{candidates.length}</span>
        </button>
        <button role="tab" aria-selected={activeTab === "shortlisted"} onClick={() => setActiveTab("shortlisted")} className={"tab" + (activeTab === "shortlisted" ? " active" : "")}>
          <Icon name="star" size={14} className="" /> Shortlisted <span className="tab-count">{shortlisted.length}</span>
        </button>
      </div>

      {activeTab === "all" && (
        <div className="flex gap-md stack-mobile" style={{ marginBottom: "1rem" }}>
          <div className="search">
            <Icon name="search" size={17} />
            <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} className="input" aria-label="Search candidates by name" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select" style={{ maxWidth: 200 }} aria-label="Filter by recommendation">
            <option value="all">All recommendations</option>
            <option value="strong yes">Strong Yes</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
          </select>
        </div>
      )}

      {activeTab === "shortlisted" && shortlisted.length > 0 && (
        <div className="card flex-between flex-wrap gap-md" style={{ marginBottom: "1rem" }}>
          <div>
            <p style={{ fontWeight: 600 }}>{shortlisted.length} shortlisted candidate{shortlisted.length !== 1 ? "s" : ""}</p>
            <p className="text-muted" style={{ fontSize: "0.82rem" }}>Contact everyone on the shortlist at once.</p>
          </div>
          <div className="flex gap-sm flex-wrap">
            <button onClick={openBulkEmailModal} className="btn btn-primary btn-sm"><Icon name="mail" size={14} className="" /> Email shortlisted</button>
            <button onClick={() => sendAIBulkEmail("acceptance")} className="btn btn-success btn-sm"><Icon name="sparkles" size={14} className="" /> AI accept all</button>
            <button onClick={() => sendAIBulkEmail("rejection")} className="btn btn-danger-outline btn-sm"><Icon name="sparkles" size={14} className="" /> AI reject all</button>
          </div>
        </div>
      )}

      {activeTab === "shortlisted" && (
        shortlisted.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon"><Icon name="star" size={24} className="" /></div>
            <p className="empty-state-title">No shortlisted candidates yet</p>
            <p className="empty-state-sub">Use the Shortlist button on any candidate to add them here.</p>
          </div>
        ) : (
          shortlistedFull.map((c, i) => renderCandidate(c, i, false, true))
        )
      )}

      {activeTab === "all" && (
        filtered.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon"><Icon name="users" size={24} className="" /></div>
            <p className="empty-state-title">{candidates.length === 0 ? "No candidates yet" : "No candidates match your filters"}</p>
            <p className="empty-state-sub">{candidates.length === 0 ? "Upload resumes above to get ranked matches." : "Try a different name or recommendation."}</p>
          </div>
        ) : (
          filtered.map((c, i) => renderCandidate(c, i, true, false))
        )
      )}
    </AppShell>
  );
}
