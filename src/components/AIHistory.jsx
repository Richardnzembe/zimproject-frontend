import React, { useEffect, useState } from "react";
import { getApiBaseUrl, getAuthToken, getAuthUserId, authFetch } from "../lib/api";
import Charts from "./Charts";
import { getHistoryByUser, replaceUserHistory } from "../db";

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const AIHistory = () => {
  const [authToken, setAuthToken] = useState(getAuthToken());
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [expandedId, setExpandedId] = useState(null);
  const [chartTitle, setChartTitle] = useState("AI History Summary");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchHistory = async () => {
    const token = getAuthToken();
    if (!token) {
      setStatus("Please login to view history.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      if (!navigator.onLine) {
        const userId = getAuthUserId();
        const cached = userId ? await getHistoryByUser(userId) : [];
        const sorted = cached.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        setHistory(sorted);
        setStatus(sorted.length ? "Offline: showing cached history." : "No cached history.");
        setLoading(false);
        return;
      }

      const res = await authFetch(`${getApiBaseUrl()}/api/ai/history/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.detail || `Failed to load history (${res.status})`);
        setHistory([]);
      } else {
        const userId = getAuthUserId();
        const items = Array.isArray(data) ? data : [];
        const mapped = items.map((item) => ({
          ...item,
          local_id: `server-${item.id}`,
          server_id: item.id,
          user_id: userId,
        }));
        setHistory(mapped);
        if (userId) {
          await replaceUserHistory(userId, mapped);
        }
        if (!items.length) {
          setStatus("No history yet.");
        }
      }
    } catch (err) {
      console.error(err);
      const userId = getAuthUserId();
      const cached = userId ? await getHistoryByUser(userId) : [];
      const sorted = cached.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setHistory(sorted);
      setStatus(sorted.length ? "Offline: showing cached history." : "History request error");
    }

    setLoading(false);
  };

  const deleteAllHistory = async () => {
    const token = getAuthToken();
    if (!token) {
      setStatus("Please login to delete history.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/ai/history/delete-all/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus(data?.detail || `Failed to delete history (${res.status})`);
      } else {
        const userId = getAuthUserId();
        if (userId) {
          await replaceUserHistory(userId, []);
        }
        setHistory([]);
        setStatus("All history has been deleted.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error deleting history.");
    }

    setLoading(false);
  };

  const deleteHistoryItem = async (item) => {
    const token = getAuthToken();
    if (!token) {
      setStatus("Please login to delete history.");
      return;
    }

    setLoading(true);
    setDeleteConfirmId(null);
    setDropdownOpen(null);

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/ai/history/${item.id}/delete/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setStatus(data?.detail || `Failed to delete history item (${res.status})`);
      } else {
        const updatedHistory = history.filter((h) => h.id !== item.id);
        setHistory(updatedHistory);
        
        const userId = getAuthUserId();
        if (userId) {
          await replaceUserHistory(userId, updatedHistory);
        }
        setStatus("History item deleted.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error deleting history item.");
    }

    setLoading(false);
  };

  useEffect(() => {
    const onAuthChange = () => setAuthToken(getAuthToken());
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchHistory();
    } else {
      setHistory([]);
      setStatus("");
      setExpandedId(null);
    }
  }, [authToken]);

  const visibleHistory = history.slice(0, visibleCount);

  const getTitle = (item) => {
    const mode = item.mode || "general";
    const input = item.input_data || {};
    if (mode === "project") {
      return input.project_name || input.details || "Project help";
    }
    if (mode === "study") {
      return input.notes ? input.notes.slice(0, 80) : "Study help";
    }
    if (mode === "notes") {
      return input.note_content ? input.note_content.slice(0, 80) : "Notes help";
    }
    return input.question || "General help";
  };

  const getSubtitle = (item) => {
    const mode = item.mode || "general";
    const when = item.created_at ? new Date(item.created_at).toLocaleString() : "Unknown date";
    return `${mode.toUpperCase()} • ${when}`;
  };

  const getPreview = (item) => {
    const text = item.response_text || "";
    if (!text) return "No response yet.";
    return text.length > 140 ? `${text.slice(0, 140)}...` : text;
  };

  const startRename = (item, e) => {
    e.stopPropagation();
    setRenameId(item.id);
    setRenameValue(getTitle(item));
    setDropdownOpen(null);
  };

  const saveRename = (item, e) => {
    if (e) e.stopPropagation();
    setRenameId(null);
    setRenameValue("");
  };

  return (
    <div className="card dropdown-host">
      <h2>AI Chat History</h2>

      {!authToken ? (
        <p>Please login to view history.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button onClick={fetchHistory} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                setHistory([]);
                setStatus("");
              }}
              disabled={loading}
            >
              Clear view
            </button>
          </div>

          {status && <p className="status-message info">{status}</p>}

          <Charts 
            history={history} 
            title="History Summary" 
            customTitle={chartTitle} 
            onDeleteAll={deleteAllHistory} 
            showActions 
            onContinueChart={() => setStatus("You've opened this chart and are continuing with it.")}
            onTitleChange={(newTitle) => setChartTitle(newTitle)}
          />

          <div className="history-list">
            {visibleHistory.map((item) => (
              <div
                key={item.id}
                className="history-item clickable"
                onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              >
                <div className="history-meta">
                  <div>
                    {renameId === item.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={(e) => saveRename(item, e)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(item, e);
                          if (e.key === "Escape") { setRenameId(null); setRenameValue(""); }
                        }}
                        autoFocus
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 600,
                          padding: "4px 8px",
                          border: "1px solid var(--primary-color)",
                          borderRadius: "4px",
                          width: "100%",
                          maxWidth: "300px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="history-mode">{getTitle(item)}</span>
                    )}
                    <span className="history-date">{getSubtitle(item)}</span>
                  </div>
                  <div style={{ position: "relative" }}>
                    {dropdownOpen === item.id ? (
                      <div style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        background: "var(--surface-color)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-lg)",
                        zIndex: 100,
                        minWidth: "140px",
                        padding: "8px 0",
                      }}>
                        <button
                          className="dropdown-item"
                          onClick={(e) => startRename(item, e)}
                        >
                          <EditIcon /> Rename
                        </button>
                        <button
                          className="dropdown-item danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(item.id);
                            setDropdownOpen(null);
                          }}
                        >
                          <TrashIcon /> Delete
                        </button>
                      </div>
                    ) : null}
                    <button
                      className="button-ghost"
                      style={{ padding: "6px", minWidth: "32px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === item.id ? null : item.id);
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                </div>
                <div className="history-text">{getPreview(item)}</div>

                {expandedId === item.id && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    <div className="history-text" style={{ marginBottom: "8px" }}>
                      <strong>Input:</strong>{" "}
                      <span style={{ fontFamily: "monospace", fontSize: "0.8125rem", background: "var(--background-color)", padding: "2px 6px", borderRadius: "4px" }}>
                        {JSON.stringify(item.input_data)}
                      </span>
                    </div>
                    <div className="history-text">
                      <strong>Response:</strong>
                      <div style={{ whiteSpace: "pre-wrap", marginTop: "8px", padding: "12px", background: "var(--background-color)", borderRadius: "var(--radius-sm)" }}>
                        {item.response_text}
                      </div>
                    </div>
                  </div>
                )}

                {deleteConfirmId === item.id && (
                  <div style={{ marginTop: "12px", padding: "12px", background: "#fee2e2", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca" }}>
                    <p style={{ margin: "0 0 12px 0", color: "#991b1b", fontSize: "0.875rem" }}>
                      <strong>Warning:</strong> Delete this history item?
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="button-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item);
                        }}
                        style={{ padding: "6px 12px", fontSize: "0.8125rem" }}
                      >
                        Confirm
                      </button>
                      <button
                        className="button-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                        style={{ padding: "6px 12px", fontSize: "0.8125rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {history.length > visibleCount && (
            <button
              className="button-secondary"
              onClick={() => setVisibleCount((count) => count + 8)}
              disabled={loading}
              style={{ marginTop: "20px" }}
            >
              Show more
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default AIHistory;
