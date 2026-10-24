import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

const categoryColors = {
  Technical: "badge-info",
  "Project/Experience": "badge-success",
  "Problem-solving": "badge-warning",
  Behavioral: "badge-purple",
  "Missing Skills": "badge-danger",
};

export default function InterviewQuestions() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const [showAnswer, setShowAnswer] = useState({});

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    try {
      const res = await api.get("/interview/candidates/" + candidateId + "/interview-questions");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!data) return;
    const text = data.questions.map((q, i) => "Q" + (i + 1) + " [" + q.category + "]:\nQuestion: " + q.question + "\nAnswer: " + q.answer).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleAnswer = (index) => {
    setShowAnswer((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (loading) return (
    <AppShell>
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ fontWeight: 600, color: "var(--text)" }}>AI is generating interview questions and answers…</p>
        <p className="text-faint" style={{ fontSize: "0.85rem" }}>This may take 10-15 seconds</p>
      </div>
    </AppShell>
  );

  if (error) return (
    <AppShell>
      <div className="card empty-state" style={{ maxWidth: 520, margin: "3rem auto" }}>
        <div className="empty-state-icon"><Icon name="alert" size={24} className="" /></div>
        <p className="empty-state-title">Could not generate questions</p>
        <p className="empty-state-sub" style={{ marginBottom: "1.2rem" }}>{error}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Go back</button>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button onClick={() => navigate(-1)}><Icon name="arrowLeft" size={15} className="" /> Back</button>
        <Icon name="chevronRight" size={13} className="" />
        <span className="current">Interview questions</span>
      </nav>

      <div className="page-head">
        <div>
          <h1 className="page-title">Interview questions</h1>
          <p className="page-sub">AI-generated for {data?.candidate_name} • {data?.questions?.length} questions with expected answers</p>
        </div>
        <div className="page-actions">
          <button onClick={copyAll} className={"btn " + (copied === "all" ? "btn-success" : "btn-primary")}>
            <Icon name={copied === "all" ? "check" : "copy"} size={16} className="" /> {copied === "all" ? "Copied" : "Copy all"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 860 }}>
        {data?.questions?.map((q, index) => {
          const badgeClass = categoryColors[q.category] || "badge-neutral";
          return (
            <div key={index} className="panel">
              <div className="qa-head">
                <span className="qa-num">{index + 1}</span>
                <span className={"badge " + badgeClass}>{q.category}</span>
              </div>
              <div style={{ padding: "1.1rem 1.2rem" }}>
                <p style={{ fontWeight: 600, fontSize: "0.98rem", marginBottom: "0.5rem", lineHeight: 1.5 }}>{q.question}</p>
                <p className="text-muted" style={{ fontSize: "0.82rem", marginBottom: "0.9rem" }}>Why it is asked: {q.why_asked}</p>
                <button onClick={() => toggleAnswer(index)} className={"btn btn-sm " + (showAnswer[index] ? "btn-success" : "btn-outline")}>
                  {showAnswer[index] ? "Hide answer" : "Show answer"}
                </button>
                {showAnswer[index] && (
                  <div className="fade-in" style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-md)", padding: "1rem", marginTop: "0.8rem" }}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--success)", marginBottom: "0.4rem" }}>Expected answer</p>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{q.answer}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
