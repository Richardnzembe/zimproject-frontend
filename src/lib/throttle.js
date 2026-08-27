export function getThrottleSeconds(response, data, fallbackSeconds = 60) {
  const headerValue = Number(response?.headers?.get?.("Retry-After"));
  if (Number.isFinite(headerValue) && headerValue > 0) return Math.ceil(headerValue);

  const detail = String(data?.detail || data?.error || "");
  const match = detail.match(/(?:available|try again)\s+in\s+(\d+(?:\.\d+)?)\s*seconds?/i);
  if (match) return Math.max(1, Math.ceil(Number(match[1])));

  return fallbackSeconds;
}

export function getThrottleSecondsFromText(message) {
  const text = String(message || "");
  if (!/throttl|too many requests|rate limit/i.test(text)) return null;
  const match = text.match(/(?:available|try again)\s+in\s+(\d+(?:\.\d+)?)\s*seconds?/i);
  return match ? Math.max(1, Math.ceil(Number(match[1]))) : null;
}
