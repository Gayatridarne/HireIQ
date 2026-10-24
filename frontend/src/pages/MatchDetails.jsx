import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import ScoreRing, { scoreLabel, scoreTone } from "../components/ScoreRing";

const band = (s) => (s >= 90 ? "Excellent" : s >= 80 ? "Very good" : s >= 65 ? "Good" : s >= 50 ? "Fair" : "Low");
const toneColor = (s) => (s >= 80 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--danger)");
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
const shortName = (name = "") => {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[0][0] + ". " + parts.slice(1).join(" ") : name;
};

function Chips({ items = [], max = 4, miss = false }) {
  if (!items.length) return <span className="text-faint">None</span>;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className="chips">
      {shown.map((s) => <span key={s} className={"chip" + (miss ? " chip-miss" : "")}>{s}</span>)}
      {rest > 0 && <span className="chip-more">+{rest} more</span>}
    </div>
  );
}

function ScoreBar({ label, sub, value }) {
  return (
    <div className="score-row">
      <div>
        <div className="score-row-title">{label}</div>
        <div className="score-row-sub">{sub}</div>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span style={{ width: value + "%" }} />
      </div>
      <div className="score-row-val">{value}%</div>
    </div>
  );
}

function ScoreCell({ value }) {
  if (value == null) return <td className="score-cell"><span className="text-faint">-</span></td>;
  return (
    <td className="score-cell">
      <b>{value}%</b>
      <small style={{ color: toneColor(value) }}>{band(value)}</small>
    </td>
  );
}

