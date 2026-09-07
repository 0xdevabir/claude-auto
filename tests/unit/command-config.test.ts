import { describe, expect, it } from "vitest";
import { buildClaudeArgs } from "../../src/claude/command-builder.js";
import { parseCapabilitiesFromHelp } from "../../src/claude/capabilities.js";
import { isValidSessionId, createSessionId } from "../../src/claude/session.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";
import { validateConfig } from "../../src/config/schema.js";
import { nextBackoffSeconds } from "../../src/retry/policy.js";
import { ConfigurationError } from "../../src/errors/errors.js";

describe("buildClaudeArgs", () => {
  it("starts with --session-id", () => {
    expect(
      buildClaudeArgs({
        sessionId: "11111111-1111-4111-8111-111111111111",
        mode: "interactive",
      }),
    ).toEqual(["--session-id", "11111111-1111-4111-8111-111111111111"]);
  });

  it("resumes with --resume and -p prompt", () => {
    expect(
      buildClaudeArgs({
        sessionId: "11111111-1111-4111-8111-111111111111",
        mode: "print",
        resume: true,
        prompt: "Continue",
      }),
    ).toEqual(["--resume", "11111111-1111-4111-8111-111111111111", "-p", "Continue"]);
  });

  it("never adds --fork-session", () => {
    const args = buildClaudeArgs({
      sessionId: "11111111-1111-4111-8111-111111111111",
      mode: "print",
      prompt: "x",
      resume: true,
    });
    expect(args.includes("--fork-session")).toBe(false);
  });
});

describe("capabilities", () => {
  it("detects resume and session-id from help", () => {
    const caps = parseCapabilitiesFromHelp(
      "2.1.263 (Claude Code)",
      "Usage: claude\n  -r, --resume [value]\n  --session-id <uuid>\n  -p, --print\n  -c, --continue\n  --output-format stream-json\n",
    );
    expect(caps.version).toBe("2.1.263");
    expect(caps.supportsSessionResume).toBe(true);
    expect(caps.supportsSessionId).toBe(true);
    expect(caps.supportsPromptMode).toBe(true);
    expect(caps.verified).toBe(true);
  });
});

describe("session id", () => {
  it("creates valid uuid", () => {
    expect(isValidSessionId(createSessionId())).toBe(true);
  });
});

describe("config validation", () => {
  it("accepts defaults", () => {
    expect(validateConfig({}, DEFAULT_CONFIG).maxAutoResumes).toBe(20);
  });

  it("rejects negative max", () => {
    expect(() => validateConfig({ maxAutoResumes: -1 }, DEFAULT_CONFIG)).toThrow(
      ConfigurationError,
    );
  });
});

describe("backoff", () => {
  it("doubles until max", () => {
    const cfg = {
      backoffInitialSeconds: 30,
      backoffMultiplier: 2,
      backoffMaxSeconds: 240,
    };
    expect(nextBackoffSeconds(0, cfg)).toBe(30);
    expect(nextBackoffSeconds(1, cfg)).toBe(60);
    expect(nextBackoffSeconds(2, cfg)).toBe(120);
    expect(nextBackoffSeconds(3, cfg)).toBe(240);
    expect(nextBackoffSeconds(4, cfg)).toBe(240);
  });
});
