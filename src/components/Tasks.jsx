import React, { useEffect, useState } from "react";
import { authFetch, getApiBaseUrl, getAuthToken, getAuthUserId } from "../lib/api";
import {
  deleteLocalTask,
  getTasksByUser,
  replaceUserTasks,
  upsertTasks,
} from "../db";

const PRIORITIES = ["low", "medium", "high"];

const normalizePriority = (value) =>
  PRIORITIES.includes(value) ? value : "medium";

const sortTasks = (items) =>
  [...items].sort((a, b) => {
    if (a.pending_action === "delete" && b.pending_action !== "delete") return 1;
    if (b.pending_action === "delete" && a.pending_action !== "delete") return -1;
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  });

const formatDueDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [shareInfoByTask, setShareInfoByTask] = useState({});
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const buildLocalFromServer = (item, userId) => ({
    local_id: `server-${item.id}`,
    server_id: item.id,
    client_id: item.client_id || null,
    user_id: userId,
    title: item.title,
    description: item.description || "",
    is_completed: Boolean(item.is_completed),
    priority: normalizePriority(item.priority),
    due_date: item.due_date || null,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
    sync_status: "synced",
    pending_action: null,
  });

  const loadLocalTasks = async () => {
    const userId = getAuthUserId();
    if (!userId) return [];
    const local = await getTasksByUser(userId);
    const normalized = local.map((task) => ({
      ...task,
      priority: normalizePriority(task.priority),
    }));
    setTasks(sortTasks(normalized));
    return normalized;
  };

  const mergeServerTasks = async (serverTasks) => {
    const userId = getAuthUserId();
    if (!userId) return;
    const local = await getTasksByUser(userId);
    const pending = local.filter((t) => t.sync_status !== "synced");
    const pendingByServerId = new Map(
      pending.filter((t) => t.server_id).map((t) => [t.server_id, t])
    );
    const pendingByClientId = new Map(
      pending.filter((t) => t.client_id).map((t) => [t.client_id, t])
    );

    const merged = [...pending];
    for (const item of serverTasks) {
      if (pendingByServerId.has(item.id)) continue;
      if (item.client_id && pendingByClientId.has(item.client_id)) continue;
      merged.push(buildLocalFromServer(item, userId));
    }

    await replaceUserTasks(userId, merged);
    setTasks(sortTasks(merged));
  };

  const loadApiTasks = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    setStatus("");
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/tasks/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setStatus(data?.detail || `Failed to load tasks (${res.status})`);
        return;
      }
      await mergeServerTasks(Array.isArray(data) ? data : []);
    } catch {
      setStatus("Failed to load tasks");
    } finally {
      setSyncing(false);
    }
  };

  const syncPendingTasks = async () => {
    if (!navigator.onLine) return;
    const userId = getAuthUserId();
    if (!userId) return;

    const local = await getTasksByUser(userId);
    const pending = local.filter((t) => t.sync_status !== "synced");
    if (!pending.length) return;

    setSyncing(true);

    for (const task of pending) {
      const payload = {
        title: task.title,
        description: task.description || "",
        is_completed: Boolean(task.is_completed),
        priority: normalizePriority(task.priority),
        due_date: task.due_date || null,
        client_id: task.client_id,
      };

      try {
        if (task.pending_action === "delete") {
          if (task.server_id) {
            const res = await authFetch(`${getApiBaseUrl()}/api/tasks/${task.server_id}/`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
            if (res.ok || res.status === 204 || res.status === 404) {
              await deleteLocalTask(task.local_id);
            }
          } else {
            await deleteLocalTask(task.local_id);
          }
          continue;
        }

        if (task.server_id) {
          const res = await authFetch(`${getApiBaseUrl()}/api/tasks/${task.server_id}/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await safeJson(res);
          if (res.ok && data?.id) {
            await upsertTasks([
              {
                ...task,
                server_id: data.id,
                client_id: data.client_id || task.client_id,
                created_at: data.created_at || task.created_at,
                updated_at: data.updated_at || new Date().toISOString(),
                due_date: data.due_date ?? task.due_date,
                sync_status: "synced",
                pending_action: null,
              },
            ]);
          }
          continue;
        }

        const res = await authFetch(`${getApiBaseUrl()}/api/tasks/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await safeJson(res);
        if (res.ok && data?.id) {
          await upsertTasks([
            {
              ...task,
              server_id: data.id,
              client_id: data.client_id || task.client_id,
              created_at: data.created_at || task.created_at,
              updated_at: data.updated_at || new Date().toISOString(),
              due_date: data.due_date ?? task.due_date,
              sync_status: "synced",
              pending_action: null,
            },
          ]);
        }
      } catch {
        // keep as pending and retry on next cycle
      }
    }

    const updated = await getTasksByUser(userId);
    setTasks(sortTasks(updated));
    setSyncing(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
    });
  };

  const saveTask = async () => {
    const title = form.title.trim();
    if (!title) return;

    const token = getAuthToken();
    const userId = getAuthUserId();
    if (!token || !userId) {
      setStatus("Please login to manage tasks.");
      return;
    }

    const now = new Date().toISOString();
    const baseData = {
      title,
      description: form.description.trim(),
      priority: normalizePriority(form.priority),
      due_date: toIsoOrNull(form.due_date),
      updated_at: now,
      sync_status: "pending",
    };

    let localTask;
    if (editingId) {
      const existing = tasks.find((task) => task.local_id === editingId);
      if (!existing) return;
      localTask = {
        ...existing,
        ...baseData,
        pending_action: existing.server_id ? "update" : "create",
      };
    } else {
      localTask = {
        local_id: crypto.randomUUID(),
        client_id: crypto.randomUUID(),
        server_id: null,
        user_id: userId,
        is_completed: false,
        created_at: now,
        pending_action: "create",
        ...baseData,
      };
    }

    await upsertTasks([localTask]);
    const updated = await getTasksByUser(userId);
    setTasks(sortTasks(updated));
    resetForm();
    await syncPendingTasks();
  };

  const fetchShareLinks = async (taskId) => {
    const token = getAuthToken();
    if (!token || !taskId) return;
    try {
      const res = await authFetch(
        `${getApiBaseUrl()}/api/share/links/?resource_type=task&task_id=${taskId}`,
        { method: "GET" }
      );
      const data = await safeJson(res);
      if (!res.ok) return;
      setShareInfoByTask((prev) => ({
        ...prev,
        [taskId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      // ignore
    }
  };

  const createShareLink = async (permission, task) => {
    if (!task?.server_id) {
      setShareStatus("Please sync the task before sharing.");
      return;
    }
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "task",
          task_id: task.server_id,
          permission,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to create share link.");
        return;
      }
      setShareInfoByTask((prev) => {
        const existing = prev[task.server_id] || [];
        return {
          ...prev,
          [task.server_id]: [
            ...existing.filter((item) => item.permission !== permission),
            data,
          ],
        };
      });
      const url = `${window.location.origin}?share=${data.token}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("Share link copied.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to create share link.");
    }
  };

  const inviteUserToShare = async (shareToken) => {
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
        setShareStatus(data?.detail || "Unable to send invite.");
        return;
      }
      setShareStatus("Invite sent.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to send invite.");
    }
  };

  const removeMemberFromTaskShare = async (taskId, shareToken, userId) => {
    if (!taskId || !shareToken || !userId) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/members/${userId}/`, {
        method: "DELETE",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to remove member.");
        return;
      }
      setShareInfoByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map((share) =>
          share.token === shareToken
            ? { ...share, members: (share.members || []).filter((m) => m.user?.id !== userId) }
            : share
        ),
      }));
      setShareStatus("Member removed.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to remove member.");
    }
  };

  const revokeTaskShare = async (taskId, shareToken) => {
    if (!taskId || !shareToken) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/revoke/`, {
        method: "POST",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to revoke share link.");
        return;
      }
      setShareInfoByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter((share) => share.token !== shareToken),
      }));
      setShareStatus("Share link revoked.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to revoke share link.");
    }
  };

  const editTask = (task) => {
    setEditingId(task.local_id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: normalizePriority(task.priority),
      due_date: formatDueDateInput(task.due_date),
    });
  };

  const toggleTaskCompleted = async (task) => {
    const userId = getAuthUserId();
    if (!userId) return;

    await upsertTasks([
      {
        ...task,
        is_completed: !task.is_completed,
        updated_at: new Date().toISOString(),
        sync_status: "pending",
        pending_action: task.server_id ? "update" : "create",
      },
    ]);
    const updated = await getTasksByUser(userId);
    setTasks(sortTasks(updated));
    await syncPendingTasks();
  };

  const deleteTask = async (localId) => {
    const token = getAuthToken();
    const userId = getAuthUserId();
    if (!token || !userId) {
      setStatus("Please login to manage tasks.");
      return;
    }

    const target = tasks.find((task) => task.local_id === localId);
    if (!target) return;

    if (target.server_id) {
      await upsertTasks([
        {
          ...target,
          sync_status: "pending",
          pending_action: "delete",
          updated_at: new Date().toISOString(),
        },
      ]);
    } else {
      await deleteLocalTask(localId);
    }

    const updated = await getTasksByUser(userId);
    setTasks(sortTasks(updated));
    setDeleteConfirmId(null);
    await syncPendingTasks();
  };

  useEffect(() => {
    const initialize = async () => {
      const token = getAuthToken();
      if (!token) {
        setTasks([]);
        setStatus("Please login to use tasks.");
        return;
      }
      await loadLocalTasks();
      await loadApiTasks();
      await syncPendingTasks();
    };
    initialize();
  }, []);

  useEffect(() => {
    const onAuthChange = async () => {
      const token = getAuthToken();
      if (token) {
        setStatus("");
        await loadLocalTasks();
        await loadApiTasks();
        await syncPendingTasks();
      } else {
        setTasks([]);
        setStatus("Please login to use tasks.");
      }
    };
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      syncPendingTasks();
      loadApiTasks();
    };
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingTasks();
      }
    }, 30000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const serverTaskIds = tasks
      .filter((task) => task.server_id)
      .map((task) => task.server_id);
    for (const taskId of serverTaskIds) {
      if (!shareInfoByTask[taskId]) {
        fetchShareLinks(taskId);
      }
    }
  }, [tasks, shareInfoByTask]);

  useEffect(() => {
    const closeMenus = () => setOpenActionMenuId(null);
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  const visibleTasks = tasks.filter((task) => {
    if (task.pending_action === "delete") return false;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      task.title.toLowerCase().includes(q) ||
      (task.description || "").toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && !task.is_completed) ||
      (filter === "completed" && task.is_completed);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="card dropdown-host">
      <div className="card-header">
        <h2 className="card-title">{editingId ? "Edit Task" : "My Tasks"}</h2>
        {syncing && (
          <div className="sync-indicator syncing">
            <span className="sync-dot"></span>
            Syncing...
          </div>
        )}
      </div>

      {status && <p className="status-message info">{status}</p>}
      {shareStatus && <p className="status-message info">{shareStatus}</p>}

      <div className="search-filter-container">
        <input
          type="search"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Tasks</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="notes-form">
        <h3 style={{ marginBottom: "16px" }}>
          {editingId ? "Update Task" : "Create New Task"}
        </h3>
        <div className="form-row">
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        <div className="form-row" style={{ marginTop: "12px" }}>
          <input
            type="datetime-local"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>

        <textarea
          placeholder="Task details (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ minHeight: "110px", marginTop: "12px" }}
        />

        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
          <button onClick={saveTask}>
            {editingId ? "Update Task" : "Save Task"}
          </button>
          {editingId && (
            <button className="button-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="notes-list">
        {visibleTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">Tasks</div>
            <h3 className="empty-state-title">No tasks yet</h3>
            <p className="empty-state-text">
              Add your first task above. Changes are saved locally and synced when online.
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <div key={task.local_id} className="note-card">
              <div className="note-card-header">
                <h3
                  className="note-card-title"
                  style={{ textDecoration: task.is_completed ? "line-through" : "none" }}
                >
                  {task.title}
                </h3>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background:
                      task.priority === "high"
                        ? "#fee2e2"
                        : task.priority === "low"
                          ? "#dcfce7"
                          : "var(--primary-light)",
                    color:
                      task.priority === "high"
                        ? "#b91c1c"
                        : task.priority === "low"
                          ? "#166534"
                          : "var(--primary-color)",
                  }}
                >
                  {task.priority}
                </span>
              </div>

              {task.description && <p className="note-card-preview">{task.description}</p>}

              <div className="note-card-meta">
                <span>{task.is_completed ? "Completed" : "Active"}</span>
                {task.due_date && (
                  <>
                    <span>-</span>
                    <span>Due {new Date(task.due_date).toLocaleString()}</span>
                  </>
                )}
              </div>
              {(() => {
                const links = task.server_id ? shareInfoByTask[task.server_id] || [] : [];
                const currentShare = links.find((item) => item.permission === "collab") || links[0];
                const members = currentShare?.members || [];
                if (!members.length) return null;
                return (
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {members.map((member) => (
                      <span key={`${task.local_id}-${member.user?.id || member.user?.username}`} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {member.user?.username}
                        {member.user?.id && currentShare?.token && (
                          <button
                            className="button-secondary"
                            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                            onClick={() => removeMemberFromTaskShare(task.server_id, currentShare.token, member.user.id)}
                          >
                            Remove
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <div className="note-card-actions" style={{ display: "flex", gap: "8px" }}>
                <button
                  className="button-secondary"
                  onClick={() => toggleTaskCompleted(task)}
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                >
                  {task.is_completed ? "Mark Active" : "Complete"}
                </button>
                {(() => {
                  const links = task.server_id ? shareInfoByTask[task.server_id] || [] : [];
                  const currentShare = links.find((item) => item.permission === "collab") || links[0];
                  return (
                    <div
                      className={`dropdown ${openActionMenuId === task.local_id ? "open" : ""}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="button-secondary actions-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenuId((prev) => (prev === task.local_id ? null : task.local_id));
                        }}
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                      >
                        Actions
                      </button>
                      <div className="dropdown-menu note-actions-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            editTask(task);
                            setOpenActionMenuId(null);
                          }}
                        >
                          Edit
                        </button>
                        {deleteConfirmId === task.local_id ? (
                          <>
                            <button
                              className="dropdown-item danger"
                              onClick={() => {
                                deleteTask(task.local_id);
                                setOpenActionMenuId(null);
                              }}
                            >
                              Confirm delete
                            </button>
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                setDeleteConfirmId(null);
                                setOpenActionMenuId(null);
                              }}
                            >
                              Cancel delete
                            </button>
                          </>
                        ) : (
                          <button
                            className="dropdown-item danger"
                            onClick={() => setDeleteConfirmId(task.local_id)}
                          >
                            Delete
                          </button>
                        )}
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            createShareLink("read", task);
                            setOpenActionMenuId(null);
                          }}
                          disabled={!task.server_id}
                        >
                          Share
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            createShareLink("collab", task);
                            setOpenActionMenuId(null);
                          }}
                          disabled={!task.server_id}
                        >
                          Collaborate
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            inviteUserToShare(currentShare?.token);
                            setOpenActionMenuId(null);
                          }}
                          disabled={!currentShare?.token}
                        >
                          Add user
                        </button>
                        <button
                          className="dropdown-item danger"
                          onClick={() => {
                            revokeTaskShare(task.server_id, currentShare?.token);
                            setOpenActionMenuId(null);
                          }}
                          disabled={!currentShare?.token}
                        >
                          Revoke link
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tasks;
