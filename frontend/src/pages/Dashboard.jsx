import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => { fetchJobs(); fetchProfile(); }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchJobs = async () => {
    try { const res = await api.get("/jobs/"); setJobs(res.data); } finally { setLoading(false); }
  };

  const fetchProfile = async () => {
    try { const res = await api.get("/auth/profile"); setProfile(res.data); } catch (err) { console.error("Failed to fetch profile"); }
  };

  const resetPassword = async () => {
    setPasswordMsg(""); setPasswordError("");
    if (passwords.new_password !== passwords.confirm_password) { setPasswordError("Passwords do not match!"); return; }
    if (passwords.new_password.length < 6) { setPasswordError("Min 6 characters!"); return; }
    try {
      await api.post("/auth/reset-password", { current_password: passwords.current_password, new_password: passwords.new_password });
      setPasswordMsg("Password changed!");
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      setShowPassword(false);
    } catch (err) { setPasswordError(err.response?.data?.detail || "Failed"); }
  };

  const createJob = async (e) => {
    e.preventDefault(); setCreating(true);
    try { const res = await api.post("/jobs/", form); navigate("/jobs/" + res.data.id); } catch { alert("Failed to create job"); } finally { setCreating(false); }
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Delete this job?")) return;
    await api.delete("/jobs/" + id);
    setJobs(jobs.filter((j) => j.id !== id));
  };

  const initials = (profile) => profile?.company_name ? profile.company_name[0].toUpperCase() : profile?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-brand">HireIQ</div>
        <div className="flex gap-md" style={{ alignItems: "center" }}>
          <div className="hide-mobile" style={{ textAlign: "right" }}>
            <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>{profile ? profile.company_name || "Company" : ""}</p>
            <p className="text-faint" style={{ fontSize: "0.76rem" }}>{profile ? profile.email : ""}</p>
          </div>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div
              onClick={() => setShowDropdown(!showDropdown)}
              className="avatar"
              style={{ width: 38, height: 38, fontSize: "0.95rem", cursor: "pointer" }}
            >
              {initials(profile)}
            </div>
            {showDropdown && (
              <div className="card fade-in" style={{ position: "absolute", right: 0, top: "48px", width: "300px", maxWidth: "88vw", zIndex: 999, padding: "1.2rem" }}>
                <div style={{ textAlign: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
                  <div className="avatar" style={{ width: 52, height: 52, fontSize: "1.3rem", margin: "0 auto 0.6rem" }}>
                    {initials(profile)}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>{profile?.company_name || "Company"}</p>
                  <p className="text-faint" style={{ fontSize: "0.82rem" }}>{profile?.email}</p>
                  <p className="text-faint" style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>{profile?.created_at ? "Member since " + new Date(profile.created_at).toLocaleDateString() : ""}</p>
                </div>
                <button onClick={() => { setShowPassword(!showPassword); setPasswordMsg(""); setPasswordError(""); }} className="btn btn-ghost btn-block btn-sm" style={{ marginBottom: "0.6rem" }}>
                  {showPassword ? "Hide Change Password" : "Change Password"}
                </button>
                {showPassword && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.9rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", marginBottom: "0.6rem" }}>
                    <input type="password" placeholder="Current password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} className="input" style={{ fontSize: "0.85rem", padding: "0.5rem 0.7rem" }} />
                    <input type="password" placeholder="New password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} className="input" style={{ fontSize: "0.85rem", padding: "0.5rem 0.7rem" }} />
                    <input type="password" placeholder="Confirm new password" value={passwords.confirm_password} onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })} className="input" style={{ fontSize: "0.85rem", padding: "0.5rem 0.7rem" }} />
                    {passwordMsg && <p className="msg-success" style={{ marginBottom: 0 }}>{passwordMsg}</p>}
                    {passwordError && <p className="msg-error" style={{ marginBottom: 0 }}>{passwordError}</p>}
                    <button onClick={resetPassword} className="btn btn-primary btn-sm">Update Password</button>
                  </div>
                )}
                <button onClick={logout} className="btn btn-danger-outline btn-block btn-sm">Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="flex-between stack-mobile gap-md" style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Jobs</h1>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? "Cancel" : "+ New job"}
          </button>
        </div>

        {showForm && (
          <div className="card fade-in" style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1.05rem" }}>Create new job</h3>
            <form onSubmit={createJob}>
              <div className="field">
                <label className="field-label">Job title</label>
                <input placeholder="e.g. Software Developer - Fresher" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Job description</label>
                <textarea placeholder="Paste job description..." required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} className="textarea" />
              </div>
              <div className="flex gap-md" style={{ marginTop: "1.25rem" }}>
                <button type="submit" disabled={creating} className="btn btn-primary">{creating ? "Creating..." : "Create job"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex gap-sm" style={{ color: "var(--color-text-muted)", padding: "1rem 0" }}>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            <span>Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">No jobs yet</p>
            <p className="empty-state-sub">Create your first job to start discovering candidates.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {jobs.map((job) => (
              <div key={job.id} className="card card-hover flex-between stack-mobile gap-md">
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: "0.3rem", fontSize: "1.02rem" }}>{job.title}</h3>
                  <p className="text-muted" style={{ fontSize: "0.86rem" }}>{job.candidate_count} candidate{job.candidate_count !== 1 ? "s" : ""} | {new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-md">
                  <button onClick={() => navigate("/jobs/" + job.id)} className="btn btn-primary btn-sm">View candidates</button>
                  <button onClick={() => deleteJob(job.id)} className="btn btn-text-danger btn-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
