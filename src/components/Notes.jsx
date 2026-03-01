import React, { useEffect, useState } from "react";
import ImageToText from "./ImageToText";
import { getApiBaseUrl, getAuthToken, getAuthUserId, authFetch } from "../lib/api";
import {
  getNotesByUser,
  replaceUserNotes,
  upsertNotes,
  deleteLocalNote,
  upsertHistoryItems,
} from "../db";

const SummarizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <line x1="21" y1="10" x2="3" y2="10"></line>
    <line x1="21" y1="6" x2="3" y2="6"></line>
    <line x1="21" y1="14" x2="3" y2="14"></line>
    <line x1="21" y1="18" x2="3" y2="18"></line>
  </svg>
);

const ExplainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const Notes = ({ onOpenAI }) => {
  const [notes, setNotes] = useState([]);
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [aiResult, setAIResult] = useState("");
  const [aiLoading, setAILoading] = useState(false);
  const [aiNoteId, setAINoteId] = useState(null);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [shareInfo, setShareInfo] = useState([]);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    category: "Study Notes",
    tags: "",
    content: "",
  });

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const normalizeTags = (tags) => {
    if (Array.isArray(tags)) return tags;
    if (!tags) return [];
    if (typeof tags === "string") {
      return tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  };

  const sortNotes = (items) =>
    [...items].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

  const buildLocalFromServer = (item, userId) => ({
    local_id: `server-${item.id}`,
    server_id: item.id,
    client_id: item.client_id || null,
    user_id: userId,
    title: item.title,
    subject: item.subject,
    category: item.category,
    tags: normalizeTags(item.tags),
    content: item.content,
    created_at: item.created_at,
    updated_at: item.created_at,
    sync_status: "synced",
    pending_action: null,
  });

  const loadLocalNotes = async () => {
    const userId = getAuthUserId();
    if (!userId) return [];
    const local = await getNotesByUser(userId);
    const normalized = local.map((note) => ({
      ...note,
      tags: normalizeTags(note.tags),
    }));
    setNotes(sortNotes(normalized));
    return normalized;
  };

  const mergeServerNotes = async (serverNotes) => {
    const userId = getAuthUserId();
    if (!userId) return;
    const local = await getNotesByUser(userId);
    const pending = local.filter((n) => n.sync_status !== "synced");
    const pendingByServerId = new Map(
      pending.filter((n) => n.server_id).map((n) => [n.server_id, n])
    );
    const pendingByClientId = new Map(
      pending.filter((n) => n.client_id).map((n) => [n.client_id, n])
    );

    const merged = [...pending];
    for (const item of serverNotes) {
      if (pendingByServerId.has(item.id)) continue;
      if (item.client_id && pendingByClientId.has(item.client_id)) continue;
      merged.push(buildLocalFromServer(item, userId));
    }

    await replaceUserNotes(userId, merged);
    setNotes(sortNotes(merged));
  };

  const loadApiNotes = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    setStatus("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/notes/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setStatus(data?.detail || `Failed to load notes (${res.status})`);
        return;
      }
      await mergeServerNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load notes");
    } finally {
      setSyncing(false);
    }
  };

  const fetchShareLinks = async (noteId) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await authFetch(
        `${getApiBaseUrl()}/api/share/links/?resource_type=note&note_id=${noteId}`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) return;
      setShareInfo(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  const createShareLink = async (permission, noteId) => {
    if (!noteId) {
      setShareStatus("Please sync the note before sharing.");
      return;
    }
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "note",
          note_id: noteId,
          permission,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to create share link.");
        return;
      }
      setShareInfo((prev) => [
        ...prev.filter((s) => s.permission !== permission),
        data,
      ]);
      const url = `${window.location.origin}?share=${data.token}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("Share link copied.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to create share link.");
    }
  };

  const inviteUserToShare = async (token) => {
    const username = window.prompt("Enter username to invite:");
    if (!username || !token) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/invite/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to send invite.");
        return;
      }
      setShareStatus("Invite sent.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to send invite.");
    }
  };

  const removeMemberFromShare = async (token, userId) => {
    if (!token || !userId) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/members/${userId}/`, {
        method: "DELETE",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to remove member.");
        return;
      }
      setShareInfo((prev) =>
        prev.map((share) =>
          share.token === token
            ? { ...share, members: (share.members || []).filter((m) => m.user?.id !== userId) }
            : share
        )
      );
      setShareStatus("Member removed.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to remove member.");
    }
  };

  const revokeShareLink = async (token) => {
    if (!token) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${token}/revoke/`, {
        method: "POST",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to revoke share link.");
        return;
      }
      setShareInfo((prev) => prev.filter((share) => share.token !== token));
      setShareStatus("Share link revoked.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to revoke share link.");
    }
  };

  const syncPendingNotes = async () => {
    if (!navigator.onLine) return;
    const userId = getAuthUserId();
    if (!userId) return;

    const local = await getNotesByUser(userId);
    const pending = local.filter((n) => n.sync_status !== "synced");
    if (!pending.length) return;

    setSyncing(true);

    for (const note of pending) {
      const payload = {
        title: note.title,
        subject: note.subject,
        category: note.category,
        tags: normalizeTags(note.tags),
        content: note.content,
        client_id: note.client_id,
      };

      try {
        if (note.pending_action === "delete") {
          if (note.server_id) {
            const res = await authFetch(`${getApiBaseUrl()}/api/notes/${note.server_id}/`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
            if (res.ok || res.status === 204) {
              await deleteLocalNote(note.local_id);
            }
          } else {
            await deleteLocalNote(note.local_id);
          }
          continue;
        }

        if (note.server_id) {
          const res = await authFetch(`${getApiBaseUrl()}/api/notes/${note.server_id}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await safeJson(res);
          if (res.ok && data?.id) {
            await upsertNotes([
              {
                ...note,
                server_id: data.id,
                client_id: data.client_id || note.client_id,
                created_at: data.created_at || note.created_at,
                updated_at: new Date().toISOString(),
                sync_status: "synced",
                pending_action: null,
              },
            ]);
          }
          continue;
        }

        const res = await authFetch(`${getApiBaseUrl()}/api/notes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await safeJson(res);
        if (res.ok && data?.id) {
          await upsertNotes([
            {
              ...note,
              server_id: data.id,
              client_id: data.client_id || note.client_id,
              created_at: data.created_at || note.created_at,
              updated_at: new Date().toISOString(),
              sync_status: "synced",
              pending_action: null,
            },
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    const updated = await getNotesByUser(userId);
    setNotes(sortNotes(updated));
    setSyncing(false);
  };

  useEffect(() => {
    const initialize = async () => {
      const token = getAuthToken();
      if (!token) {
        setNotes([]);
        setStatus("Please login to use notes.");
        return;
      }

      await loadLocalNotes();
      await loadApiNotes();
      await syncPendingNotes();
    };

    initialize();
  }, []);

  useEffect(() => {
    const onAuthChange = async () => {
      const token = getAuthToken();
      if (token) {
        setStatus("");
        await loadLocalNotes();
        await loadApiNotes();
        await syncPendingNotes();
      } else {
        setNotes([]);
        setStatus("Please login to use notes.");
      }
    };
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      syncPendingNotes();
      loadApiNotes();
    };
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingNotes();
      }
    }, 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeNote?.server_id) {
      fetchShareLinks(activeNote.server_id);
    } else {
      setShareInfo([]);
    }
  }, [activeNote?.server_id]);

  useEffect(() => {
    const closeMenus = () => {
      setOpenActionMenuId(null);
      setShareMenuOpen(false);
    };
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  const insertExtractedText = (text) => {
    setForm((prev) => ({
      ...prev,
      content: prev.content + (prev.content ? "\n\n" : "") + text,
    }));
  };

  const saveNote = async () => {
    if (!form.title || !form.content) return;

    const token = getAuthToken();
    const userId = getAuthUserId();
    if (!token || !userId) {
      setStatus("Please login to save notes.");
      return;
    }

    const now = new Date().toISOString();
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let localNote = null;
    if (editingId) {
      const existing = notes.find((note) => note.local_id === editingId);
      if (!existing) return;
      localNote = {
        ...existing,
        title: form.title,
        subject: form.subject,
        category: form.category,
        tags,
        content: form.content,
        updated_at: now,
        sync_status: "pending",
        pending_action: existing.server_id ? "update" : "create",
      };
    } else {
      localNote = {
        local_id: crypto.randomUUID(),
        client_id: crypto.randomUUID(),
        server_id: null,
        user_id: userId,
        title: form.title,
        subject: form.subject,
        category: form.category,
        tags,
        content: form.content,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
        pending_action: "create",
      };
    }

    await upsertNotes([localNote]);
    const updated = await getNotesByUser(userId);
    setNotes(sortNotes(updated));

    setEditingId(null);
    setForm({
      title: "",
      subject: "",
      category: "Study Notes",
      tags: "",
      content: "",
    });

    await syncPendingNotes();
  };

  const editNote = (note) => {
    setEditingId(note.local_id);
    setForm({
      title: note.title,
      subject: note.subject,
      category: note.category,
      tags: normalizeTags(note.tags).join(", "),
      content: note.content,
    });
  };

  const deleteNote = async (localId) => {
    const token = getAuthToken();
    const userId = getAuthUserId();
    if (!token || !userId) {
      setStatus("Please login to delete notes.");
      return;
    }

    const target = notes.find((note) => note.local_id === localId);
    if (!target) return;

    if (target.server_id) {
      await upsertNotes([
        {
          ...target,
          sync_status: "pending",
          pending_action: "delete",
          updated_at: new Date().toISOString(),
        },
      ]);
    } else {
      await deleteLocalNote(localId);
    }

    const updated = await getNotesByUser(userId);
    setNotes(sortNotes(updated));

    await syncPendingNotes();
  };

  const askAI = async (action, note) => {
    const token = getAuthToken();
    if (!token) {
      setAIResult("Please login first.");
      setAINoteId(note.local_id);
      return;
    }

    setAILoading(true);
    setAIResult("");
    setAINoteId(note.local_id);

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/ai/notes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note_content: note.content, action }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorText = data?.error || data?.detail || `AI request failed (${res.status})`;
        const requestMessage = data?.request_message ? `${data.request_message}\n\n` : "";
        setAIResult(`${requestMessage}${errorText}`);
      } else {
        const responseText = data.updated_note || "No response from AI.";
        const requestMessage = data?.request_message ? `${data.request_message}\n\n` : "";
        setAIResult(`${requestMessage}${responseText}`);
        const userId = getAuthUserId();
        if (userId) {
          await upsertHistoryItems([
            {
              local_id: crypto.randomUUID(),
              user_id: userId,
              mode: "notes",
              input_data: { note_content: note.content, action },
              response_text: responseText,
              created_at: new Date().toISOString(),
              local_only: true,
            },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      setAIResult("Error contacting AI");
    }

    setAILoading(false);
  };

  const visibleNotes = notes.filter(
    (note) =>
      note.pending_action !== "delete" &&
      (note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase())) &&
      (filterSubject === "" || note.subject === filterSubject)
  );

  const uniqueSubjects = [...new Set(notes.map((note) => note.subject).filter(Boolean))].sort();
  const currentShare =
    shareInfo.find((s) => s.permission === "collab") || shareInfo[0];
  const currentMembers = currentShare?.members || [];

  return (
    <div className="card dropdown-host">
      <div className="card-header">
        <h2 className="card-title">
          {editingId ? "Edit Note" : "My Notes"}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {syncing && (
            <div className="sync-indicator syncing">
              <span className="sync-dot"></span>
              Syncing...
            </div>
          )}
          <button
            onClick={() => onOpenAI && onOpenAI()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="2" y="2" width="20" height="20" rx="2"></rect>
              <path d="M12 8v8"></path>
              <path d="M8 12h8"></path>
            </svg>
            Notex AI
          </button>
        </div>
      </div>

      {status && <p className="status-message info">{status}</p>}

      <div className="search-filter-container">
        <input
          type="search"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
        >
          <option value="">All Subjects</option>
          {uniqueSubjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <div className="notes-form">
        <h3 style={{ marginBottom: "16px" }}>
          {editingId ? "Update Note" : "Create New Note"}
        </h3>
        
        <div className="form-row">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div className="form-row" style={{ marginTop: "12px" }}>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>Study Notes</option>
            <option>Project</option>
            <option>Research</option>
            <option>Exam Prep</option>
          </select>
          
          <input
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>

        <textarea
          placeholder="Write your note content here..."
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          style={{ minHeight: "150px", marginTop: "12px" }}
        />

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "16px" }}>
          <button onClick={saveNote}>
            {editingId ? "Update Note" : "Save Note"}
          </button>
          
          {editingId && (
            <button 
              className="button-secondary"
              onClick={() => {
                setEditingId(null);
                setForm({
                  title: "",
                  subject: "",
                  category: "Study Notes",
                  tags: "",
                  content: "",
                });
              }}
            >
              Cancel
            </button>
          )}
          
          <ImageToText onExtract={insertExtractedText} />
        </div>
      </div>

      <div className="notes-list">
        {visibleNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">Notes</div>
            <h3 className="empty-state-title">No notes yet</h3>
            <p className="empty-state-text">
              Create your first note above or import text from an image.
            </p>
          </div>
        ) : (
          visibleNotes.map((note) => (
            <div
              key={note.local_id}
              className="note-card"
              onClick={() => {
                setOpenActionMenuId(null);
                setActiveNote(note);
              }}
            >
              <div className="note-card-header">
                <h3 className="note-card-title">{note.title}</h3>
                <span style={{ 
                  fontSize: "0.75rem", 
                  padding: "4px 8px", 
                  background: "var(--primary-light)", 
                  color: "var(--primary-color)", 
                  borderRadius: "4px" 
                }}>
                  {note.category}
                </span>
              </div>
              
              <div className="note-card-meta">
                {note.subject && <span>{note.subject}</span>}
                <span>-</span>
                <span>
                  {note.created_at 
                    ? new Date(note.created_at).toLocaleDateString() 
                    : ""}
                </span>
              </div>

              <p className="note-card-preview">
                {note.content.slice(0, 150)}
                {note.content.length > 150 && "..."}
              </p>

              {normalizeTags(note.tags).length > 0 && (
                <div className="tags">
                  {normalizeTags(note.tags).slice(0, 5).map((t, i) => (
                    <span key={i} className="tag">#{t}</span>
                  ))}
                  {normalizeTags(note.tags).length > 5 && (
                    <span className="tag">+{normalizeTags(note.tags).length - 5}</span>
                  )}
                </div>
              )}

              <div 
                className="note-card-actions" 
                onClick={(e) => e.stopPropagation()}
                style={{ display: "flex", gap: "8px" }}
              >
                <div
                  className={`dropdown ${openActionMenuId === note.local_id ? "open" : ""}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="button-secondary actions-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenActionMenuId((prev) => (prev === note.local_id ? null : note.local_id));
                    }}
                    style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  >
                    Actions
                  </button>
                  <div className="dropdown-menu note-actions-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        editNote(note);
                        setOpenActionMenuId(null);
                      }}
                    >
                      Edit
                    </button>
                    {deleteConfirmNote?.local_id === note.local_id ? (
                      <>
                        <button
                          className="dropdown-item danger"
                          onClick={() => {
                            deleteNote(note.local_id);
                            setDeleteConfirmNote(null);
                            setOpenActionMenuId(null);
                          }}
                        >
                          Confirm delete
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setDeleteConfirmNote(null);
                            setOpenActionMenuId(null);
                          }}
                        >
                          Cancel delete
                        </button>
                      </>
                    ) : (
                      <button
                        className="dropdown-item danger"
                        onClick={() => setDeleteConfirmNote(note)}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        createShareLink("read", note.server_id);
                        setOpenActionMenuId(null);
                      }}
                      disabled={!note.server_id}
                    >
                      Share
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        createShareLink("collab", note.server_id);
                        setOpenActionMenuId(null);
                      }}
                      disabled={!note.server_id}
                    >
                      Collaborate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activeNote && (
        <div className="modal-overlay" onClick={() => setActiveNote(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{activeNote.title}</h2>
              <button 
                className="modal-close"
                onClick={() => setActiveNote(null)}
              >
                X
              </button>
            </div>
            {shareStatus && (
              <div style={{ padding: "0 24px 12px", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                {shareStatus}
              </div>
            )}
            {currentMembers.length > 0 && (
              <div style={{ padding: "0 24px 12px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Collaborators:
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {currentMembers.map((member) => (
                    <span key={member.user?.id || member.user?.username} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {member.user?.username}
                      {member.user?.id && (
                        <button
                          className="button-secondary"
                          onClick={() => removeMemberFromShare(currentShare?.token, member.user.id)}
                          style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-body">
              <div style={{ 
                display: "flex", 
                gap: "8px", 
                marginBottom: "16px",
                flexWrap: "wrap"
              }}>
                {activeNote.subject && (
                  <span style={{ 
                    fontSize: "0.85rem", 
                    padding: "4px 10px", 
                    background: "var(--background-color)", 
                    borderRadius: "20px"
                  }}>
                    {activeNote.subject}
                  </span>
                )}
                <span style={{ 
                  fontSize: "0.85rem", 
                  padding: "4px 10px", 
                  background: "var(--primary-light)", 
                  color: "var(--primary-color)", 
                  borderRadius: "20px"
                }}>
                  {activeNote.category}
                </span>
                <span style={{ 
                  fontSize: "0.85rem", 
                  color: "var(--text-muted)"
                }}>
                  {activeNote.created_at 
                    ? new Date(activeNote.created_at).toLocaleString() 
                    : ""}
                </span>
              </div>

              {normalizeTags(activeNote.tags).length > 0 && (
                <div className="tags" style={{ marginBottom: "16px" }}>
                  {normalizeTags(activeNote.tags).map((t, i) => (
                    <span key={i} className="tag">#{t}</span>
                  ))}
                </div>
              )}

              <div style={{ 
                whiteSpace: "pre-wrap", 
                lineHeight: "1.7",
                padding: "20px",
                background: "var(--background-color)",
                borderRadius: "var(--radius-md)",
                marginBottom: "20px"
              }}>
                {activeNote.content}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ marginBottom: "12px", fontSize: "0.9375rem", fontWeight: 600 }}>
                  Notex AI Actions
                </h4>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button 
                    className="button-secondary"
                    onClick={() => askAI("summarize", activeNote)}
                    disabled={aiLoading}
                    style={{ padding: "10px 16px" }}
                  >
                    <SummarizeIcon /> Summarize
                  </button>
                  <button 
                    className="button-secondary"
                    onClick={() => askAI("explain", activeNote)}
                    disabled={aiLoading}
                    style={{ padding: "10px 16px" }}
                  >
                    <ExplainIcon /> Explain
                  </button>
                  <button 
                    className="button-secondary"
                    onClick={() => askAI("questions", activeNote)}
                    disabled={aiLoading}
                    style={{ padding: "10px 16px" }}
                  >
                    <QuestionIcon /> Generate Questions
                  </button>
                </div>
              </div>

              {aiNoteId === activeNote.local_id && (
                <div style={{ 
                  padding: "16px", 
                  background: "var(--primary-light)", 
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--primary-color)"
                }}>
                  <h4 style={{ marginBottom: "8px", color: "var(--primary-color)", fontSize: "0.9375rem", fontWeight: 600 }}>
                    AI Response
                  </h4>
                  {aiLoading ? (
                    <div className="loading-spinner" style={{ padding: "20px" }}>
                      <div className="spinner"></div>
                    </div>
                  ) : aiResult ? (
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {aiResult}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <div
                className={`dropdown ${shareMenuOpen ? "open" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="button-secondary actions-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareMenuOpen((prev) => !prev);
                  }}
                >
                  Share Options
                </button>
                <div className="dropdown-menu note-actions-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      createShareLink("read", activeNote.server_id);
                      setShareMenuOpen(false);
                    }}
                  >
                    Share
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      createShareLink("collab", activeNote.server_id);
                      setShareMenuOpen(false);
                    }}
                  >
                    Collaborate
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      inviteUserToShare(currentShare?.token);
                      setShareMenuOpen(false);
                    }}
                    disabled={!currentShare?.token}
                  >
                    Add user
                  </button>
                  <button
                    className="dropdown-item danger"
                    onClick={() => {
                      revokeShareLink(currentShare?.token);
                      setShareMenuOpen(false);
                    }}
                    disabled={!currentShare?.token}
                  >
                    Revoke link
                  </button>
                </div>
              </div>
              <button 
                className="button-secondary"
                onClick={() => {
                  editNote(activeNote);
                  setActiveNote(null);
                }}
              >
                Edit Note
              </button>
              
              {deleteConfirmNote?.local_id === activeNote?.local_id ? (
                <>
                  <button
                    className="button-danger"
                    onClick={() => {
                      deleteNote(activeNote.local_id);
                      setDeleteConfirmNote(null);
                      setActiveNote(null);
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    className="button-secondary"
                    onClick={() => setDeleteConfirmNote(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="button-danger"
                  onClick={() => setDeleteConfirmNote(activeNote)}
                >
                  Delete
                </button>
              )}
              
              <button onClick={() => setActiveNote(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;


