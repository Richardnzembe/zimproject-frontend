/**
 * Safely parse JSON from a fetch response, returning null on failure.
 */
export const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

/**
 * Set a status message that auto-clears after a timeout.
 * @param {function} setter - State setter function
 * @param {string} message - Status message to display
 * @param {number} duration - Duration in ms before clearing (default 2500)
 */
export const flashStatus = (setter, message, duration = 2500) => {
  setter(message);
  setTimeout(() => setter(""), duration);
};

/**
 * Copy text to clipboard with error handling.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Whether the copy succeeded
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Build a share URL from a token.
 */
export const buildShareUrl = (token) =>
  `${window.location.origin}?share=${token}`;
