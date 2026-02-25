import React, { useEffect, useMemo, useState } from "react";
import { authFetch, getApiBaseUrl, getAuthToken } from "../lib/api";

const RESOURCE_LABELS = {
  chat: "AI Chat",
  note: "Note",
  task: "Task",
};

export default function ShareControlPanel() {
  const [shares, setShares] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const loadShares = async () => {
    const token = getAuthToken();
    if (!token) {
      setStatus("Please login to manage shares.");
      setShares([]);
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/`, { method: "GET" });
      const data = await safeJson(res);
      if (!res.ok) {
        setStatus(data?.detail || "Unable to load shares.");
        return;
      }
      setShares(Array.isArray(data) ? data : []);
    } catch {
      setStatus("Unable to load shares.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  const copyShareUrl = async (shareToken) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}?share=${shareToken}`);
      setStatus("Share link copied.");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("Unable to copy share link.");
    }
  };

  const inviteUser = async (shareToken) => {
    const username = window.prompt("Enter username to invite:");
    if (!username || !shareToken) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/invite/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setStatus(data?.detail || "Unable to send invite.");
        return;
      }
      setStatus("Invite sent.");
      setTimeout(() => setStatus(""), 2500);
      await loadShares();
    } catch {
      setStatus("Unable to send invite.");
    }
  };

  const removeMember = async (shareToken, userId) => {
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/members/${userId}/`, {
        method: "DELETE",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setStatus(data?.detail || "Unable to remove member.");
        return;
      }
      setShares((prev) =>
        prev.map((share) =>
          share.token === shareToken
            ? { ...share, members: (share.members || []).filter((m) => m.user?.id !== userId) }
            : share
        )
      );
      setStatus("Member removed.");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("Unable to remove member.");
    }
  };

  const revokeShare = async (shareToken) => {
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/revoke/`, {
        method: "POST",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setStatus(data?.detail || "Unable to revoke share link.");
        return;
      }
      setShares((prev) => prev.filter((share) => share.token !== shareToken));
      setStatus("Share link revoked.");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("Unable to revoke share link.");
    }
  };

  const visibleShares = useMemo(
    () =>
      shares.filter((share) => {
        if (filter === "all") return true;
        return share.resource_type === filter;
      }),
    [shares, filter]
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Collaboration Control Panel</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Resources</option>
            <option value="chat">AI Chat</option>
            <option value="note">Notes</option>
            <option value="task">Tasks</option>
          </select>
          <button className="button-secondary" onClick={loadShares} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {status && <p className="status-message info">{status}</p>}

      {visibleShares.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">Shares</div>
          <h3 className="empty-state-title">No share links found</h3>
          <p className="empty-state-text">Create share links from Notes, Tasks, or Smart Notes AI and manage them here.</p>
        </div>
      ) : (
        <div className="notes-list">
          {visibleShares.map((share) => (
            <div key={share.token} className="note-card">
              <div className="note-card-header">
                <h3 className="note-card-title">
                  {RESOURCE_LABELS[share.resource_type] || share.resource_type}
                </h3>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: "var(--primary-light)",
                    color: "var(--primary-color)",
                  }}
                >
                  {share.permission}
                </span>
              </div>

              <div className="note-card-meta">
                <span>Created {new Date(share.created_at).toLocaleString()}</span>
                {share.resource_type === "note" && share.note && <span>- Note #{share.note}</span>}
                {share.resource_type === "task" && share.task && <span>- Task #{share.task}</span>}
                {share.resource_type === "chat" && share.session_id && <span>- Session {share.session_id}</span>}
              </div>

              <div style={{ marginTop: "10px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Token: {share.token}
              </div>

              {(share.members || []).length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {share.members.map((member) => (
                    <span
                      key={`${share.token}-${member.user?.id}`}
                      className="tag"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {member.user?.username}
                      {member.user?.id && (
                        <button
                          className="button-secondary"
                          style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                          onClick={() => removeMember(share.token, member.user.id)}
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <div className="note-card-actions" style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button className="button-secondary" onClick={() => copyShareUrl(share.token)}>
                  Copy Link
                </button>
                <button className="button-secondary" onClick={() => inviteUser(share.token)}>
                  Add User
                </button>
                <button className="button-danger" onClick={() => revokeShare(share.token)}>
                  Revoke Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


