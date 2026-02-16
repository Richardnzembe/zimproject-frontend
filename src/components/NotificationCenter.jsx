import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch, getApiBaseUrl, getAuthToken, getAuthUserId } from "../lib/api";

const POLL_INTERVAL_MS = 60 * 1000;
const TASK_DUE_SOON_MINUTES = Number(import.meta.env.VITE_TASK_DUE_SOON_MINUTES || 15);
const STUDY_REMINDER_MINUTES = Number(import.meta.env.VITE_STUDY_REMINDER_MINUTES || 90);
const MAX_NOTIFICATIONS = 120;

const STUDY_TIPS = [
  "Use active recall: close notes and explain what you remember.",
  "Study in 25-minute blocks and take a short break after each block.",
  "Teach the topic out loud. If it feels hard, that is exactly where to focus.",
  "Start with your hardest topic while your energy is still high.",
  "Review yesterday's topic for 10 minutes before starting a new one.",
  "Write one mini-goal before each study session and check it off after.",
];

const MOTIVATION_LINES = [
  "Small sessions done consistently beat long sessions done rarely.",
  "Progress today makes exam pressure lower tomorrow.",
  "You do not need perfect notes. You need clear understanding.",
  "One focused hour now can save many hours later.",
];

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const toIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

function keyFor(scope, suffix) {
  return `ree-notify-${scope}-${suffix}`;
}

