import { describe, expect, it } from "vitest";
import { getThrottleSeconds, getThrottleSecondsFromText } from "./throttle";

describe("getThrottleSeconds", () => {
  it("uses Retry-After when the response exposes it", () => {
    const response = { headers: { get: () => "18" } };
    expect(getThrottleSeconds(response, {})).toBe(18);
  });

  it("parses Django REST Framework's throttle detail", () => {
    const data = { detail: "Request was throttled. Expected available in 39 seconds." };
    expect(getThrottleSeconds(null, data)).toBe(39);
  });

  it("rounds fractional wait times up", () => {
    const data = { detail: "Please try again in 3.2 seconds." };
    expect(getThrottleSeconds(null, data)).toBe(4);
  });
});

describe("getThrottleSecondsFromText", () => {
  it("recognizes a rendered throttle message", () => {
    expect(getThrottleSecondsFromText("Request was throttled. Expected available in 39 seconds.")).toBe(39);
  });

  it("ignores ordinary error messages", () => {
    expect(getThrottleSecondsFromText("Unable to load notes.")).toBeNull();
  });
});
