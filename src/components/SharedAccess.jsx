import React, { useEffect, useMemo, useState } from "react";
import { authFetch, getApiBaseUrl, getAuthToken, getAuthUserId } from "../lib/api";
import { renderMessageContent } from "../lib/chatFormatting";
import { BackIcon } from "../lib/icons";

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

  const fetchShare = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/share/links/${token}/`, {
        credentials: "include",
      });
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
    } catch (err) {
      setError("Unable to load shared content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShare();
  }, [token]);

  const displayMembers = useMemo(() => {
    if (!members?.length) return [];
    return members;
  }, [members]);

  const handleSend = async () => {
    if (!input.trim() || !canCollaborate) return;
    setSaving(true);
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
      } else {
        setError(data?.detail || "Unable to send message.");
      }
    } catch (err) {
      setError("Unable to send message.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteDraft || !canCollaborate) return;
    setSaving(true);
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
    } catch (err) {
      setError("Unable to update note.");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteAction = async (action) => {
    if (!inviteId) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/invites/${inviteId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setInviteId(null);
        await fetchShare();
      }
    } catch {
      // ignore
    }
  };

  const handleSaveTask = async () => {
    if (!taskDraft || !canCollaborate) return;
    setSaving(true);
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
    } catch (err) {
      setError("Unable to update task.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!isOwner) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/members/${memberId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user?.id !== memberId));
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="panel-card" style={{ marginTop: "32px" }}>
        Loading shared content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-card" style={{ marginTop: "32px" }}>
        <p>{error}</p>
        {error.includes("login") && (
          <button className="button-secondary" onClick={() => onNavigate("account")}>
            Login
          </button>
        )}
        {permission === "invite" && inviteId && (
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button onClick={() => handleInviteAction("accept")}>Accept Invite</button>
            <button className="button-secondary" onClick={() => handleInviteAction("decline")}>
              Decline
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel-card" style={{ marginTop: "32px" }}>
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
                      style={{
                        marginLeft: "4px",
                        border: "none",
                        background: "transparent",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                      title="Remove"
                    >
                      x
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
                placeholder="Add a message..."
                rows={2}
                style={{ width: "100%", marginBottom: "12px" }}
              />
              <button onClick={handleSend} disabled={saving || !input.trim()}>
                Send
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
                  Save Changes
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
                  Save Changes
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}



