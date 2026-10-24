import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import Icon from "./Icon";

export default function NewJobModal({ onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/jobs/", form);
      navigate("/jobs/" + res.data.id);
    } catch (err) {
      setError(errorMessage(err, "Could not create the job. Please try again."));
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Create new job">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Create a new job</h2>
            <p className="text-muted" style={{ fontSize: "0.84rem", marginTop: "0.25rem" }}>Resumes you upload will be scored against this description.</p>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close"><Icon name="x" size={18} className="" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor="job-title">Job title</label>
            <input id="job-title" className="input" required autoFocus placeholder="e.g. Senior Backend Engineer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="job-desc">Job description</label>
            <textarea id="job-desc" className="textarea" required rows={8} placeholder="Paste the job description, including key requirements…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p className="msg-error">{error}</p>}
          <div className="flex gap-md">
            <button type="submit" disabled={creating} className="btn btn-primary">{creating ? "Creating…" : "Create job"}</button>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
