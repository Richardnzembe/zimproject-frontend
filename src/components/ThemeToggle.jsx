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

export default function ThemeToggle({ compact = false }) {
  const [themeMode, setThemeMode] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const cycleTheme = () => {
    setThemeMode((prev) => {
      if (prev === "system") return "light";
      if (prev === "light") return "dark";
      return "system";
    });
  };

  const label = `Theme: ${themeMode.charAt(0).toUpperCase()}${themeMode.slice(1)}`;

  return (
    <button
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={cycleTheme}
      title="Cycle theme"
      type="button"
    >
      {label}
    </button>
  );
}
