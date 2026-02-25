import { useEffect, useRef, useState } from "react";
import Notes from "./components/Notes";
import Tasks from "./components/Tasks";
import AIChat from "./components/AIChat";
import AuthPanel from "./components/AuthPanel";
import Navigation from "./components/Navigation";
import Home from "./components/Home";
import ThemeToggle from "./components/ThemeToggle";
import SharedAccess from "./components/SharedAccess";
import ShareControlPanel from "./components/ShareControlPanel";
import NotificationCenter from "./components/NotificationCenter";
import NotificationsPage from "./components/NotificationsPage";
import CookieBanner from "./components/CookieBanner";
import { initializeAuth, getAuthToken } from "./lib/api";
import "./styles.css";

function App() {
  const [activeView, setActiveView] = useState("home");
  const [accountOptionsTrigger, setAccountOptionsTrigger] = useState(0);
  const [authToken, setAuthToken] = useState(getAuthToken());
  const [shareToken, setShareToken] = useState(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [isDesktopNav, setIsDesktopNav] = useState(false);
  const navMenuRef = useRef(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateNavMode = (event) => {
      const desktop = event.matches;
      setIsDesktopNav(desktop);
      setNavMenuOpen(desktop);
    };

    updateNavMode(mediaQuery);
    mediaQuery.addEventListener("change", updateNavMode);
    return () => mediaQuery.removeEventListener("change", updateNavMode);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (isDesktopNav || !navMenuOpen || !navMenuRef.current) return;
      if (!navMenuRef.current.contains(event.target)) {
        setNavMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isDesktopNav, navMenuOpen]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape" && !isDesktopNav) {
        setNavMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    const onAuthChange = () => {
      const token = getAuthToken();
      setAuthToken((prev) => {
        if (!prev && token) {
          setActiveView("home");
        }
        if (prev && !token) {
          setActiveView("home");
        }
        return token;
      });
    };
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("share");
    if (token) {
      setShareToken(token);
      setActiveView("share");
    }
  }, []);

  const handleNavigate = (view, options = {}) => {
    setActiveView(view);
    if (!isDesktopNav) {
      setNavMenuOpen(false);
    }
    if (view === "account" && options.openAccountOptions) {
      setAccountOptionsTrigger((prev) => prev + 1);
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className={`app-shell ${isDesktopNav ? "has-desktop-nav" : ""}`}>
      {activeView === "ai" ? (
        <AIChat onNavigate={handleNavigate} />
      ) : activeView === "share" && shareToken ? (
        <SharedAccess token={shareToken} onNavigate={handleNavigate} />
      ) : (
        <>
          <div className="nav-layout">
            {!isDesktopNav && navMenuOpen && (
              <button
                className="nav-overlay"
                aria-label="Close navigation menu"
                type="button"
                onClick={() => setNavMenuOpen(false)}
              />
            )}
            <div className="nav-toggle-bar">
              <div className="nav-left">
                <button
                  className={`nav-menu-button ${navMenuOpen ? "open" : ""}`}
                  type="button"
                  onClick={() => setNavMenuOpen((prev) => !prev)}
                  aria-label={navMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={navMenuOpen}
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
                <div className="brand-block brand-compact">
                  <div className="brand-title">Smart Notes</div>
                </div>
              </div>
            </div>
            <div
              ref={navMenuRef}
              className={`nav-sidebar ${navMenuOpen ? "open" : ""} ${isDesktopNav ? "desktop" : "mobile"}`}
            >
              <div className="nav-menu-actions">
                <ThemeToggle compact />
                <NotificationCenter onNavigate={handleNavigate} />
              </div>
              <Navigation activeView={activeView} onViewChange={handleNavigate} />
            </div>
          </div>

          <main className="app-main">
            {activeView === "home" && (
              <Home onNavigate={handleNavigate} />
            )}

            {activeView === "account" && (
              <div className="panel-card">
                <div className="panel-header">
                  <button className="button-secondary" onClick={() => handleNavigate("home")}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M19 12H5M12 19l-7-7 7-7"></path>
                    </svg>
                    Back to Home
                  </button>
                  <h1 className="panel-title">Account Settings</h1>
                </div>
                <AuthPanel accountOptionsTrigger={accountOptionsTrigger} />
              </div>
            )}

            {activeView === "notes" && (
              <Notes onOpenAI={() => handleNavigate("ai")} />
            )}

            {activeView === "tasks" && (
              <Tasks />
            )}

            {activeView === "shares" && (
              <ShareControlPanel />
            )}

            {activeView === "notifications" && (
              <NotificationsPage onNavigate={handleNavigate} />
            )}
          </main>
        </>
      )}
      <CookieBanner />
    </div>
  );
}

export default App;

