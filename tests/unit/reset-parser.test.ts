import { describe, expect, it } from "vitest";
import {
  parseClockTime,
  parseDurationToSeconds,
  parseResetInfo,
} from "../../src/reset/parser.js";
import { withResetBuffer } from "../../src/reset/calculator.js";

describe("parseDurationToSeconds", () => {
  it("parses combined durations", () => {
    expect(parseDurationToSeconds("1 hour 30 minutes")?.seconds).toBe(5400);
  });

  it("parses bare seconds", () => {
    expect(parseDurationToSeconds("1800")?.seconds).toBe(1800);
  });

  it("rejects negative", () => {
    expect(parseDurationToSeconds("-5 seconds")).toBeNull();
  });

  it("handles zero", () => {
    expect(parseDurationToSeconds("0 seconds")?.seconds).toBe(0);
  });
});

describe("parseClockTime", () => {
  it("parses am/pm and rolls to next day if past", () => {
    const now = new Date("2026-09-07T16:00:00");
    const t = parseClockTime("3:45pm", now);
    expect(t).not.toBeNull();
    expect(t!.getHours()).toBe(15);
    expect(t!.getDate()).toBe(8);
  });

  it("parses weekday clock", () => {
    const now = new Date("2026-09-07T10:00:00"); // Monday
    const t = parseClockTime("Mon 12:00am", now);
    expect(t).not.toBeNull();
  });

  it("returns null for malformed", () => {
    expect(parseClockTime("not-a-time")).toBeNull();
  });
});

describe("parseResetInfo", () => {
  it("parses retry after seconds", () => {
    const now = new Date("2026-09-07T12:00:00Z");
    const r = parseResetInfo("Retry after 1800 seconds", now);
    expect(r.retryAfterSeconds).toBe(1800);
    expect(r.resetAt?.getTime()).toBe(now.getTime() + 1800_000);
  });

  it("parses resets in duration", () => {
    const now = new Date("2026-09-07T12:00:00Z");
    const r = parseResetInfo("limit · resets in 5 seconds", now);
    expect(r.retryAfterSeconds).toBe(5);
  });
});

describe("withResetBuffer", () => {
  it("adds buffer seconds", () => {
    const base = new Date("2026-09-07T12:00:00Z");
    expect(withResetBuffer(base, 5).getTime()).toBe(base.getTime() + 5000);
  });
});
