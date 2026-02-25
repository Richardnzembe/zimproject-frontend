import React, { useEffect, useState } from "react";
import { authFetch, clearTokens, getApiBaseUrl, getAuthToken } from "../lib/api";

export default function Navigation({ activeView, onViewChange }) {
  const token = getAuthToken();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!token) {
      setUsername("");
      return;
    }
    let active = true;
    const loadProfile = async () => {
      try {
        const res = await authFetch(`${getApiBaseUrl()}/api/auth/me/`);
        const data = await res.json().catch(() => null);
        if (active && res.ok) {
          setUsername(data?.username || "");
        }
      } catch {
        // ignore
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [token]);

  const handleLogout = () => {
    clearTokens();
    window.dispatchEvent(new Event("auth-changed"));
  };

  const navItems = [
    { id: "home", label: "Home" },
    { id: "notes", label: "Notes" },
    { id: "tasks", label: "Tasks" },
    { id: "ai", label: "REE AI", primary: true },
    { id: "shares", label: "Shares" },
    { id: "notifications", label: "Notifications" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="nav-bar">
      <div className="nav-section-label">Workspace</div>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-pill nav-pill-sidebar ${item.primary ? "nav-primary" : ""} ${activeView === item.id ? "active" : ""}`}
          onClick={() => onViewChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
      {token && (
        <div className="nav-account nav-account-sidebar">
          <div className="nav-section-label">Signed In</div>
          <div className="nav-signed nav-signed-sidebar">
            {username ? `@${username}` : "Authenticated user"}
          </div>
          <button
            className="nav-pill nav-pill-sidebar"
            onClick={() => onViewChange("account", { openAccountOptions: true })}
            type="button"
          >
            Account options
          </button>
          <button className="nav-pill nav-pill-sidebar nav-logout" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
