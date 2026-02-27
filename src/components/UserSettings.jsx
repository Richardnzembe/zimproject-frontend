import React, { useState } from "react";
import {
  getApiBaseUrl,
  getAuthToken,
  clearTokens,
  decodeJwt,
  getAuthUserId,
  authFetch,
} from "../lib/api";

const PIN_STORAGE_KEY = "notex_device_pin_hash";
const USER_OPENROUTER_KEY_STORAGE = "notex_openrouter_key";
const USER_OPENROUTER_BASE_STORAGE = "notex_openrouter_base";
const USE_USER_OPENROUTER_KEY_STORAGE = "notex_use_user_openrouter";

const hashPin = async (value) => {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export default function UserSettings({ onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pinStatus, setPinStatus] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinSetup, setPinSetup] = useState({ pin: "", confirm: "" });
  const [pinUnlock, setPinUnlock] = useState("");
  const [showPinChange, setShowPinChange] = useState(false);
  const [pinChange, setPinChange] = useState({ current: "", next: "", confirm: "" });
  const [useOwnKey, setUseOwnKey] = useState(
    localStorage.getItem(USE_USER_OPENROUTER_KEY_STORAGE) === "true"
  );
  const [openRouterKey, setOpenRouterKey] = useState(
    localStorage.getItem(USER_OPENROUTER_KEY_STORAGE) || ""
  );
  const [openRouterBase, setOpenRouterBase] = useState(
    localStorage.getItem(USER_OPENROUTER_BASE_STORAGE) || ""
  );
  const [showKey, setShowKey] = useState(false);

  const token = getAuthToken();
  const payload = decodeJwt(token);
  const username = payload?.username || payload?.user_name || "User";
  const userId = getAuthUserId();
  const hasPin = Boolean(localStorage.getItem(PIN_STORAGE_KEY));

  const setDevicePin = async () => {
    setPinStatus("");
    if (pinSetup.pin.length < 4) {
      setPinStatus("PIN must be at least 4 digits.");
      return;
    }
    if (pinSetup.pin !== pinSetup.confirm) {
      setPinStatus("PINs do not match.");
      return;
    }
    const hashed = await hashPin(pinSetup.pin);
    localStorage.setItem(PIN_STORAGE_KEY, hashed);
    setPinSetup({ pin: "", confirm: "" });
    setPinVerified(true);
    setPinStatus("PIN set successfully.");
  };

  const unlockWithPin = async () => {
    setPinStatus("");
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return;
    const hashed = await hashPin(pinUnlock);
    if (hashed !== stored) {
      setPinStatus("Incorrect PIN.");
      return;
    }
    setPinVerified(true);
    setPinUnlock("");
    setPinStatus("");
  };

  const changePin = async () => {
    setPinStatus("");
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return;
    const currentHash = await hashPin(pinChange.current);
    if (currentHash !== stored) {
      setPinStatus("Current PIN is incorrect.");
      return;
    }
    if (pinChange.next.length < 4) {
      setPinStatus("New PIN must be at least 4 digits.");
      return;
    }
    if (pinChange.next !== pinChange.confirm) {
      setPinStatus("New PINs do not match.");
      return;
    }
    const nextHash = await hashPin(pinChange.next);
    localStorage.setItem(PIN_STORAGE_KEY, nextHash);
    setPinChange({ current: "", next: "", confirm: "" });
    setShowPinChange(false);
    setPinStatus("PIN updated.");
  };

  const saveUserKey = () => {
    setPinStatus("");
    if (useOwnKey && !openRouterKey.trim()) {
      setPinStatus("Enter your OpenRouter API key or disable the toggle.");
      return;
    }
    localStorage.setItem(USE_USER_OPENROUTER_KEY_STORAGE, String(useOwnKey));
    localStorage.setItem(USER_OPENROUTER_KEY_STORAGE, openRouterKey.trim());
    localStorage.setItem(USER_OPENROUTER_BASE_STORAGE, openRouterBase.trim());
    setPinStatus("AI key settings saved.");
  };

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

        <div style={{
          background: "var(--surface-color)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          marginBottom: "20px",
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>AI API Key (OpenRouter)</h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Your key is stored only on this device. Set a device PIN to access or change it.
          </p>

          {!hasPin && (
            <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
              <input
                type="password"
                value={pinSetup.pin}
                onChange={(e) => setPinSetup((prev) => ({ ...prev, pin: e.target.value }))}
                placeholder="Create device PIN (min 4 digits)"
              />
              <input
                type="password"
                value={pinSetup.confirm}
                onChange={(e) => setPinSetup((prev) => ({ ...prev, confirm: e.target.value }))}
                placeholder="Confirm PIN"
              />
              <button onClick={setDevicePin}>Set PIN</button>
            </div>
          )}

          {hasPin && !pinVerified && (
            <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
              <input
                type="password"
                value={pinUnlock}
                onChange={(e) => setPinUnlock(e.target.value)}
                placeholder="Enter device PIN to unlock"
              />
              <button onClick={unlockWithPin}>Unlock</button>
            </div>
          )}

          {hasPin && pinVerified && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <input
                  type="checkbox"
                  checked={useOwnKey}
                  onChange={(e) => setUseOwnKey(e.target.checked)}
                />
                Use my OpenRouter API key
              </label>

              <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="OpenRouter API key"
                />
                <input
                  type="text"
                  value={openRouterBase}
                  onChange={(e) => setOpenRouterBase(e.target.value)}
                  placeholder="OpenRouter base URL (optional)"
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setShowKey((prev) => !prev)}
                  >
                    {showKey ? "Hide Key" : "Show Key"}
                  </button>
                  <button type="button" onClick={saveUserKey}>
                    Save
                  </button>
                </div>
              </div>

              {!showPinChange ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowPinChange(true)}
                >
                  Change PIN
                </button>
              ) : (
                <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
                  <input
                    type="password"
                    value={pinChange.current}
                    onChange={(e) => setPinChange((prev) => ({ ...prev, current: e.target.value }))}
                    placeholder="Current PIN"
                  />
                  <input
                    type="password"
                    value={pinChange.next}
                    onChange={(e) => setPinChange((prev) => ({ ...prev, next: e.target.value }))}
                    placeholder="New PIN"
                  />
                  <input
                    type="password"
                    value={pinChange.confirm}
                    onChange={(e) => setPinChange((prev) => ({ ...prev, confirm: e.target.value }))}
                    placeholder="Confirm new PIN"
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={changePin}>Update PIN</button>
                    <button
                      className="button-secondary"
                      onClick={() => {
                        setShowPinChange(false);
                        setPinChange({ current: "", next: "", confirm: "" });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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

        {(status || pinStatus) && (
          <p style={{
            marginTop: "16px",
            color: (() => {
              const message = (status || pinStatus || "").toLowerCase();
              return message.includes("success") || message.includes("saved") || message.includes("updated")
                ? "var(--success-color)"
                : "var(--error-color)";
            })(),
            textAlign: "center",
          }}>
            {status || pinStatus}
          </p>
        )}
      </div>
    </div>
  );
}
