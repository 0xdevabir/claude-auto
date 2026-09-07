import { createReadStream, watch as fsWatch, type FSWatcher } from "node:fs";
import { createInterface } from "node:readline";
import { promises as fs } from "node:fs";
import { detectLimitFromTranscriptLine } from "../limit/transcript-detector.js";
import type { LimitDetectionResult } from "../limit/types.js";
import { findSessionTranscript } from "./transcript.js";
import { sleep } from "../platform/process.js";

export interface TranscriptWatchOptions {
  sessionId: string;
  cwd: string;
  /** Only accept limit events at/after this time (session start). */
  since: Date;
  signal?: AbortSignal;
  pollMs?: number;
}

/**
 * Watch Claude Code session transcript for a usage/rate limit while the
 * interactive process is still alive (TUI does not exit on limit).
 */
export async function waitForTranscriptLimit(
  options: TranscriptWatchOptions,
): Promise<LimitDetectionResult> {
  const pollMs = options.pollMs ?? 1000;
  const sinceMs = options.since.getTime() - 5_000;
  let offset = 0;
  let primed = false;
  let filePath: string | null = null;
  let watcher: FSWatcher | null = null;

  const cleanup = () => {
    try {
      watcher?.close();
    } catch {
      // ignore
    }
  };

  const onAbort = () => {
    cleanup();
  };
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    for (;;) {
      if (options.signal?.aborted) {
        throw new Error("aborted");
      }

      if (!filePath) {
        filePath = await findSessionTranscript(options.sessionId, options.cwd);
        if (filePath) {
          // First open: scan from start so we catch a limit that already landed
          offset = 0;
          primed = true;
          try {
            watcher = fsWatch(filePath, () => undefined);
          } catch {
            // poll only
          }
        }
      }

      if (filePath && primed) {
        const { detection, nextOffset } = await readNewLimit(
          filePath,
          offset,
          sinceMs,
        );
        offset = nextOffset;
        if (detection) {
          cleanup();
          return detection;
        }
      }

      await sleep(pollMs);
    }
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    cleanup();
  }
}

async function safeSize(filePath: string): Promise<number | null> {
  try {
    return (await fs.stat(filePath)).size;
  } catch {
    return null;
  }
}

async function readNewLimit(
  filePath: string,
  offset: number,
  sinceMs: number,
): Promise<{ detection: LimitDetectionResult | null; nextOffset: number }> {
  const size = await safeSize(filePath);
  if (size === null) {
    return { detection: null, nextOffset: offset };
  }
  if (size < offset) {
    offset = 0;
  }
  if (size <= offset) {
    return { detection: null, nextOffset: offset };
  }

  const stream = createReadStream(filePath, {
    encoding: "utf8",
    start: offset,
  });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let found: LimitDetectionResult | null = null;

  try {
    for await (const line of rl) {
      if (!lineIsAfter(sinceMs, line)) continue;
      const detection = detectLimitFromTranscriptLine(line);
      if (detection?.detected) {
        found = detection;
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return { detection: found, nextOffset: size };
}

function lineIsAfter(sinceMs: number, line: string): boolean {
  try {
    const obj = JSON.parse(line) as { timestamp?: string };
    if (typeof obj.timestamp === "string") {
      const t = Date.parse(obj.timestamp);
      if (!Number.isNaN(t)) return t >= sinceMs;
    }
  } catch {
    // keep — non-JSON already handled by detector
  }
  return true;
}
