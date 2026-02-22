import React from "react";
import { getAuthToken } from "../lib/api";
import { useNotificationFeed } from "../lib/notifications";

const targetViewFor = (item) => item?.targetView || "home";

export default function NotificationsPage({ onNavigate }) {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAllRead,
    clearAll,
    markRead,
  } = useNotificationFeed();

  if (!getAuthToken()) {
    return (
      <div className="panel-card">
        <div className="panel-header">
          <h1 className="panel-title">Notifications</h1>
        </div>
        <p className="notify-empty">Sign in to view your notifications.</p>
      </div>
    );
  }

  return (
    <div className="panel-card notifications-page">
      <div className="panel-header notifications-header">
        <div>
          <h1 className="panel-title">Notifications</h1>
          <p className="notifications-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
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
              onClick={() => {
                markRead(item.id);
                onNavigate?.(targetViewFor(item));
              }}
            >
              <span className="notify-item-title">{item.title}</span>
              <span className="notify-item-text">{item.message}</span>
              <span className="notify-item-time">{new Date(item.createdAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
