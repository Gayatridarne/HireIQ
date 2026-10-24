import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { errorMessage } from "../api/client";
import Icon from "../components/Icon";
import ScoreRing from "../components/ScoreRing";

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
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-side">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark"><Icon name="target" size={18} strokeWidth={2.2} className="" /></span>
          <span>Hire<em>IQ</em></span>
        </div>
        <div className="auth-pitch">
          <h2>Find the right candidate in minutes, not days.</h2>
          <p>Upload a stack of resumes, and HireIQ ranks every candidate against your job description, with the reasons behind each score.</p>
        </div>
        <div className="auth-mini">
          <ScoreRing value={92} size={64} stroke={7} fontSize={16} track="rgba(255,255,255,0.14)" valueColor="#fff" />
          <div>
            <b>Strong match</b>
            <span>Skills, experience and domain scored for every resume</span>
          </div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-card fade-in">
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted" style={{ marginBottom: "1.6rem" }}>
            {isRegister ? "Start screening candidates faster." : "Sign in to your HireIQ account."}
          </p>

          {error && <div className="msg-error"><Icon name="alert" size={16} className="" /> {error}</div>}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="field">
                <label className="field-label" htmlFor="company">Company name</label>
                <input id="company" type="text" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input" placeholder="Acme Inc." />
              </div>
            )}
            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="you@company.com" />
            </div>
            <div className="field" style={{ marginBottom: "1.4rem" }}>
              <label className="field-label" htmlFor="password">Password</label>
              <div className="password-field">
                <input id="password" type={showPassword ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder="••••••••" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={18} className="" />
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
              {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-muted" style={{ marginTop: "1.25rem", fontSize: "0.88rem", textAlign: "center" }}>
            {isRegister ? "Already have an account?" : "New here?"}{" "}
            <button type="button" className="btn-link" onClick={() => { setIsRegister(!isRegister); setError(""); }}>
              {isRegister ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
