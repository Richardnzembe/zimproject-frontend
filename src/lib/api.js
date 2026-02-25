import { getCookie, removeCookie, setCookie } from "./cookies";

const DEV_API_BASE_URL = "http://localhost:8000";
const PROD_API_BASE_URL = "https://ree-backend.onrender.com";

function normalizeApiBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const rawUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? PROD_API_BASE_URL : DEV_API_BASE_URL);

  const normalizedUrl = normalizeApiBaseUrl(rawUrl);
  const isHttps = normalizedUrl.startsWith("https://");
  const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedUrl);

  if (import.meta.env.PROD && !isHttps && !isLocalhost) {
    console.warn(
      "Security warning: production API URL should use HTTPS. Current value:",
      normalizedUrl,
    );
  }

  return normalizedUrl;
}

const API_BASE_URL = resolveApiBaseUrl();
const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const ACCESS_TOKEN_COOKIE = "smart_notes_access";
const REFRESH_TOKEN_COOKIE = "smart_notes_refresh";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || getCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || getCookie(REFRESH_TOKEN_COOKIE);
}

export function setTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    setCookie(ACCESS_TOKEN_COOKIE, access, { days: 1, sameSite: "Lax" });
  }
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    setCookie(REFRESH_TOKEN_COOKIE, refresh, { days: 14, sameSite: "Lax" });
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  removeCookie(ACCESS_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function decodeJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthUserId() {
  const payload = decodeJwt(getAuthToken());
  return payload?.user_id ?? null;
}

export function isTokenExpired(token, skewSeconds = 30) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.access) {
      clearTokens();
      window.dispatchEvent(new Event("auth-changed"));
      return null;
    }
    setTokens({ access: data.access });
    window.dispatchEvent(new Event("auth-changed"));
    return data.access;
  } catch {
    clearTokens();
    window.dispatchEvent(new Event("auth-changed"));
    return null;
  }
}

export async function ensureFreshAccessToken() {
  const access = getAuthToken();
  if (!access) {
    return await refreshAccessToken();
  }
  if (isTokenExpired(access)) {
    return await refreshAccessToken();
  }
  return access;
}

export async function authFetch(url, options = {}) {
  const access = await ensureFreshAccessToken();
  const headers = {
    ...(options.headers || {}),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };

  const res = await fetch(url, { ...options, headers, credentials: options.credentials || "include" });
  if (res.status !== 401) return res;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return res;

  const retryHeaders = {
    ...(options.headers || {}),
    Authorization: `Bearer ${refreshed}`,
  };
  return await fetch(url, { ...options, headers: retryHeaders, credentials: options.credentials || "include" });
}

export async function initializeAuth() {
  const access = getAuthToken();
  const refresh = getRefreshToken();
  if (!access && refresh) {
    await refreshAccessToken();
    return;
  }
  if (access && isTokenExpired(access) && refresh) {
    await refreshAccessToken();
  }
}
