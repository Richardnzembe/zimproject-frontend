import React, { useEffect, useRef, useState } from "react";
import { authFetch, clearTokens, getApiBaseUrl, getAuthToken } from "../lib/api";

export default function Navigation({ activeView, onViewChange }) {
  const token = getAuthToken();
  const [username, setUsername] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

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
    setAccountOpen(false);
  };

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleAccountClick = () => {
    if (!token) {
      onViewChange("account");
      return;
    }
    setAccountOpen((prev) => !prev);
  };

  const navItems = [
    { id: "home", label: "Home" },
    { id: "notes", label: "Notes" },
    { id: "tasks", label: "Tasks" },
    { id: "ai", label: "Notex AI", primary: true },
    { id: "shares", label: "Shares" },
    { id: "notifications", label: "Notifications" },
    { id: "account", label: "Account" },
  ];

  return (
    <nav className="top-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`top-nav-link ${activeView === item.id ? "active" : ""} ${item.primary ? "primary" : ""}`}
          onClick={() => onViewChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
      <div className="top-nav-account" ref={accountRef}>
        <button
          className={`top-nav-link ${activeView === "account" ? "active" : ""}`}
          onClick={handleAccountClick}
          type="button"
          aria-expanded={accountOpen}
        >
          {token && username ? `@${username}` : "Account"}
        </button>
        {token && accountOpen && (
          <div className="top-nav-dropdown">
            <button
              className="button-secondary"
              onClick={() => {
                setAccountOpen(false);
                onViewChange("account", { openAccountOptions: true });
              }}
              type="button"
            >
              Account options
            </button>
            <button className="button-secondary" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        )}
      </div>
      {token && !username && (
        <div className="top-nav-userhint">
          Signed in
        </div>
      )}
    </nav>
  );
}


