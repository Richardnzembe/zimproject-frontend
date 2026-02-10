import React, { useEffect, useMemo, useState } from "react";
import { authFetch, getApiBaseUrl, getAuthToken } from "../lib/api";

const Home = ({ onNavigate }) => {
  const motivationTips = useMemo(
    () => [
      "Small steps every day build unstoppable momentum.",
      "Progress over perfection. Show up and improve.",
      "Focus on one concept at a time and master it.",
      "Your future self will thank you for today’s effort.",
      "Consistency beats cramming every time.",
      "Study smart: clarify, practice, repeat.",
    ],
    []
  );

  const studyTips = useMemo(
    () => [
      "Use the Pomodoro method: 25 minutes focus, 5 minutes break.",
      "Teach the topic aloud to check your understanding.",
      "Turn headings into questions before reading.",
      "Summarize each section in 2–3 bullet points.",
      "Do practice questions before re-reading notes.",
      "Review notes within 24 hours to improve retention.",
    ],
    []
  );

  const [motivation, setMotivation] = useState(motivationTips[0]);
  const [studyTip, setStudyTip] = useState(studyTips[0]);
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    const loadInvites = async () => {
      const token = getAuthToken();
      if (!token) {
        setInvites([]);
        return;
      }
      try {
        const res = await authFetch(`${getApiBaseUrl()}/api/share/invites/`);
        const data = await res.json().catch(() => []);
        if (res.ok) {
          setInvites(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      }
    };
    loadInvites();
  }, []);

  useEffect(() => {
    const pickRandom = (items, current) => {
      if (items.length === 1) return items[0];
      let next = current;
      while (next === current) {
        next = items[Math.floor(Math.random() * items.length)];
      }
      return next;
    };

    const interval = setInterval(() => {
      setMotivation((prev) => pickRandom(motivationTips, prev));
      setStudyTip((prev) => pickRandom(studyTips, prev));
    }, 12000);

    return () => clearInterval(interval);
  }, [motivationTips, studyTips]);
  return (
    <div className="home-layout">
      {invites.length > 0 && (
        <div className="status-message info" style={{ marginBottom: "12px" }}>
          You have {invites.length} shared item{invites.length > 1 ? "s" : ""}. Go to your Account to accept.
        </div>
      )}
      <section className="hero-card">
        <div className="hero-content">
          <p className="hero-eyebrow">Welcome back</p>
          <h1 className="hero-title">Study smarter with REE Study Helper</h1>
          <p className="hero-subtitle">
            Your intelligent companion for academic success. Organize notes,
            collaborate with AI, and boost your learning experience.
          </p>
          <div className="hero-actions">
            <button className="button-primary" onClick={() => onNavigate("notes")}>
              View Notes
            </button>
            <button className="button-secondary" onClick={() => onNavigate("ai")}>
              REE AI
            </button>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>Organized</strong>
              <span>Quick filters and tags</span>
            </div>
            <div>
              <strong>Powered</strong>
              <span>AI summaries on demand</span>
            </div>
            <div>
              <strong>Secure</strong>
              <span>Private study workspace</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-panel">
            <div className="hero-panel-header">
              <span className="hero-dot"></span>
              <span className="hero-dot"></span>
              <span className="hero-dot"></span>
            </div>
            <div className="hero-panel-body">
              <div className="hero-panel-title">Today&#39;s Focus</div>
              <div className="hero-panel-card">
                <div className="hero-panel-tag">Motivation</div>
                <p>{motivation}</p>
              </div>
              <div className="hero-panel-card subtle">
                <div className="hero-panel-tag alt">Study Tip</div>
                <p>{studyTip}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <h3>Smart Notes</h3>
          <p>Organize your study materials with categories, priorities, and advanced search.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon alt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="4"></rect>
              <path d="M12 8v8"></path>
              <path d="M8 12h8"></path>
            </svg>
          </div>
          <h3>REE AI Assistant</h3>
          <p>Get instant help with homework, coding, and complex reasoning from REE AI.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
          </div>
          <h3>Chat History</h3>
          <p>Never lose a conversation. Access your complete chat history at any time.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