export default function NotificationCenter({ onNavigate }) {
  const [userScope, setUserScope] = useState(getAuthUserId() || "anon");
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const containerRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const pollingRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications]
  );

  const persist = useCallback((items) => {
    localStorage.setItem(keyFor(userScope, "items"), JSON.stringify(items));
  }, [userScope]);

  const persistSeen = useCallback(() => {
    localStorage.setItem(keyFor(userScope, "seen"), JSON.stringify(Array.from(seenIdsRef.current)));
  }, [userScope]);

  const announceBrowserNotification = useCallback((item) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(item.title, { body: item.message });
    } catch {
      // Browser notifications are best effort only.
    }
  }, []);

  const addNotification = useCallback(
    (item) => {
      const normalized = {
        id: item.id,
        type: item.type || "info",
        title: item.title || "Notification",
        message: item.message || "",
        targetView: item.targetView || "home",
        createdAt: toIso(item.createdAt),
        read: false,
      };

      setNotifications((prev) => {
        if (prev.some((entry) => entry.id === normalized.id)) return prev;
        const next = [normalized, ...prev].slice(0, MAX_NOTIFICATIONS);
        persist(next);
        return next;
      });
      announceBrowserNotification(normalized);
    },
    [announceBrowserNotification, persist]
  );

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      persist(next);
      return next;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    persist([]);
  };

  const markReadAndNavigate = (id, targetView) => {
    setNotifications((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      persist(next);
      return next;
    });
    setPanelOpen(false);
    if (targetView) {
      onNavigate?.(targetView);
    }
  };

  const rememberEvent = useCallback((eventId) => {
    seenIdsRef.current.add(eventId);
    persistSeen();
  }, [persistSeen]);

  const hasSeenEvent = useCallback((eventId) => seenIdsRef.current.has(eventId), []);

  const pollNotifications = useCallback(async () => {
    if (!getAuthToken()) return;
    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      const [invitesRes, tasksRes] = await Promise.all([
        authFetch(`${getApiBaseUrl()}/api/share/invites/`, { method: "GET" }),
        authFetch(`${getApiBaseUrl()}/api/tasks/`, { method: "GET" }),
      ]);

      const invites = invitesRes.ok ? await safeJson(invitesRes) : [];
      const tasks = tasksRes.ok ? await safeJson(tasksRes) : [];

      if (Array.isArray(invites)) {
        invites.forEach((invite) => {
          const eventId = `share-invite-${invite.id}`;
          if (hasSeenEvent(eventId)) return;
          const resource = invite?.share?.resource_type || "resource";
          addNotification({
            id: eventId,
            type: "share",
            title: "New Share Invite",
            message: `${invite?.invited_by?.username || "A user"} invited you to a ${resource}.`,
            targetView: "shares",
            createdAt: invite?.created_at || new Date().toISOString(),
          });
          rememberEvent(eventId);
        });
      }

      const now = Date.now();
      const dueSoonThreshold = TASK_DUE_SOON_MINUTES * 60 * 1000;
      if (Array.isArray(tasks)) {
        tasks.forEach((task) => {
          if (task?.is_completed || !task?.due_date) return;
          const dueAt = new Date(task.due_date).getTime();
          if (Number.isNaN(dueAt)) return;

          if (dueAt <= now) {
            const eventId = `task-due-${task.id}`;
            if (hasSeenEvent(eventId)) return;
            addNotification({
              id: eventId,
              type: "task",
              title: "Task Due",
              message: `${task.title} reached its due time.`,
              targetView: "tasks",
              createdAt: task.due_date,
            });
            rememberEvent(eventId);
            return;
          }

          if (dueAt - now <= dueSoonThreshold) {
            const eventId = `task-due-soon-${task.id}`;
            if (hasSeenEvent(eventId)) return;
            addNotification({
              id: eventId,
              type: "task",
              title: "Task Due Soon",
              message: `${task.title} is due soon at ${new Date(task.due_date).toLocaleString()}.`,
              targetView: "tasks",
              createdAt: task.due_date,
            });
            rememberEvent(eventId);
          }
        });
      }

      const lastReminderRaw = Number(localStorage.getItem(keyFor(userScope, "last-study-reminder")) || 0);
      const nowMs = Date.now();
      const reminderInterval = STUDY_REMINDER_MINUTES * 60 * 1000;
      if (!lastReminderRaw || nowMs - lastReminderRaw >= reminderInterval) {
        const slot = Math.floor(nowMs / reminderInterval);
        const eventId = `study-reminder-${slot}`;
        if (!hasSeenEvent(eventId)) {
          const tip = STUDY_TIPS[slot % STUDY_TIPS.length];
          const motivation = MOTIVATION_LINES[slot % MOTIVATION_LINES.length];
          addNotification({
            id: eventId,
            type: "study",
            title: "Study Reminder",
            message: `${motivation} Tip: ${tip}`,
            targetView: "home",
            createdAt: new Date().toISOString(),
          });
          rememberEvent(eventId);
        }
        localStorage.setItem(keyFor(userScope, "last-study-reminder"), String(nowMs));
      }
    } catch {
      // Silent failure to avoid breaking the UI.
    } finally {
      pollingRef.current = false;
    }
  }, [addNotification, hasSeenEvent, rememberEvent, userScope]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onAuthChange = () => {
      setUserScope(getAuthUserId() || "anon");
    };
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, []);

  useEffect(() => {
    const rawItems = localStorage.getItem(keyFor(userScope, "items"));
    const parsedItems = rawItems ? JSON.parse(rawItems) : [];
    setNotifications(Array.isArray(parsedItems) ? parsedItems : []);

    const rawSeen = localStorage.getItem(keyFor(userScope, "seen"));
    const parsedSeen = rawSeen ? JSON.parse(rawSeen) : [];
    seenIdsRef.current = new Set(Array.isArray(parsedSeen) ? parsedSeen : []);
  }, [userScope]);

  useEffect(() => {
    if (!getAuthToken()) return;
    pollNotifications();
    const intervalId = window.setInterval(pollNotifications, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) {
        pollNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollNotifications]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="notify-root" ref={containerRef}>
      <button
        className="notify-button"
        onClick={() => setPanelOpen((prev) => !prev)}
        type="button"
        aria-label="Open notifications"
      >
        Notifications
        {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
      </button>

      {panelOpen && (
        <div className="notify-panel">
          <div className="notify-header">
            <strong>Notification Center</strong>
            <div className="notify-actions">
              {permission !== "granted" && "Notification" in window && (
                <button className="button-secondary" type="button" onClick={requestPermission}>
                  Enable Alerts
                </button>
              )}
              <button className="button-secondary" type="button" onClick={markAllRead}>
                Mark all read
              </button>
              <button className="button-secondary" type="button" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="notify-empty">No notifications yet.</p>
          ) : (
            <div className="notify-list">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notify-item ${item.read ? "read" : "unread"}`}
                  onClick={() => markReadAndNavigate(item.id, item.targetView)}
                >
                  <span className="notify-item-title">{item.title}</span>
                  <span className="notify-item-text">{item.message}</span>
                  <span className="notify-item-time">{new Date(item.createdAt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
