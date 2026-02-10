import React, { useState } from "react";
import { getApiBaseUrl, getAuthToken, clearTokens, decodeJwt, getAuthUserId, authFetch } from "../lib/api";

export default function UserSettings({ onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const token = getAuthToken();
  const payload = decodeJwt(token);
  const username = payload?.username || payload?.user_name || "User";
  const userId = getAuthUserId();

  const handleResetPassword = async () => {
    setLoading(true);
    setStatus("");

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/users/${userId}/set_password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(data?.detail || data?.error || `Reset failed (${res.status})`);
      } else {
        setStatus("Password reset successfully!");
        setShowResetForm(false);
        setNewPassword("");
      }
    } catch (err) {
      console.error(err);
      setStatus("Password reset error");
    }

    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== username) {
      setStatus(`Type "${username}" to confirm deletion`);
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/users/${userId}/delete/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus(data?.detail || data?.error || `Delete failed (${res.status})`);
      } else {
        clearTokens();
        window.dispatchEvent(new Event("auth-changed"));
        setStatus("Account deleted successfully");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setStatus("Delete account error");
    }

    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface-color)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "var(--shadow-lg)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>User Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          background: "var(--background-color)",
          padding: "16px",
          borderRadius: "var(--radius-md)",
          marginBottom: "20px",
        }}>
          <p style={{ margin: "0 0 4px 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Logged in as</p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.125rem" }}>{username}</p>
        </div>

        {!showResetForm ? (
          <button
            onClick={() => setShowResetForm(true)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "12px",
              background: "var(--surface-color)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            🔐 Reset Password
          </button>
        ) : (
          <div style={{ marginBottom: "20px" }}>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              type="password"
              style={{ width: "100%", padding: "10px", marginBottom: "8px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleResetPassword}
                disabled={loading || !newPassword}
                style={{ flex: 1, padding: "10px" }}
              >
                {loading ? "Resetting..." : "Confirm Reset"}
              </button>
              <button
                onClick={() => { setShowResetForm(false); setNewPassword(""); }}
                className="button-secondary"
                style={{ flex: 1, padding: "10px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: "100%",
              padding: "12px",
              background: "transparent",
              border: "1px solid var(--error-color)",
              color: "var(--error-color)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            🗑️ Delete Account
          </button>
        ) : (
          <div style={{
            marginTop: "20px",
            padding: "16px",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--error-color)",
          }}>
            <p style={{ margin: "0 0 12px 0", color: "var(--error-color)", fontSize: "0.875rem" }}>
              <strong>Warning:</strong> This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: "0.875rem" }}>
              Type <strong>{username}</strong> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "${username}"`}
              style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== username}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "var(--error-color)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
              >
                {loading ? "Deleting..." : "Delete Forever"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="button-secondary"
                style={{ flex: 1, padding: "10px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status && (
          <p style={{
            marginTop: "16px",
            color: status.includes("success") || status.includes("successfully") ? "var(--success-color)" : "var(--error-color)",
            textAlign: "center",
          }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
