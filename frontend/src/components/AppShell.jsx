import { useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";
import Icon from "./Icon";

export function Brand({ light = true }) {
  return (
    <Link to="/" className="brand" aria-label="HireIQ home">
      <span className="brand-mark"><Icon name="target" size={18} strokeWidth={2.2} className="" /></span>
      <span>Hire<em>IQ</em></span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/profile", label: "Settings", icon: "settings" },
];

export default function AppShell({ children }) {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.get("/auth/profile").then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const name = profile?.company_name || "Your company";
  const initials = (profile?.company_name?.[0] || profile?.email?.[0] || "?").toUpperCase();

  return (
    <div className="shell">
      <div className={"scrim" + (open ? " open" : "")} onClick={() => setOpen(false)} />
      <aside className={"sidebar" + (open ? " open" : "")}>
        <Brand />
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <Icon name={n.icon} size={19} className="" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="user-chip">
          <div className="avatar">{initials}</div>
          <div className="user-chip-text">
            <div className="user-chip-name">{name}</div>
            <div className="user-chip-sub">{profile?.email || "Recruiter"}</div>
          </div>
          <button className="icon-btn-dark" onClick={logout} title="Log out" aria-label="Log out">
            <Icon name="logout" size={17} className="" />
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="mobile-bar">
          <button className="icon-btn-dark" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" size={22} className="" /></button>
          <strong style={{ letterSpacing: "-0.02em" }}>HireIQ</strong>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
