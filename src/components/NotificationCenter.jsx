import React from "react";
import { getAuthToken } from "../lib/api";
import { useNotificationFeed } from "../lib/notifications";

export default function NotificationCenter({ onNavigate }) {
  const { unreadCount } = useNotificationFeed();

  if (!getAuthToken()) return null;

  return (
    <div className="notify-root">
      <button
        className="notify-button"
        onClick={() => onNavigate?.("notifications")}
        type="button"
        aria-label="Open notifications page"
      >
        Notifications
        {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
      </button>
    </div>
  );
}
