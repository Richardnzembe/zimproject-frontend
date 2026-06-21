import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getApiBaseUrl,
  getAuthToken,
  getAuthHeaders,
  getUserOpenRouterModel,
  getUserAiHeaders,
  decodeJwt,
  getAuthUserId,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./api";

describe("api utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getApiBaseUrl", () => {
    it("returns a string URL", () => {
      const url = getApiBaseUrl();
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });

    it("does not end with a trailing slash", () => {
      const url = getApiBaseUrl();
      expect(url.endsWith("/")).toBe(false);
    });
  });

  describe("getAuthToken", () => {
    it("returns false when not authenticated and no stored session", () => {
      expect(getAuthToken()).toBe(false);
    });
  });

  describe("getAuthHeaders", () => {
    it("returns an empty object", () => {
      expect(getAuthHeaders()).toEqual({});
    });
  });

  describe("getUserOpenRouterModel", () => {
    it("returns empty string when no model is stored", () => {
      expect(getUserOpenRouterModel()).toBe("");
    });

    it("returns stored model value", () => {
      localStorage.setItem("notex_openrouter_model", "gpt-4o");
      expect(getUserOpenRouterModel()).toBe("gpt-4o");
    });
  });

  describe("getUserAiHeaders", () => {
    it("returns empty object when no model is set", () => {
      expect(getUserAiHeaders()).toEqual({});
    });

    it("returns X-OpenRouter-Model header when model is set", () => {
      localStorage.setItem("notex_openrouter_model", "claude-3");
      expect(getUserAiHeaders()).toEqual({ "X-OpenRouter-Model": "claude-3" });
    });

    it("returns empty object when model is 'auto'", () => {
      localStorage.setItem("notex_openrouter_model", "auto");
      expect(getUserAiHeaders()).toEqual({});
    });

    it("returns empty object when model is 'Auto' (case insensitive)", () => {
      localStorage.setItem("notex_openrouter_model", "Auto");
      expect(getUserAiHeaders()).toEqual({});
    });
  });

  describe("decodeJwt", () => {
    it("always returns null", () => {
      expect(decodeJwt()).toBeNull();
    });
  });

  describe("getAuthUserId", () => {
    it("returns null when no user ID is stored", () => {
      expect(getAuthUserId()).toBeNull();
    });

    it("returns numeric user ID from localStorage", () => {
      localStorage.setItem("notex_user_id", "42");
      expect(getAuthUserId()).toBe(42);
    });

    it("returns null for non-numeric user ID", () => {
      localStorage.setItem("notex_user_id", "not-a-number");
      expect(getAuthUserId()).toBeNull();
    });

    it("returns null for Infinity", () => {
      localStorage.setItem("notex_user_id", "Infinity");
      expect(getAuthUserId()).toBeNull();
    });
  });

  describe("getRefreshToken", () => {
    it("always returns null", () => {
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe("setTokens", () => {
    it("marks the user as authenticated", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1 }),
      });

      await setTokens({
        refresh_expires_in: 3600,
        access_expires_in: 300,
      });

      expect(getAuthToken()).toBe(true);
    });

    it("stores session metadata in localStorage", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ id: 5 }),
      });

      await setTokens({
        refresh_expires_in: 7200,
        access_expires_in: 600,
      });

      const stored = JSON.parse(
        localStorage.getItem("notex_auth_session")
      );
      expect(stored).not.toBeNull();
      expect(stored.refreshExpiresAt).toBeDefined();
      expect(stored.accessExpiresAt).toBeDefined();
    });
  });

  describe("clearTokens", () => {
    it("removes stored auth data", async () => {
      localStorage.setItem("notex_user_id", "10");
      localStorage.setItem("notex_auth_session", JSON.stringify({ refreshExpiresAt: "2099-01-01" }));

      vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });

      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      await clearTokens();

      expect(localStorage.getItem("notex_user_id")).toBeNull();
      expect(localStorage.getItem("notex_auth_session")).toBeNull();
      expect(getAuthToken()).toBe(false);
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    });
  });
});
