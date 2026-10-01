import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", company_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.email, form.company_name, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="card fade-in" style={{ width: "380px", maxWidth: "100%" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: "1.1rem", marginBottom: "1rem" }}>CD</div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-muted" style={{ fontSize: "0.88rem" }}>
            {isRegister ? "Start discovering the best candidates faster." : "Sign in to your HireIQ account."}
          </p>
        </div>

        {error && <div className="msg-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label className="field-label">Company name</label>
              <input
                type="text" required value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="input"
                placeholder="Acme Inc."
              />
            </div>
          )}
          <div className="field">
            <label className="field-label">Email</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="you@company.com"
            />
          </div>
          <div className="field" style={{ marginBottom: "1.4rem" }}>
            <label className="field-label">Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"} required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="••••••••"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-muted" style={{ marginTop: "1.25rem", fontSize: "0.88rem", textAlign: "center" }}>
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <span className="btn-link" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Sign in" : "Create account"}
          </span>
        </p>
      </div>
    </div>
  );
}
