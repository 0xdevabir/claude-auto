#!/usr/bin/env node
/**
 * StopFailure companion: desktop-friendly notification when a rate/usage limit hits.
 * Does not resume the session (StopFailure cannot control that) — Claude Code's
 * autoContinueAtUsageLimit setting performs the wait/continue inside the app.
 */
import { readFileSync } from "node:fs";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  payload = {};
}

const detail =
  typeof payload.last_assistant_message === "string"
    ? payload.last_assistant_message.slice(0, 120)
    : "Usage/rate limit reached";

const title = "Claude Auto";
const body = `${detail} — waiting for reset if auto-continue is enabled.`;

// OSC 9 desktop notification (Claude Code emits via terminalSequence)
const seq = `\u001b]9;${title}: ${body}\u0007`;

process.stdout.write(
  `${JSON.stringify({
    terminalSequence: seq,
    // systemMessage is ignored on StopFailure; keep for logs/debug hosts
  })}\n`,
);
