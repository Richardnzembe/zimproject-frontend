import { describe, it, expect, beforeEach } from "vitest";
import { getCookie, setCookie, removeCookie } from "./cookies";

describe("cookies", () => {
  beforeEach(() => {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name) {
        document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
      }
    });
  });

  describe("getCookie", () => {
    it("returns empty string when cookie does not exist", () => {
      expect(getCookie("missing")).toBe("");
    });

    it("returns the value of an existing cookie", () => {
      document.cookie = "testKey=hello; Path=/";
      expect(getCookie("testKey")).toBe("hello");
    });

    it("handles encoded cookie names and values", () => {
      document.cookie = `${encodeURIComponent("special name")}=${encodeURIComponent("a=b&c")}; Path=/`;
      expect(getCookie("special name")).toBe("a=b&c");
    });

    it("returns the correct cookie when multiple cookies exist", () => {
      document.cookie = "first=one; Path=/";
      document.cookie = "second=two; Path=/";
      document.cookie = "third=three; Path=/";
      expect(getCookie("second")).toBe("two");
    });

    it("returns empty string for empty name", () => {
      expect(getCookie("")).toBe("");
    });
  });

  describe("setCookie", () => {
    it("sets a simple cookie", () => {
      setCookie("myKey", "myValue");
      expect(getCookie("myKey")).toBe("myValue");
    });

    it("overwrites an existing cookie", () => {
      setCookie("myKey", "first");
      setCookie("myKey", "second");
      expect(getCookie("myKey")).toBe("second");
    });

    it("sets a cookie with expiration days", () => {
      setCookie("expires", "val", { days: 7 });
      expect(getCookie("expires")).toBe("val");
    });

    it("handles special characters in value", () => {
      setCookie("encoded", "hello world; extra=data");
      expect(getCookie("encoded")).toBe("hello world; extra=data");
    });
  });

  describe("removeCookie", () => {
    it("removes an existing cookie", () => {
      setCookie("toRemove", "value");
      expect(getCookie("toRemove")).toBe("value");
      removeCookie("toRemove");
      expect(getCookie("toRemove")).toBe("");
    });

    it("does not throw when removing a non-existent cookie", () => {
      expect(() => removeCookie("nonexistent")).not.toThrow();
    });
  });
});
