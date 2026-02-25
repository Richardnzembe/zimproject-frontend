import React, { useEffect, useState } from "react";
import { getCookie, setCookie } from "../lib/cookies";

const THEME_KEY = "theme-mode";
const THEME_COOKIE = "smart_notes_theme";

const getInitialTheme = () => {
  const saved = localStorage.getItem(THEME_KEY) || getCookie(THEME_COOKIE);
  if (saved === "dark" || saved === "light") return saved;
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

const applyTheme = (mode) => {
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem(THEME_KEY, mode);
  setCookie(THEME_COOKIE, mode, { days: 180, sameSite: "Lax" });
};

export default function ThemeToggle({ compact = false, iconOnly = true }) {
  const [themeMode, setThemeMode] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDarkIcon = themeMode === "dark";
  const actionLabel = isDarkIcon ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      className={`theme-toggle ${compact ? "compact" : ""} ${iconOnly ? "icon-only" : ""}`}
      onClick={toggleTheme}
      title={actionLabel}
      aria-label={actionLabel}
      type="button"
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDarkIcon ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 12.79A9 9 0 1 1 11.21 3c0 0 0 0 0 0A7 7 0 0 0 21 12.79z"></path>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
          </svg>
        )}
      </span>
      {!iconOnly && <span className="theme-toggle-label">{isDarkIcon ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}
