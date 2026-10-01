import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

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
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ fontWeight: 600 }}>AI is generating interview questions and answers...</p>
      <p className="text-faint" style={{ fontSize: "0.85rem" }}>This may take 10-15 seconds</p>
    </div>
  );

  if (error) return (
    <div className="container-narrow" style={{ textAlign: "center", marginTop: "3rem" }}>
      <div className="card">
        <div className="empty-state-icon">⚠️</div>
        <h2 style={{ color: "var(--color-danger)", marginBottom: "0.5rem" }}>Error</h2>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>{error}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="topbar">
        <div className="flex gap-md" style={{ alignItems: "center" }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← Back</button>
          <div>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 700 }}>🤖 AI Interview Questions and Answers</h1>
            <p className="text-faint" style={{ fontSize: "0.8rem" }}>Generated for {data?.candidate_name}</p>
          </div>
        </div>
        <button onClick={copyAll} className={"btn btn-sm " + (copied === "all" ? "btn-success" : "btn-primary")}>
          {copied === "all" ? "✓ Copied All!" : "Copy All"}
        </button>
      </div>

      <div className="container">
        <div className="card flex gap-md" style={{ alignItems: "center", marginBottom: "1.5rem" }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>
            {data?.candidate_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>{data?.candidate_name}</h2>
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>{data?.questions?.length} questions with answers</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {data?.questions?.map((q, index) => {
            const badgeClass = categoryColors[q.category] || "badge-neutral";
            return (
              <div key={index} className="panel">
                <div className="flex gap-md" style={{ padding: "1rem 1.2rem", background: "#fafbfc", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: "0.8rem" }}>{index + 1}</span>
                  <span className={"badge " + badgeClass}>{q.category}</span>
                </div>
                <div style={{ padding: "1.1rem 1.2rem" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem", lineHeight: 1.5 }}>Q: {q.question}</p>
                  <p className="text-muted" style={{ fontSize: "0.8rem", fontStyle: "italic", marginBottom: "0.9rem" }}>Why asked: {q.why_asked}</p>
                  <button onClick={() => toggleAnswer(index)} className={"btn btn-sm " + (showAnswer[index] ? "btn-success" : "btn-info-outline")}>
                    {showAnswer[index] ? "Hide Answer" : "Show Answer"}
                  </button>
                  {showAnswer[index] && (
                    <div className="fade-in" style={{ background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", borderRadius: "var(--radius-md)", padding: "1rem", marginTop: "0.7rem" }}>
                      <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-success)", marginBottom: "0.4rem" }}>Expected Answer:</p>
                      <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{q.answer}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
