import React, { useEffect, useMemo, useState } from "react";
import { authFetch, getApiBaseUrl, getAuthToken, getAuthUserId } from "../lib/api";

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M19 12H5M12 19l-7-7 7-7"></path>
  </svg>
);

const renderInline = (text) => {
  const parts = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

const renderMessageContent = (text) => {
  const lines = text.split("\n");
  const blocks = [];
  let paragraph = [];
  let listBuffer = [];
  let listType = null;

  const normalizeLine = (value) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const labelMatch = cleaned.match(/^(Guiding Question|Explanation|Summary|Key Point|Conclusion):\s*/i);
    if (labelMatch) {
      const label = labelMatch[1];
      return `**${label}:** ${cleaned.slice(labelMatch[0].length)}`;
    }
    return cleaned;
  };

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", lines: [...paragraph] });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: listType, items: [...listBuffer] });
      listBuffer = [];
      listType = null;
    }
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    if (line.length <= 3 && !/[a-z0-9]/i.test(line)) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "h",
        level: headingMatch[1].length,
        text: normalizeLine(headingMatch[2]),
      });
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+/);
    const bulletMatch = line.match(/^[-*]\s+/);

    if (orderedMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listBuffer.push(normalizeLine(line.replace(/^\d+\.\s+/, "")));
      return;
    }

    if (bulletMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listBuffer.push(normalizeLine(line.replace(/^[-*]\s+/, "")));
      return;
    }

    flushList();
    paragraph.push(normalizeLine(line));
  });

  flushParagraph();
  flushList();

  return (
    <div className="chat-format">
      {blocks.map((block, idx) => {
        if (block.type === "h") {
          const Tag = `h${Math.min(Math.max(block.level, 2), 4)}`;
          return <Tag key={`h-${idx}`}>{renderInline(block.text)}</Tag>;
        }
        if (block.type === "p") {
          return (
            <p key={`p-${idx}`}>
              {renderInline(block.lines.join(" "))}
            </p>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={`ol-${idx}`}>
              {block.items.map((item, i) => (
                <li key={`oli-${i}`}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={`ul-${idx}`}>
            {block.items.map((item, i) => (
              <li key={`uli-${i}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
};

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

  const fetchShare = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {};
      const auth = getAuthToken();
      if (auth) {
        headers.Authorization = `Bearer ${auth}`;
      }
      const res = await fetch(`${getApiBaseUrl()}/api/share/links/${token}/`, { headers });
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
                    {msg.role === "user" ? msg.username || "User" : "REE AI"}
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
