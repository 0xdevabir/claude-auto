import { describe, expect, it } from "vitest";
import { detectLimit } from "../../src/limit/detector.js";

describe("detectLimit", () => {
  it("detects session usage limit with reset clock", () => {
    const now = new Date("2026-09-07T12:00:00");
    const result = detectLimit("You've hit your session limit · resets 3:45pm", now);
    expect(result.detected).toBe(true);
    expect(result.type).toBe("usage_limit");
    expect(result.resetAt).toBeInstanceOf(Date);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("detects weekly limit", () => {
    const result = detectLimit("You've hit your weekly limit · resets Mon 12:00am");
    expect(result.detected).toBe(true);
    expect(result.type).toBe("usage_limit");
  });

  it("detects 429 rate limit", () => {
    const result = detectLimit(
      "API Error: Request rejected (429) · this may be a temporary capacity issue.",
    );
    expect(result.detected).toBe(true);
    expect(result.type).toBe("rate_limit");
  });

  it("does not treat authentication failed as usage limit", () => {
    const result = detectLimit("Authentication failed");
    expect(result.detected).toBe(false);
    expect(result.type).toBe("authentication_error");
  });

  it("does not treat permission denied as usage limit", () => {
    const result = detectLimit("Permission denied");
    expect(result.detected).toBe(false);
    expect(result.type).toBe("permission_error");
  });

  it("does not treat command not found as usage limit", () => {
    const result = detectLimit("Command not found");
    expect(result.detected).toBe(false);
  });

  it("does not treat network failure as usage limit", () => {
    const result = detectLimit("Network connection failed");
    expect(result.detected).toBe(false);
    expect(result.type).toBe("network_error");
  });

  it("does not treat invalid request as usage limit", () => {
    const result = detectLimit("Invalid request");
    expect(result.detected).toBe(false);
  });

  it("does not treat session not found as usage limit", () => {
    const result = detectLimit("Session not found");
    expect(result.detected).toBe(false);
    expect(result.type).toBe("session_error");
  });

  it("parses try again in duration", () => {
    const now = new Date("2026-09-07T12:00:00Z");
    const result = detectLimit("Usage limit reached. Try again in 30 minutes", now);
    expect(result.detected).toBe(true);
    expect(result.retryAfterSeconds).toBe(1800);
  });
});
