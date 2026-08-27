import React, { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl, getAuthToken, setTokens, clearTokens, authFetch, getAuthUserId } from "../lib/api";

const PIN_STORAGE_KEY = "notex_device_pin_hash";
const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

const BusyLabel = ({ children }) => (
  <><span className="small-spinner" aria-hidden="true" /> {children}</>
);

const hashPin = async (value) => {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const extractErrorMessage = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    return data.non_field_errors[0];
  }
  const keys = Object.keys(data);
  if (keys.length) {
    const firstKey = keys[0];
    const value = data[firstKey];
    if (Array.isArray(value) && value.length) return `${firstKey}: ${value[0]}`;
    if (typeof value === "string") return `${firstKey}: ${value}`;
  }
  return fallback;
};

let gsiLoadPromise = null;
const loadGsiScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return gsiLoadPromise;
};

const AuthPanel = ({ accountOptionsTrigger = 0 }) => {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetStep, setResetStep] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetUid, setResetUid] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [accountOptionsOpen, setAccountOptionsOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [pinStatus, setPinStatus] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinSetup, setPinSetup] = useState({ pin: "", confirm: "" });
  const [pinUnlock, setPinUnlock] = useState("");
  const [showPinChange, setShowPinChange] = useState(false);
  const [pinChange, setPinChange] = useState({ current: "", next: "", confirm: "" });
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [profileId, setProfileId] = useState(null);

  const envGoogleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const [googleClientId, setGoogleClientId] = useState(envGoogleClientId);
  const googleButtonRef = useRef(null);
  const googleInitializedForRef = useRef("");

  const token = getAuthToken();
  const userId = getAuthUserId();
  const hasPin = Boolean(localStorage.getItem(PIN_STORAGE_KEY));

  const setErrorStatus = useCallback((msg) => {
    setStatus(msg);
    setStatusType("error");
  }, []);

  const setSuccessStatus = useCallback((msg) => {
    setStatus(msg);
    setStatusType("success");
  }, []);

  const handleGoogleCredential = useCallback(async (credential) => {
    const tokenValue = (credential || "").trim();
    if (!tokenValue) {
      setErrorStatus("Google login failed.");
      return;
    }

    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/google/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: tokenValue }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Google login failed (${res.status})`));
        setLoading(false);
        return;
      }

      await setTokens(data);
      window.dispatchEvent(new Event("auth-changed"));
      setSuccessStatus("Logged in with Google!");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setErrorStatus("Google login error");
    }

    setLoading(false);
  }, [setErrorStatus, setSuccessStatus]);

  useEffect(() => {
    if (envGoogleClientId || googleClientId) return;
    let isActive = true;
    const loadGoogleConfig = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/google/config/`, {
          method: "GET",
          credentials: "include",
        });
        const data = await safeJson(res);
        const clientId = (data?.clientId || data?.client_id || "").trim();
        if (res.ok && clientId && isActive) {
          setGoogleClientId(clientId);
        }
      } catch {
        // Best effort: keep Google disabled if config cannot be loaded.
      }
    };
    loadGoogleConfig();
    return () => {
      isActive = false;
    };
  }, [envGoogleClientId, googleClientId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const tokenParam = params.get("token");
    if (uid && tokenParam) {
      setTimeout(() => {
        setResetUid(uid);
        setResetToken(tokenParam);
        setResetStep("confirm");
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setTimeout(() => { setDisplayUsername(""); }, 0);
      return;
    }

    let isActive = true;
    const loadProfile = async () => {
      try {
        const res = await authFetch(`${getApiBaseUrl()}/api/auth/me/`);
        const data = await safeJson(res);
        if (!res.ok) {
          return;
        }
        if (isActive) {
          setTimeout(() => {
            setDisplayUsername(data?.display_name || data?.username || "");
            setProfileId(data?.id || null);
          }, 0);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadProfile();
    return () => {
      isActive = false;
    };
  }, [token]);

  useEffect(() => {
    if (token && accountOptionsTrigger > 0) {
      setTimeout(() => {
        setAccountOptionsOpen(true);
      }, 0);
    }
  }, [accountOptionsTrigger, token]);

  useEffect(() => {
    if (!token) return;
    let isActive = true;
    const loadAiKeyState = async () => {
      try {
        const res = await authFetch(`${getApiBaseUrl()}/api/ai/user-key/`);
        const data = await safeJson(res);
        if (!res.ok || !isActive) return;
        const configured = Boolean(data?.configured);
        setTimeout(() => {
          setUseOwnKey(configured);
          setKeyConfigured(configured);
        }, 0);
      } catch {
        // Keep defaults on transient failures.
      }
    };
    loadAiKeyState();
    return () => {
      isActive = false;
    };
  }, [token]);

  useEffect(() => {
    if (token) return;
    if (!googleClientId) return;
    if (resetStep) return;

    let cancelled = false;

    const renderButton = () => {
      const container = googleButtonRef.current;
      const google = window.google;
      if (!container || !google?.accounts?.id) return;

      if (googleInitializedForRef.current !== googleClientId) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            handleGoogleCredential(response?.credential);
          },
          cancel_on_tap_outside: true,
        });
        googleInitializedForRef.current = googleClientId;
      }

      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "filled_blue",
        size: "large",
        text: mode === "register" ? "signup_with" : "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: Math.min(260, window.innerWidth - 80),
        click_listener: () => {
          setStatus("");
          setStatusType("");
        },
      });
    };

    loadGsiScript()
      .then(() => {
        if (!cancelled) renderButton();
      })
      .catch(() => {
        // Google SDK failed to load; keep button hidden.
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, handleGoogleCredential, mode, resetStep, token]);

  const handleLogin = async () => {
    const safeUsername = username.trim();
    const safePassword = password;
    if (!safeUsername || !safePassword) {
      setErrorStatus("Username and password are required.");
      return;
    }
    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: safeUsername, password: safePassword }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Login failed (${res.status})`));
        setLoading(false);
        return;
      }

      await setTokens(data);
      window.dispatchEvent(new Event("auth-changed"));
      setSuccessStatus("Logged in successfully!");
    } catch (err) {
      console.error(err);
      setErrorStatus("Login error");
    }

    setLoading(false);
  };

  const handleRegister = async () => {
    const safeUsername = username.trim();
    const safeEmail = email.trim();
    if (password !== confirmPassword) {
      setErrorStatus("Passwords do not match");
      return;
    }
    if (!safeEmail) {
      setErrorStatus("Email is required for password recovery.");
      return;
    }
    if (!safeUsername) {
      setErrorStatus("Username is required.");
      return;
    }

    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: safeUsername,
          email: safeEmail,
          password,
          password_confirm: confirmPassword,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Registration failed (${res.status})`));
        setLoading(false);
        return;
      }

      setSuccessStatus("Account created. You can now log in.");
      setMode("login");
      setUsername(username);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setErrorStatus("Registration error");
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await clearTokens();
    window.dispatchEvent(new Event("auth-changed"));
    setSuccessStatus("Logged out");
    setAccountOptionsOpen(false);
    setDisplayUsername("");
    setProfileId(null);
  };

  const handlePasswordResetRequest = async () => {
    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Reset request failed (${res.status})`));
      } else {
        setSuccessStatus(data?.detail || "If an account exists, a reset link has been sent.");
      }
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message ? err.message : "Network or CORS error";
      setErrorStatus(`Reset request error: ${message}`);
    }

    setLoading(false);
  };

  const handlePasswordResetConfirm = async () => {
    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: resetUid,
          token: resetToken,
          new_password: resetNewPassword,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Password reset failed (${res.status})`));
      } else {
        setSuccessStatus(data?.detail || "Password reset successfully.");
        setResetStep("");
        setMode("login");
        setResetNewPassword("");
      }
    } catch (err) {
      console.error(err);
      setErrorStatus("Password reset error");
    }

    setLoading(false);
  };

  const handleAuthenticatedPasswordReset = async () => {
    if (!accountPassword) {
      setErrorStatus("New password is required.");
      return;
    }
    if (accountPassword !== accountPasswordConfirm) {
      setErrorStatus("Passwords do not match.");
      return;
    }
    const resolvedUserId = profileId || userId;
    if (!resolvedUserId) {
      setErrorStatus("Missing user information.");
      return;
    }

    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/auth/users/${resolvedUserId}/set_password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: accountPassword }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Password reset failed (${res.status})`));
      } else {
        setSuccessStatus(data?.detail || "Password has been reset successfully.");
        setAccountPassword("");
        setAccountPasswordConfirm("");
        setAccountOptionsOpen(false);
      }
    } catch (err) {
      console.error(err);
      setErrorStatus("Password reset error");
    }

    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    const resolvedUserId = profileId || userId;
    if (!resolvedUserId) {
      setErrorStatus("Missing user information.");
      return;
    }
    const confirmed = window.confirm(
      "This will permanently delete your account and data. Do you want to continue?"
    );
    if (!confirmed) {
      setSuccessStatus("Account deletion canceled.");
      return;
    }

    setLoading(true);
    setStatus("");
    setStatusType("");

    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/auth/users/${resolvedUserId}/delete/`, {
        method: "DELETE",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setErrorStatus(extractErrorMessage(data, `Delete failed (${res.status})`));
      } else {
        await clearTokens();
        window.dispatchEvent(new Event("auth-changed"));
        setSuccessStatus(data?.detail || "Account has been deleted successfully.");
        setAccountOptionsOpen(false);
        setDisplayUsername("");
      }
    } catch (err) {
      console.error(err);
      setErrorStatus("Delete account error");
    }

    setLoading(false);
  };

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

  const saveUserKey = async () => {
    setPinStatus("");
    try {
      if (!useOwnKey) {
        const res = await authFetch(`${getApiBaseUrl()}/api/ai/user-key/`, { method: "DELETE" });
        if (!res.ok) {
          setPinStatus(`Failed to remove AI key (${res.status})`);
          return;
        }
        setKeyConfigured(false);
        setOpenRouterKey("");
        setPinStatus("AI key removed.");
        return;
      }
      if (!openRouterKey.trim()) {
        setPinStatus("Enter your OpenRouter API key.");
        return;
      }
      const res = await authFetch(`${getApiBaseUrl()}/api/ai/user-key/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: openRouterKey.trim() }),
      });
      if (!res.ok) {
        setPinStatus(`Failed to save AI key (${res.status})`);
        return;
      }
      setKeyConfigured(true);
      setOpenRouterKey("");
      setPinStatus("AI key settings saved.");
    } catch {
      setPinStatus("Failed to update AI key settings.");
    }
  };

  const heading =
    resetStep === "request"
      ? "Reset password"
      : resetStep === "confirm"
      ? "Set new password"
      : mode === "login"
      ? "Welcome back"
      : "Create account";

  return (
    <div className="auth-panel">
      <h2>{heading}</h2>

      {token ? (
        <>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "var(--success-color)", fontWeight: 500 }}>You are authenticated</p>
            {displayUsername && (
              <p style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
                Signed in as <strong>{displayUsername}</strong>
              </p>
            )}
          </div>
          <div className="auth-actions">
            <button
              onClick={() => {
                setAccountOptionsOpen((prev) => !prev);
                setStatus("");
              setStatusType("");
              }}
              className="button-secondary"
            >
              {accountOptionsOpen ? "Hide account options" : "Account options"}
            </button>
            <button onClick={handleLogout} style={{ width: "100%" }}>
              Logout
            </button>
          </div>

          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>AI API Key (OpenRouter)</h3>
              <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                Your key is saved securely on the server (encrypted). Set a device PIN to unlock this form.
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
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Base URL is fixed to OpenRouter. {keyConfigured ? "Custom key is configured." : "Using server key."}
                </p>
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
          </div>

          {accountOptionsOpen && (
            <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
              <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>Reset password</h3>
                <input
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="New password"
                  type="password"
                  autoComplete="new-password"
                />
                <input
                  value={accountPasswordConfirm}
                  onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                />
                <button onClick={handleAuthenticatedPasswordReset} disabled={loading} style={{ width: "100%" }}>
                  {loading ? <BusyLabel>Resetting...</BusyLabel> : "Reset password"}
                </button>
              </div>

              <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "var(--danger-color)" }}>Delete account</h3>
                <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Deleting your account is permanent. You will lose access to your data.
                </p>
                <button onClick={handleDeleteAccount} disabled={loading} style={{ width: "100%" }}>
                  {loading ? <BusyLabel>Deleting...</BusyLabel> : "Delete account"}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {resetStep === "request" ? (
            <>
              <input
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                autoComplete="email"
              />
              <div className="auth-actions">
                <button onClick={handlePasswordResetRequest} disabled={loading}>
                  {loading ? <BusyLabel>Sending...</BusyLabel> : "Send reset link"}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    setResetStep("");
                    setStatus("");
                    setStatusType("");
                  }}
                  disabled={loading}
                >
                  Back to login
                </button>
              </div>
            </>
          ) : resetStep === "confirm" ? (
            <>
              <input
                value={resetUid}
                onChange={(e) => setResetUid(e.target.value)}
                placeholder="UID"
                autoComplete="off"
              />
              <input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Token"
                autoComplete="off"
              />
              <input
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="New password"
                type="password"
                autoComplete="new-password"
              />
              <div className="auth-actions">
                <button onClick={handlePasswordResetConfirm} disabled={loading}>
                  {loading ? <BusyLabel>Resetting...</BusyLabel> : "Reset password"}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    setResetStep("");
                    setStatus("");
                    setStatusType("");
                  }}
                  disabled={loading}
                >
                  Back to login
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {mode === "register" && (
                <>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (required for recovery)"
                    type="email"
                    autoComplete="email"
                  />
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    type="password"
                    autoComplete="new-password"
                  />
                </>
              )}
              <div className="auth-actions">
                {mode === "login" ? (
                  <>
                    <button onClick={handleLogin} disabled={loading}>
                      {loading ? <BusyLabel>Signing in...</BusyLabel> : "Sign in"}
                    </button>
                    <button
                      className="button-secondary"
                      onClick={() => {
                        setMode("register");
                        setStatus("");
                        setStatusType("");
                      }}
                      disabled={loading}
                    >
                      Create account
                    </button>
                    <button
                      className="button-ghost"
                      onClick={() => {
                        setResetStep("request");
                        setStatus("");
                        setStatusType("");
                      }}
                      disabled={loading}
                      style={{ fontSize: "0.875rem" }}
                    >
                      Forgot password?
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleRegister} disabled={loading}>
                      {loading ? <BusyLabel>Creating...</BusyLabel> : "Create account"}
                    </button>
                    <button
                      className="button-secondary"
                      onClick={() => {
                        setMode("login");
                        setStatus("");
                        setStatusType("");
                      }}
                      disabled={loading}
                    >
                      Back to login
                    </button>
                  </>
                )}
              </div>
              <div className="auth-divider">or</div>
              <div className="auth-google" aria-label="Continue with Google">
                {googleClientId ? (
                  <div ref={googleButtonRef} />
                ) : (
                  <button className="button-secondary" type="button" disabled>
                    Continue with Google
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {(status || pinStatus) && (
        <p
          className={`status-message ${statusType === "error" ? "error" : "success"}`}
          style={{ marginTop: "16px" }}
        >
          {status || pinStatus}
        </p>
      )}
    </div>
  );
};

export default AuthPanel;
