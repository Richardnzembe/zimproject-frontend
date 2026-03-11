import { getCookie } from "./cookies";

const DEV_API_BASE_URL = "http://localhost:8000";
const PROD_API_BASE_URL = "https://ree-backend.onrender.com";
const USER_OPENROUTER_MODEL_STORAGE = "notex_openrouter_model";
const USER_ID_STORAGE_KEY = "notex_user_id";

let isAuthenticated = false;
let refreshPromise = null;
let userIdentityPromise = null;
let csrfTokenCache = "";

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

function isUnsafeMethod(method) {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
  return !safeMethods.has((method || "GET").toUpperCase());
}

async function ensureCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  const current = getCookie("csrftoken");
  if (current) {
    csrfTokenCache = current;
    return current;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const token = data?.csrfToken || "";
      if (token) {
        csrfTokenCache = token;
        return token;
      }
    }
  } catch {
    // Best effort: fall through to cookie fallback.
  }
  const fallback = getCookie("csrftoken");
  if (fallback) {
    csrfTokenCache = fallback;
  }
  return csrfTokenCache;
}

async function hydrateUserIdentity() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me/`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (data?.id) {
      localStorage.setItem(USER_ID_STORAGE_KEY, String(data.id));
      return data.id;
    }
  } catch {
    // Keep state unchanged on transient failures.
  }
  return null;
}

async function ensureUserIdentity(force = false) {
  if (!isAuthenticated) return null;
  const currentId = getAuthUserId();
  if (currentId && !force) return currentId;
  if (userIdentityPromise) return userIdentityPromise;

  userIdentityPromise = (async () => {
    const hydratedId = await hydrateUserIdentity();
    return hydratedId;
  })();

  try {
    return await userIdentityPromise;
  } finally {
    userIdentityPromise = null;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return isAuthenticated;
}

export async function setTokens() {
  isAuthenticated = true;
  await ensureUserIdentity(true);
}

export async function clearTokens() {
  isAuthenticated = false;
  userIdentityPromise = null;
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  try {
    const csrf = await ensureCsrfToken();
    await fetch(`${API_BASE_URL}/api/auth/logout/`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
      keepalive: true,
    });
  } catch {
    // Best effort logout.
  } finally {
    window.dispatchEvent(new Event("auth-changed"));
  }
}

export function getAuthHeaders() {
  return {};
}

export function getUserOpenRouterModel() {
  return localStorage.getItem(USER_OPENROUTER_MODEL_STORAGE) || "";
}

export function getUserAiHeaders() {
  const model = getUserOpenRouterModel().trim();
  const isAutoModel = model.toLowerCase() === "auto";
  return {
    ...(model && !isAutoModel ? { "X-OpenRouter-Model": model } : {}),
  };
}

export function decodeJwt() {
  return null;
}

export function getAuthUserId() {
  const raw = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function ensureAuthUserId() {
  return await ensureUserIdentity(false);
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const csrf = await ensureCsrfToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        isAuthenticated = false;
        userIdentityPromise = null;
        localStorage.removeItem(USER_ID_STORAGE_KEY);
        window.dispatchEvent(new Event("auth-changed"));
        return false;
      }
      if (data?.csrfToken) {
        csrfTokenCache = data.csrfToken;
      }
      isAuthenticated = true;
      await ensureUserIdentity(true);
      window.dispatchEvent(new Event("auth-changed"));
      return true;
    } catch {
      isAuthenticated = false;
      userIdentityPromise = null;
      localStorage.removeItem(USER_ID_STORAGE_KEY);
      window.dispatchEvent(new Event("auth-changed"));
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const includeAiHeaders = url.includes("/api/ai/");
  const headers = {
    ...(options.headers || {}),
    ...(includeAiHeaders ? getUserAiHeaders() : {}),
  };

  if (isUnsafeMethod(method)) {
    const csrf = await ensureCsrfToken();
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: options.credentials || "include",
  });

  if (response.ok && isAuthenticated && !getAuthUserId()) {
    await ensureUserIdentity(false);
  }

  if (response.status !== 401) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;

  const retryHeaders = {
    ...(options.headers || {}),
    ...(includeAiHeaders ? getUserAiHeaders() : {}),
  };
  if (isUnsafeMethod(method)) {
    const csrf = getCookie("csrftoken") || (await ensureCsrfToken());
    if (csrf) retryHeaders["X-CSRFToken"] = csrf;
  }

  return fetch(url, {
    ...options,
    method,
    headers: retryHeaders,
    credentials: options.credentials || "include",
  });
}

export async function initializeAuth() {
  await refreshAccessToken();
}

export function getRefreshToken() {
  return null;
}
