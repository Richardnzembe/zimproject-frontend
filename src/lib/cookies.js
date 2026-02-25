const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

function buildCookie(name, value, options = {}) {
  const {
    days,
    path = "/",
    sameSite = "Lax",
    secure = isBrowser && window.location.protocol === "https:",
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (typeof days === "number") {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    cookie += `; Expires=${expires}`;
  }
  cookie += `; Path=${path}`;
  cookie += `; SameSite=${sameSite}`;
  if (secure) {
    cookie += "; Secure";
  }
  return cookie;
}

export function getCookie(name) {
  if (!isBrowser) return "";
  const token = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split("; ");
  const found = parts.find((part) => part.startsWith(token));
  if (!found) return "";
  return decodeURIComponent(found.slice(token.length));
}

export function setCookie(name, value, options = {}) {
  if (!isBrowser) return;
  document.cookie = buildCookie(name, value, options);
}

export function removeCookie(name, options = {}) {
  if (!isBrowser) return;
  document.cookie = buildCookie(name, "", { ...options, days: -1 });
}
