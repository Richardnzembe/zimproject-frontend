import { authFetch, getApiBaseUrl, getAuthToken } from "./api";
import { safeJson, buildShareUrl } from "./utils";

/**
 * Fetch share links for a given resource.
 * @param {object} params
 * @param {string} params.resourceType - "chat" | "note" | "task"
 * @param {object} params.queryParams - Additional query params (e.g. { session_id, note_id, task_id })
 * @returns {Promise<Array|null>} Array of share link objects or null on failure
 */
export const fetchShareLinks = async ({ resourceType, queryParams = {} }) => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const params = new URLSearchParams({ resource_type: resourceType, ...queryParams });
    const res = await authFetch(
      `${getApiBaseUrl()}/api/share/links/?${params.toString()}`,
      { method: "GET" }
    );
    const data = await safeJson(res);
    if (!res.ok) return null;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
};

/**
 * Create a share link for a resource.
 * @param {object} params
 * @param {string} params.resourceType - "chat" | "note" | "task"
 * @param {string} params.permission - "read" | "collab"
 * @param {object} params.body - Additional body fields (session_id, note_id, task_id, history_ids, etc.)
 * @returns {Promise<{url?: string, data?: object, error?: string}>}
 */
export const createShareLink = async ({ resourceType, permission, body = {} }) => {
  try {
    const res = await authFetch(`${getApiBaseUrl()}/api/share/links/create/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_type: resourceType,
        permission,
        ...body,
      }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return { error: data?.detail || "Unable to create share link." };
    }
    const url = buildShareUrl(data.token);
    return { url, data };
  } catch {
    return { error: "Unable to create share link." };
  }
};

/**
 * Invite a user to a share link via username prompt.
 * @param {string} shareToken - The share link token
 * @param {string} [username] - Username to invite (if not provided, prompts the user)
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export const inviteUserToShare = async (shareToken, username) => {
  const name = username || window.prompt("Enter username to invite:");
  if (!name || !shareToken) return { error: null };
  try {
    const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/invite/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return { error: data?.detail || "Unable to send invite." };
    }
    return { success: true };
  } catch {
    return { error: "Unable to send invite." };
  }
};

/**
 * Remove a member from a share link.
 * @param {string} shareToken
 * @param {number|string} userId
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export const removeMemberFromShare = async (shareToken, userId) => {
  if (!shareToken || !userId) return { error: "Missing parameters." };
  try {
    const res = await authFetch(
      `${getApiBaseUrl()}/api/share/links/${shareToken}/members/${userId}/`,
      { method: "DELETE" }
    );
    const data = await safeJson(res);
    if (!res.ok) {
      return { error: data?.detail || "Unable to remove member." };
    }
    return { success: true };
  } catch {
    return { error: "Unable to remove member." };
  }
};

/**
 * Revoke a share link.
 * @param {string} shareToken
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export const revokeShareLink = async (shareToken) => {
  if (!shareToken) return { error: "Missing token." };
  try {
    const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/revoke/`, {
      method: "POST",
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return { error: data?.detail || "Unable to revoke share link." };
    }
    return { success: true };
  } catch {
    return { error: "Unable to revoke share link." };
  }
};
