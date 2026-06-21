import { useEffect } from "react";
import { getAuthToken } from "./api";

/**
 * Close a dropdown/menu when clicking outside or pressing Escape.
 * @param {React.RefObject} ref - Ref to the menu container element
 * @param {function} onClose - Callback to close the menu
 * @param {boolean} [active=true] - Whether the hook is active
 */
export function useClickOutside(ref, onClose, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ref, onClose, active]);
}

/**
 * Listen for auth-changed events and call the handler.
 * @param {function} handler - Callback invoked on auth change
 */
export function useAuthChange(handler) {
  useEffect(() => {
    const onAuthChange = () => handler(getAuthToken());
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, [handler]);
}

/**
 * Sync pending items when coming online and on a periodic interval.
 * @param {object} params
 * @param {function} params.syncFn - Function to sync pending items
 * @param {function} params.loadFn - Function to load from API
 * @param {number} [params.interval=30000] - Sync interval in ms
 */
export function useOnlineSync({ syncFn, loadFn, interval = 30000 }) {
  useEffect(() => {
    const onOnline = () => {
      syncFn();
      loadFn();
    };
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => {
      if (navigator.onLine) {
        syncFn();
      }
    }, interval);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [syncFn, loadFn, interval]);
}

/**
 * Auto-resize a textarea element based on content.
 * @param {React.RefObject} ref - Ref to the textarea element
 * @param {string} value - Current input value (dependency for re-calculation)
 * @param {number} [maxHeight=200] - Maximum height in pixels
 */
export function useAutoResize(ref, value, maxHeight = 200) {
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, maxHeight)}px`;
  }, [ref, value, maxHeight]);
}