export default function MatchDetails() {
  const { jobId, candidateId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [shortIds, setShortIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullJD, setShowFullJD] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [j, c, sl] = await Promise.all([
        api.get("/jobs/" + jobId),
        api.get("/candidates/jobs/" + jobId + "/candidates"),
        api.get("/shortlist/jobs/" + jobId + "/shortlisted"),
      ]);
      setJob(j.data);
      setCandidates(c.data);
      setShortIds(sl.data.map((x) => x.id));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load this match.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); setShowFullJD(false); load(); }, [jobId, candidateId]);

  const cand = candidates.find((c) => String(c.id) === String(candidateId));
  const scored = useMemo(() => candidates.filter((c) => c.score), [candidates]);
  const rank = cand ? scored.findIndex((c) => c.id === cand.id) + 1 : 0;

  const similar = useMemo(() => {
    if (!cand?.score) return [];
    return scored
      .filter((c) => c.id !== cand.id)
      .sort((a, b) => Math.abs(a.score.score - cand.score.score) - Math.abs(b.score.score - cand.score.score))
      .slice(0, 3);
  }, [scored, cand]);

  if (loading) return <AppShell><div className="loading-screen"><div className="spinner" /><p>Loading match...</p></div></AppShell>;

  if (error || !job || !cand) {
    return (
      <AppShell>
        <div className="card empty-state" style={{ maxWidth: 520, margin: "3rem auto" }}>
          <div className="empty-state-icon"><Icon name="alert" size={24} className="" /></div>
          <p className="empty-state-title">{error || "Candidate not found"}</p>
          <p className="empty-state-sub" style={{ marginBottom: "1rem" }}>This candidate may have been removed.</p>
          <button className="btn btn-primary" onClick={() => navigate("/jobs/" + jobId)}>Back to candidates</button>
        </div>
      </AppShell>
    );
  }

  const s = cand.score;
  const isShortlisted = shortIds.includes(cand.id);
  const name = cand.name && cand.name !== "Unknown" ? cand.name : cand.file_name;
  const matched = s?.matched_skills || [];
  const missing = s?.missing_skills || [];
  const total = matched.length + missing.length;
  const coverage = total ? Math.round((matched.length / total) * 100) : null;
  const strengths = (s?.summary || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  const skillBars = [...matched.map((k) => ({ skill: k, ok: true })), ...missing.map((k) => ({ skill: k, ok: false }))].slice(0, 10);

  const recoText = {
    "Strong Yes": shortName(name) + " is a top match for this role. We highly recommend moving this candidate to the shortlist.",
    Yes: shortName(name) + " is a good match for this role. We recommend shortlisting this candidate.",
    Maybe: shortName(name) + " is a partial match. Review the skill gaps before deciding.",
    No: shortName(name) + " is not a strong match for this role based on the resume provided.",
  }[s?.recommendation] || s?.summary;

  const toggleShortlist = async () => {
    setBusy(true);
    try { await api.post("/shortlist/candidates/" + cand.id + "/shortlist"); await load(); } finally { setBusy(false); }
  };

  const removeCandidate = async () => {
    if (!window.confirm("Remove this candidate?")) return;
    await api.delete("/candidates/" + cand.id);
    navigate("/jobs/" + jobId);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  const interviewPath = "/jobs/" + jobId + "/candidates/" + cand.id + "/interview";

  return (
    <AppShell>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Icon name="arrowLeft" size={15} className="" />
        <Link to="/">Dashboard</Link>
        <Icon name="chevronRight" size={13} className="" />
        <Link to={"/jobs/" + jobId}>{job.title}</Link>
        <Icon name="chevronRight" size={13} className="" />
        <span className="current">Match details</span>
      </nav>

      <div className="page-head">
        <div>
          <h1 className="page-title">AI Job Matching</h1>
          <p className="page-sub">
            Job: {job.title} &nbsp;&bull;&nbsp; Posted on {new Date(job.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => navigate("/jobs/" + jobId)}>
            <Icon name="arrowLeft" size={16} className="" /> Back to candidates
          </button>
          <button className="btn btn-secondary" onClick={copyLink}>
            <Icon name={copied ? "check" : "link"} size={16} className="" /> {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>

      {!s ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><div className="spinner" style={{ width: 22, height: 22 }} /></div>
          <p className="empty-state-title">{cand.status === "failed" ? "This resume could not be analysed" : "Still analysing this resume..."}</p>
          <p className="empty-state-sub" style={{ marginBottom: "1rem" }}>
            {cand.status === "failed" ? "Remove it and upload a text-based PDF or DOCX." : "The match score will appear here in a few seconds."}
          </p>
          <button className="btn btn-primary" onClick={load}>Refresh</button>
        </div>
      ) : (
        <>
          <div className="match-grid">
            {/* ---------- Left column ---------- */}
            <div className="match-col">
              <section className="card">
                <div className="profile-top">
                  <div className="avatar">{initials(name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex-between" style={{ alignItems: "flex-start", gap: "0.5rem" }}>
                      <div className="profile-name">{name}</div>
                      {cand.status === "done" && <span className="badge badge-success">AI parsed</span>}
                    </div>
                    <div className="profile-sub">Candidate for {job.title}</div>
                  </div>
                </div>
                {cand.email && <div className="kv"><Icon name="mail" size={16} /><span>{cand.email}</span></div>}
                <div className="kv"><Icon name="file" size={16} /><span title={cand.file_name}>{cand.file_name}</span></div>
                {isShortlisted && <div className="kv" style={{ color: "var(--success)" }}><Icon name="star" size={16} className="" /><span>Shortlisted</span></div>}
                <button className="btn btn-outline btn-block" style={{ marginTop: "0.9rem" }} onClick={() => navigate(interviewPath)}>
                  Interview questions <Icon name="arrowRight" size={15} className="" />
                </button>
              </section>

              <section className="card">
                <h2 className="card-title"><Icon name="file" size={18} /> Job description</h2>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{job.title}</h3>
                <p className={"text-muted" + (showFullJD ? "" : " jd-clamp")} style={{ fontSize: "0.84rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {job.description}
                </p>
                <button className="btn-link" style={{ marginTop: "0.8rem", fontSize: "0.84rem" }} onClick={() => setShowFullJD((v) => !v)}>
                  {showFullJD ? "Show less" : "View full JD"} <Icon name={showFullJD ? "chevronDown" : "arrowRight"} size={14} className="" />
                </button>
              </section>

              <section className="card">
                <h2 className="card-title"><Icon name="info" size={18} /> Matching details</h2>
                <table className="detail-table">
                  <tbody>
                    <tr><td>Matched on</td><td>{new Date(cand.created_at).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
                    <tr><td>Recommendation</td><td>{s.recommendation}</td></tr>
                    <tr><td>Rank in this job</td><td>#{rank} of {scored.length}</td></tr>
                    <tr><td>Skills found</td><td>{matched.length} of {total}</td></tr>
                    <tr><td>Match ID</td><td>match_{cand.id}</td></tr>
                  </tbody>
                </table>
              </section>
            </div>

            {/* ---------- Middle column ---------- */}
            <div className="match-col">
              <section className="card">
                <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
                  <h2 className="card-title" style={{ margin: 0 }}>Overall match score</h2>
                  <span className={"badge badge-" + scoreTone(s.score)}>
                    <Icon name="checkCircle" size={14} className="" /> {s.recommendation === "No" ? "Weak match" : s.recommendation === "Maybe" ? "Partial match" : s.recommendation === "Yes" ? "Good match" : "Strong match"}
                  </span>
                </div>
                <div className="score-hero">
                  <div style={{ textAlign: "center" }}>
                    <ScoreRing value={s.score} size={168} stroke={13} caption={scoreLabel(s.score)} />
                    <p className="text-faint" style={{ fontSize: "0.76rem", marginTop: "0.6rem" }}>
                      Ranked #{rank} of {scored.length} candidate{scored.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.92rem", fontWeight: 600, marginBottom: "0.9rem" }}>Score breakdown</h3>
                    <div className="score-rows">
                      <ScoreBar label="Overall fit" sub="Resume compared with the job description" value={Math.round(s.score)} />
                      {coverage != null && <ScoreBar label="Skills" sub={matched.length + " of " + total + " key skills found"} value={coverage} />}
                    </div>
                  </div>
                </div>
                <div className="callout">
                  <Icon name="sparkles" size={17} />
                  <span>The AI reads the whole resume against the job description and weighs meaning and context, not just keyword matches.</span>
                </div>
              </section>

              <section className="card">
                <h2 className="card-title">Detailed score breakdown</h2>
                <table className="breakdown">
                  <thead>
                    <tr><th>Category</th><th>What we look for</th><th>Candidate strength</th><th style={{ textAlign: "right" }}>Score</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><div className="cat"><span className="cat-ico"><Icon name="code" size={17} className="" /></span>Skills</div></td>
                      <td className="look">Skills and tools required by the job description</td>
                      <td>
                        <Chips items={matched} />
                        {missing.length > 0 && <div style={{ marginTop: "0.5rem" }}><Chips items={missing} max={4} miss /></div>}
                      </td>
                      <ScoreCell value={coverage} />
                    </tr>
                    <tr>
                      <td><div className="cat"><span className="cat-ico"><Icon name="target" size={17} className="" /></span>Overall fit</div></td>
                      <td className="look">How well the whole resume fits this role</td>
                      <td><span className={"badge badge-" + scoreTone(s.score)}>{s.recommendation}</span></td>
                      <ScoreCell value={Math.round(s.score)} />
                    </tr>
                  </tbody>
                </table>
              </section>
            </div>

            {/* ---------- Right column ---------- */}
            <div className="match-col right">
              <section className="card">
                <h2 className="card-title">Why this candidate matches</h2>
                <ul className="tick-list">
                  {strengths.map((t, i) => (
                    <li key={i}><span className="tick"><Icon name="check" size={13} strokeWidth={2.6} className="" /></span><span>{t}</span></li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <div className="flex-between" style={{ marginBottom: "1rem" }}>
                  <h2 className="card-title" style={{ margin: 0 }}>Skills overlap</h2>
                  <div className="legend"><span><i style={{ background: "var(--primary)" }} />Matched</span><span><i style={{ background: "var(--danger)" }} />Missing</span></div>
                </div>
                {skillBars.length === 0 ? (
                  <p className="text-faint" style={{ fontSize: "0.84rem" }}>No skill data was extracted from this resume.</p>
                ) : skillBars.map((k) => (
                  <div className="skill-row" key={k.skill}>
                    <span className="skill-name" title={k.skill}>{k.skill}</span>
                    <div className={"bar" + (k.ok ? "" : " red")}><span style={{ width: k.ok ? "100%" : "4%" }} /></div>
                    <span className="skill-val" style={{ color: k.ok ? "var(--text)" : "var(--danger)" }}>{k.ok ? "Found" : "Missing"}</span>
                  </div>
                ))}
              </section>

              <section className="card">
                <h2 className="card-title">Similar candidates</h2>
                {similar.length === 0 ? (
                  <p className="text-faint" style={{ fontSize: "0.84rem" }}>Upload more resumes to compare candidates.</p>
                ) : similar.map((c) => (
                  <button key={c.id} className="sim" onClick={() => navigate("/jobs/" + jobId + "/candidates/" + c.id)}>
                    <span className="avatar">{initials(c.name || c.file_name)}</span>
                    <span className="sim-name">{shortName(c.name || c.file_name)}</span>
                    <span className="sim-score">{Math.round(c.score.score)}%</span>
                  </button>
                ))}
              </section>
            </div>
          </div>

          {/* ---------- Recommendation bar ---------- */}
          <div className="reco">
            <div className="reco-text">
              <div className="reco-title"><Icon name="sparkles" size={18} className="" /> AI recommendation</div>
              <p className="reco-body">{recoText}</p>
            </div>
            <div className="reco-actions">
              <button className={"btn btn-lg " + (isShortlisted ? "btn-danger-outline" : "btn-primary")} onClick={toggleShortlist} disabled={busy}>
                <Icon name="star" size={16} className="" /> {isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              </button>
              <button className="btn btn-lg btn-outline" onClick={() => navigate(interviewPath)}>
                <Icon name="chat" size={16} className="" /> Interview Q&amp;A
              </button>
              <button className="btn btn-lg btn-secondary" onClick={removeCandidate}>
                <Icon name="trash" size={16} className="" /> Not a fit
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
