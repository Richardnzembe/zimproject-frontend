import React, { useEffect, useState } from "react";

const getInitialTheme = () => {
  const saved = localStorage.getItem("theme-mode");
  return saved || "system";
};

const applyTheme = (mode) => {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("theme-mode");
    return;
  }
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("theme-mode", mode);
};

export default function ThemeToggle({ compact = false, iconOnly = false }) {
  const [themeMode, setThemeMode] = useState(getInitialTheme);
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => {
      setSystemDark(event.matches);
    };
    setSystemDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  const cycleTheme = () => {
    setThemeMode((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  };

  const resolvedTheme = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;
  const label = `Theme: ${themeMode.charAt(0).toUpperCase()}${themeMode.slice(1)}`;
  const isDarkIcon = resolvedTheme === "dark";

  return (
    <button
      className={`theme-toggle ${compact ? "compact" : ""} ${iconOnly ? "icon-only" : ""}`}
      onClick={cycleTheme}
      title={`${label} (click to cycle)`}
      aria-label={`${label} (click to cycle)`}
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
      {!iconOnly && <span className="theme-toggle-label">{label}</span>}
    </button>
  );
}
