import { formatClock, formatDuration, msUntil } from "../reset/calculator.js";
import type { SignalHub } from "../process/signals.js";
import { UserCancelledError } from "../errors/errors.js";

export interface CountdownOptions {
  resetAt: Date;
  resumeCount: number;
  maxResumes: number;
  enabled: boolean;
  signals: SignalHub;
  usedFallback?: boolean;
  fallbackSeconds?: number;
}

export async function waitWithCountdown(options: CountdownOptions): Promise<void> {
  const {
    resetAt,
    resumeCount,
    maxResumes,
    enabled,
    signals,
    usedFallback,
    fallbackSeconds,
  } = options;

  if (usedFallback) {
    console.error("");
    console.error("Exact reset time was not provided by Claude Code.");
    console.error("");
    console.error("Using configured fallback:");
    console.error(`    ${formatDuration(fallbackSeconds ?? 0)}`);
    console.error("");
  }

  if (!enabled) {
    while (msUntil(resetAt) > 0) {
      signals.throwIfCancelled();
      await interruptibleSleep(Math.min(1000, msUntil(resetAt)), signals);
    }
    return;
  }

  const line = "─".repeat(40);
  let first = true;

  while (msUntil(resetAt) > 0) {
    signals.throwIfCancelled();
    const remaining = Math.ceil(msUntil(resetAt) / 1000);
    if (!first && process.stderr.isTTY) {
      process.stderr.write("\u001b[16A\u001b[0J");
    }
    first = false;

    console.error(line);
    console.error("Claude Auto");
    console.error(line);
    console.error("");
    console.error("Claude usage limit detected.");
    console.error("");
    console.error("Waiting for reset...");
    console.error("");
    console.error("Estimated reset:");
    console.error(`    ${formatClock(resetAt)}`);
    console.error("");
    console.error("Remaining:");
    console.error(`    ${formatDuration(remaining)}`);
    console.error("");
    console.error("Resumes:");
    console.error(`    ${resumeCount} / ${maxResumes}`);
    console.error("");
    console.error("Press Ctrl+C to stop.");

    const slice = Math.min(1000, msUntil(resetAt) || 0);
    if (slice > 0) {
      await interruptibleSleep(slice, signals);
    }
  }
}

function interruptibleSleep(ms: number, signals: SignalHub): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signals.isCancelled) {
      reject(new UserCancelledError());
      return;
    }
    const timer = setTimeout(() => {
      unsub();
      resolve();
    }, ms);
    const unsub = signals.onCancel(() => {
      clearTimeout(timer);
      unsub();
      reject(new UserCancelledError());
    });
  });
}
