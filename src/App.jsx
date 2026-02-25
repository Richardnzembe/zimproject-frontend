import { useEffect, useState } from "react";
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

  useEffect(() => {
    initializeAuth();
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
    if (view === "account" && options.openAccountOptions) {
      setAccountOptionsTrigger((prev) => prev + 1);
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="app-shell">
      {activeView === "ai" ? (
        <AIChat onNavigate={handleNavigate} />
      ) : activeView === "share" && shareToken ? (
        <SharedAccess token={shareToken} onNavigate={handleNavigate} />
      ) : (
        <>
          <header className="app-topbar">
            <div className="topbar-main">
              <div className="brand-block brand-compact">
                <div className="brand-title">Notex</div>
              </div>
              <div className="topbar-actions">
                <ThemeToggle compact iconOnly />
                <NotificationCenter onNavigate={handleNavigate} />
              </div>
            </div>
            <div className="topbar-nav-wrap">
              <Navigation activeView={activeView} onViewChange={handleNavigate} />
            </div>
          </header>

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


