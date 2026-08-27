import React, { useEffect, useMemo, useState, useCallback } from "react";
import { authFetch, getApiBaseUrl, getAuthToken, getAuthUserId } from "../lib/api";
import { renderMessageContent } from "../lib/chatFormatting";
import { BackIcon } from "../lib/icons";
import LiveThrottleMessage from "./LiveThrottleMessage";

export default function SharedAccess({ token, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [permission, setPermission] = useState("read");
  const [messages, setMessages] = useState([]);
  const [note, setNote] = useState(null);
  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [inviteId, setInviteId] = useState(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [noteDraft, setNoteDraft] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const isAuthed = !!getAuthToken();
  const userId = getAuthUserId();
  const isOwner = owner && userId && owner.id === userId;

  const canCollaborate = permission === "collab" && isAuthed;

  const displayAuthor = (msg) => {
    if (msg.role !== "user") return "NotesAI-RNA AI";
    if (msg.user_id && userId && msg.user_id === userId) return "You";
    return msg.username || "User";
  };

  const fetchShare = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please login to access this shared item.");
        } else if (res.status === 403 && data?.invite) {
          setError("You have an invite. Accept to continue.");
          setPermission("invite");
          setResourceType(data?.resource_type || "");
          setNote(null);
          setTask(null);
          setMessages([]);
          setMembers([]);
          setOwner(null);
          setInviteId(data?.invite_id || null);
          setLoading(false);
          return;
        } else {
          setError(data?.detail || "Unable to load shared content.");
        }
        setLoading(false);
        return;
      }
      setResourceType(data.resource_type);
      setPermission(data.permission);
      setMembers(data.members || []);
      setOwner(data.owner || null);
      if (data.resource_type === "chat") {
        setMessages(data.messages || []);
      } else if (data.resource_type === "note") {
        setNote(data.note || null);
        setNoteDraft(data.note || null);
        setTask(null);
      } else {
        setTask(data.task || null);
        setTaskDraft(data.task || null);
        setNote(null);
      }
    } catch {
      setError("Unable to load shared content.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchShare(), 0);
    return () => window.clearTimeout(timer);
  }, [token, fetchShare]);

  const displayMembers = useMemo(() => {
    if (!members?.length) return [];
    return members;
  }, [members]);

  const handleSend = async () => {
    if (!input.trim() || !canCollaborate) return;
    setSaving(true);
    setActiveAction("send");
    setFeedback("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, mode: "general" }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setInput("");
        await fetchShare();
        setFeedback("Message sent successfully.");
      } else {
        setError(data?.detail || "Unable to send message.");
      }
    } catch {
      setError("Unable to send message.");
    } finally {
      setSaving(false);
      setActiveAction("");
    }
  };

  const handleSaveNote = async () => {
    if (!noteDraft || !canCollaborate) return;
    setSaving(true);
    setActiveAction("save-note");
    setFeedback("");
    setError("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/note/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteDraft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail || "Unable to update note.");
        return;
      }
      setNote(data.note || noteDraft);
      setNoteDraft(data.note || noteDraft);
      setFeedback("Note saved successfully.");
    } catch {
      setError("Unable to update note.");
    } finally {
      setSaving(false);
      setActiveAction("");
    }
  };

  const handleInviteAction = async (action) => {
    if (!inviteId) return;
    setSaving(true);
    setActiveAction(`invite-${action}`);
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/invites/${inviteId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setInviteId(null);
        await fetchShare();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detail || `Failed to ${action} invite.`);
      }
    } catch {
      setError(`Failed to ${action} invite. Please try again.`);
    } finally {
      setSaving(false);
      setActiveAction("");
    }
  };

  const handleSaveTask = async () => {
    if (!taskDraft || !canCollaborate) return;
    setSaving(true);
    setActiveAction("save-task");
    setFeedback("");
    setError("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/task/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskDraft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail || "Unable to update task.");
        return;
      }
      setTask(data.task || taskDraft);
      setTaskDraft(data.task || taskDraft);
      setFeedback("Task saved successfully.");
    } catch {
      setError("Unable to update task.");
    } finally {
      setSaving(false);
      setActiveAction("");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!isOwner) return;
    setSaving(true);
    setActiveAction(`remove-${memberId}`);
    setFeedback("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/members/${memberId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user?.id !== memberId));
        setFeedback("Collaborator removed.");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detail || "Unable to remove member.");
      }
    } catch {
      setError("Unable to remove member. Please try again.");
    } finally {
      setSaving(false);
      setActiveAction("");
    }
  };

  if (loading) {
    return (
      <div className="panel-card shared-loading-state" style={{ marginTop: "32px" }} role="status">
        <span className="loading-spinner" aria-hidden="true"><span className="spinner" /></span>
        <strong>Loading shared content...</strong>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-card" style={{ marginTop: "32px" }}>
        <p><LiveThrottleMessage message={error} /></p>
        {error.includes("login") && (
          <button className="button-secondary" onClick={() => onNavigate("account")}>
            Login
          </button>
        )}
        {permission === "invite" && inviteId && (
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button onClick={() => handleInviteAction("accept")} disabled={saving}>
              {activeAction === "invite-accept" ? "Accepting..." : "Accept Invite"}
            </button>
            <button className="button-secondary" onClick={() => handleInviteAction("decline")} disabled={saving}>
              {activeAction === "invite-decline" ? "Declining..." : "Decline"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel-card" style={{ marginTop: "32px" }}>
      {feedback && <p className="status-message success" role="status">{feedback}</p>}
      <div className="panel-header" style={{ alignItems: "flex-start" }}>
        <div>
          <button className="button-secondary" onClick={() => onNavigate("home")}>
            <BackIcon /> Back
          </button>
          <h1 className="panel-title" style={{ marginTop: "12px" }}>
            {resourceType === "chat" ? "Shared Chat" : resourceType === "task" ? "Shared Task" : "Shared Note"}
          </h1>
          {owner && (
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Shared by {owner.username}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Access: {permission === "collab" ? "Collaboration" : "Read-only"}
          </div>
          {displayMembers.length > 0 && (
            <div style={{ marginTop: "6px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {displayMembers.map((member) => (
                <span key={member.user?.id} style={{ marginRight: "8px" }}>
                  {member.user?.username}
                  {isOwner && member.user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      disabled={saving}
                      style={{
                        marginLeft: "4px",
                        border: "none",
                        background: "transparent",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                      title="Remove"
                    >
                      {activeAction === `remove-${member.user.id}` ? "..." : "x"}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {resourceType === "chat" ? (
        <>
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className="chat-message">
                <div className={`chat-message-icon ${msg.role === "user" ? "user" : "assistant"}`}>
                  {msg.role === "user" ? "U" : "AI"}
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-role">
                    {displayAuthor(msg)}
                  </div>
                  <div className="chat-message-text">
                    {msg.role === "assistant" ? renderMessageContent(msg.content || "") : msg.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {permission === "collab" && !isAuthed && (
            <div style={{ marginTop: "16px" }}>
              <button className="button-secondary" onClick={() => onNavigate("account")}>
                Login to collaborate
              </button>
            </div>
          )}
          {canCollaborate && (
            <div style={{ marginTop: "16px" }}>
              <textarea
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={saving}
                placeholder="Add a message..."
                rows={2}
                style={{ width: "100%", marginBottom: "12px" }}
              />
              <button onClick={handleSend} disabled={saving || !input.trim()}>
                {activeAction === "send" && <span className="small-spinner" aria-hidden="true" />}
                {activeAction === "send" ? " Sending..." : "Send"}
              </button>
            </div>
          )}
        </>
      ) : resourceType === "note" ? (
        <>
          {note && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {note?.last_edited_by?.username && (
                <div className="shared-meta">
                  Last edited by {note.last_edited_by.username}
                  {note.updated_at ? ` • ${new Date(note.updated_at).toLocaleString()}` : ""}
                </div>
              )}
              <input
                value={noteDraft?.title || ""}
                onChange={(e) => setNoteDraft((prev) => ({ ...prev, title: e.target.value }))}
                disabled={!canCollaborate}
              />
              <textarea
                value={noteDraft?.content || ""}
                onChange={(e) => setNoteDraft((prev) => ({ ...prev, content: e.target.value }))}
                disabled={!canCollaborate}
                rows={10}
              />
              {permission === "collab" && !isAuthed && (
                <button className="button-secondary" onClick={() => onNavigate("account")}>
                  Login to collaborate
                </button>
              )}
              {canCollaborate && (
                <button onClick={handleSaveNote} disabled={saving}>
                  {activeAction === "save-note" && <span className="small-spinner" aria-hidden="true" />}
                  {activeAction === "save-note" ? " Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {task && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input
                value={taskDraft?.title || ""}
                onChange={(e) => setTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
                disabled={!canCollaborate}
              />
              <textarea
                value={taskDraft?.description || ""}
                onChange={(e) => setTaskDraft((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!canCollaborate}
                rows={6}
              />
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <select
                  value={taskDraft?.priority || "medium"}
                  onChange={(e) => setTaskDraft((prev) => ({ ...prev, priority: e.target.value }))}
                  disabled={!canCollaborate}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={!!taskDraft?.is_completed}
                    onChange={(e) => setTaskDraft((prev) => ({ ...prev, is_completed: e.target.checked }))}
                    disabled={!canCollaborate}
                  />
                  Completed
                </label>
                <input
                  type="datetime-local"
                  value={
                    taskDraft?.due_date
                      ? new Date(new Date(taskDraft.due_date).getTime() - new Date(taskDraft.due_date).getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  disabled={!canCollaborate}
                />
              </div>
              {permission === "collab" && !isAuthed && (
                <button className="button-secondary" onClick={() => onNavigate("account")}>
                  Login to collaborate
                </button>
              )}
              {canCollaborate && (
                <button onClick={handleSaveTask} disabled={saving}>
                  {activeAction === "save-task" && <span className="small-spinner" aria-hidden="true" />}
                  {activeAction === "save-task" ? " Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}



