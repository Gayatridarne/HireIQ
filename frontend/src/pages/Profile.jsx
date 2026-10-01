import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/profile");
      setProfile(res.data);
      setCompanyName(res.data.company_name || "");
    } catch (err) {
      console.error("Failed to fetch profile");
    }
  };

  const updateProfile = async () => {
    setProfileMsg("");
    setProfileError("");
    setLoading(true);
    try {
      await api.put("/auth/profile", { company_name: companyName });
      setProfileMsg("Profile updated successfully!");
      fetchProfile();
    } catch (err) {
      setProfileError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setPasswordMsg("");
    setPasswordError("");
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordError("New passwords do not match!");
      return;
    }
    if (passwords.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters!");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      setPasswordMsg("Password reset successfully!");
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );

  return (
    <div className="container-narrow">
      <div className="flex-between stack-mobile gap-md" style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>My Profile</h1>
        <div className="flex gap-md">
          <button onClick={() => navigate("/")} className="btn btn-secondary btn-sm">← Back to Jobs</button>
          <button onClick={logout} className="btn btn-text-danger btn-sm">Logout</button>
        </div>
      </div>

      <div className="card flex gap-lg" style={{ alignItems: "center", marginBottom: "1.25rem" }}>
        <div className="avatar" style={{ width: 70, height: 70, fontSize: "1.8rem" }}>
          {profile.company_name ? profile.company_name[0].toUpperCase() : profile.email[0].toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{profile.company_name || "No company name"}</h2>
          <p className="text-muted" style={{ marginTop: "0.25rem" }}>{profile.email}</p>
          <p className="text-faint" style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1.1rem", fontSize: "1.02rem" }}>Update Profile</h3>

        <div className="field">
          <label className="field-label">Email</label>
          <input value={profile.email} disabled className="input" />
        </div>

        <div className="field">
          <label className="field-label">Company Name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            className="input"
          />
        </div>

        {profileMsg && <p className="msg-success">✅ {profileMsg}</p>}
        {profileError && <p className="msg-error">❌ {profileError}</p>}

        <button onClick={updateProfile} disabled={loading} className="btn btn-primary">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: "1.1rem", fontSize: "1.02rem" }}>Reset Password</h3>

        <div className="field">
          <label className="field-label">Current Password</label>
          <input
            type="password"
            value={passwords.current_password}
            onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
            placeholder="Enter current password"
            className="input"
          />
        </div>

        <div className="field">
          <label className="field-label">New Password</label>
          <input
            type="password"
            value={passwords.new_password}
            onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
            placeholder="Enter new password"
            className="input"
          />
        </div>

        <div className="field">
          <label className="field-label">Confirm New Password</label>
          <input
            type="password"
            value={passwords.confirm_password}
            onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
            placeholder="Confirm new password"
            className="input"
          />
        </div>

        {passwordMsg && <p className="msg-success">✅ {passwordMsg}</p>}
        {passwordError && <p className="msg-error">❌ {passwordError}</p>}

        <button onClick={resetPassword} disabled={loading} className="btn btn-primary">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
}
