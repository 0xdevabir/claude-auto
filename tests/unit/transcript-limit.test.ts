import { describe, expect, it } from "vitest";
import { detectLimitFromTranscriptLine } from "../../src/limit/transcript-detector.js";
import { parseResetInfo } from "../../src/reset/parser.js";
import { encodeProjectDir } from "../../src/session/transcript.js";

describe("detectLimitFromTranscriptLine", () => {
  it("parses structured rate_limit with resetsAt", () => {
    const line = JSON.stringify({
      type: "assistant",
      timestamp: "2026-09-07T10:34:56.247Z",
      error: "rate_limit",
      apiErrorStatus: 429,
      isApiErrorMessage: true,
      quotaLimits: {
        status: "rejected",
        resetsAt: 1757236800,
        rateLimitType: "five_hour",
      },
      message: {
        content: [
          {
            type: "text",
            text: "You've hit your session limit · resets 4:40pm (Asia/Dhaka)",
          },
        ],
      },
    });

    const result = detectLimitFromTranscriptLine(line);
    expect(result?.detected).toBe(true);
    expect(result?.type).toBe("usage_limit");
    expect(result?.resetAt?.getTime()).toBe(1757236800 * 1000);
  });

  it("ignores normal assistant text", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Cluster is a group of nodes." }] },
    });
    expect(detectLimitFromTranscriptLine(line)).toBeNull();
  });
});

describe("parseResetInfo timezone suffix", () => {
  it("parses resets 4:40pm (Asia/Dhaka)", () => {
    const now = new Date("2026-09-07T08:00:00+06:00");
    const r = parseResetInfo(
      "You've hit your session limit · resets 4:40pm (Asia/Dhaka)",
      now,
    );
    expect(r.resetAt).toBeInstanceOf(Date);
    expect(r.resetAt!.getHours()).toBe(16);
    expect(r.resetAt!.getMinutes()).toBe(40);
  });
});

describe("encodeProjectDir", () => {
  it("encodes unix cwd", () => {
    expect(encodeProjectDir("/Users/mdabirhossain")).toBe("-Users-mdabirhossain");
  });
});
