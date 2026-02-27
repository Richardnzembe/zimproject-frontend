import { getCookie, removeCookie } from "./cookies";

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

const LEGACY_ACCESS_TOKEN_KEY = "token";
const LEGACY_REFRESH_TOKEN_KEY = "refreshToken";
const LEGACY_ACCESS_TOKEN_COOKIE = "smart_notes_access";
const LEGACY_REFRESH_TOKEN_COOKIE = "smart_notes_refresh";
const USER_OPENROUTER_KEY_STORAGE = "notex_openrouter_key";
const USER_OPENROUTER_BASE_STORAGE = "notex_openrouter_base";
const USE_USER_OPENROUTER_KEY_STORAGE = "notex_use_user_openrouter";

let inMemoryAccessToken = null;
let refreshPromise = null;

function getLegacyAccessToken() {
  return localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY) || getCookie(LEGACY_ACCESS_TOKEN_COOKIE);
}

function getLegacyRefreshToken() {
  return localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY) || getCookie(LEGACY_REFRESH_TOKEN_COOKIE);
}

function clearLegacyTokens() {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  removeCookie(LEGACY_ACCESS_TOKEN_COOKIE);
  removeCookie(LEGACY_REFRESH_TOKEN_COOKIE);
}

function isUnsafeMethod(method) {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
  return !safeMethods.has((method || "GET").toUpperCase());
}

async function ensureCsrfToken() {
  const current = getCookie("csrftoken");
  if (current) return current;
  await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    method: "GET",
    credentials: "include",
  });
  return getCookie("csrftoken");
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return inMemoryAccessToken;
}

export function setTokens({ access }) {
  if (access) {
    inMemoryAccessToken = access;
  }
}

export function clearTokens() {
  inMemoryAccessToken = null;
  clearLegacyTokens();
  fetch(`${API_BASE_URL}/api/auth/logout/`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getUserOpenRouterKey() {
  return localStorage.getItem(USER_OPENROUTER_KEY_STORAGE) || "";
}

export function getUserOpenRouterBase() {
  return localStorage.getItem(USER_OPENROUTER_BASE_STORAGE) || "";
}

export function getUseUserOpenRouterKey() {
  return localStorage.getItem(USE_USER_OPENROUTER_KEY_STORAGE) === "true";
}

export function getUserAiHeaders() {
  if (!getUseUserOpenRouterKey()) return {};
  const key = getUserOpenRouterKey().trim();
  if (!key) return {};
  const base = getUserOpenRouterBase().trim();
  return {
    "X-OpenRouter-Key": key,
    ...(base ? { "X-OpenRouter-Base": base } : {}),
  };
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
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const legacyRefresh = getLegacyRefreshToken();
    const requestBody = legacyRefresh ? JSON.stringify({ refresh: legacyRefresh }) : "{}";

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.access) {
        inMemoryAccessToken = null;
        clearLegacyTokens();
        window.dispatchEvent(new Event("auth-changed"));
        return null;
      }
      inMemoryAccessToken = data.access;
      clearLegacyTokens();
      window.dispatchEvent(new Event("auth-changed"));
      return data.access;
    } catch {
      inMemoryAccessToken = null;
      window.dispatchEvent(new Event("auth-changed"));
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureFreshAccessToken() {
  if (inMemoryAccessToken && !isTokenExpired(inMemoryAccessToken)) {
    return inMemoryAccessToken;
  }

  const legacyAccess = getLegacyAccessToken();
  if (legacyAccess && !isTokenExpired(legacyAccess)) {
    inMemoryAccessToken = legacyAccess;
  }

  return await refreshAccessToken();
}

export async function authFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const access = await ensureFreshAccessToken();
  const includeAiHeaders = url.includes("/api/ai/");
  const headers = {
    ...(options.headers || {}),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...(includeAiHeaders ? getUserAiHeaders() : {}),
  };

  if (isUnsafeMethod(method)) {
    const csrf = await ensureCsrfToken();
    if (csrf) {
      headers["X-CSRFToken"] = csrf;
    }
  }

  const requestOptions = {
    ...options,
    method,
    headers,
    credentials: options.credentials || "include",
  };

  const res = await fetch(url, requestOptions);
  if (res.status !== 401) return res;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return res;

  const retryHeaders = {
    ...(options.headers || {}),
    Authorization: `Bearer ${refreshed}`,
    ...(includeAiHeaders ? getUserAiHeaders() : {}),
  };
  if (isUnsafeMethod(method)) {
    const csrf = getCookie("csrftoken") || (await ensureCsrfToken());
    if (csrf) {
      retryHeaders["X-CSRFToken"] = csrf;
    }
  }
  return await fetch(url, {
    ...options,
    method,
    headers: retryHeaders,
    credentials: options.credentials || "include",
  });
}

export async function initializeAuth() {
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    const legacyAccess = getLegacyAccessToken();
    if (legacyAccess && !isTokenExpired(legacyAccess)) {
      inMemoryAccessToken = legacyAccess;
      window.dispatchEvent(new Event("auth-changed"));
    }
  }
}

// Kept for backward compatibility with existing imports.
export function getRefreshToken() {
  return getLegacyRefreshToken();
}
