import React, { useEffect, useState } from "react";
import { authFetch, clearTokens, getApiBaseUrl, getAuthToken } from "../lib/api";

export default function Navigation({ activeView, onViewChange }) {
  const token = getAuthToken();
  const [username, setUsername] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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
    setMenuOpen(false);
  };

  const handleAccountClick = () => {
    if (!token) {
      onViewChange("account");
      return;
    }
    setMenuOpen((prev) => !prev);
  };

  return (
    <>
      <div className="nav-bar">
        <button
          className={`nav-pill ${activeView === "home" ? "active" : ""}`}
          onClick={() => onViewChange("home")}
        >
          Home
        </button>
        <button
          className={`nav-pill ${activeView === "notes" ? "active" : ""}`}
          onClick={() => onViewChange("notes")}
        >
          Notes
        </button>
        <button
          className={`nav-pill nav-primary ${activeView === "ai" ? "active" : ""}`}
          onClick={() => onViewChange("ai")}
        >
          REE AI
        </button>
        <div className="nav-account">
          <button
            className={`nav-pill ${activeView === "account" ? "active" : ""}`}
            onClick={handleAccountClick}
          >
            Account
          </button>
          {token && (
            <span className="nav-signed">
              {username ? `Signed in as ${username}` : "Signed in"}
            </span>
          )}
          {token && menuOpen && (
            <div className="nav-dropdown">
              <button
                className="button-secondary"
                onClick={() => {
                  setMenuOpen(false);
                  onViewChange("account", { openAccountOptions: true });
                }}
              >
                Account options
              </button>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
