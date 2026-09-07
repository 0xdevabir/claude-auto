import type { LimitDetectionResult } from "./types.js";
import { detectLimit } from "./detector.js";

/**
 * Parse a Claude Code session transcript JSONL line for usage/rate limits.
 * Prefer structured fields (`error`, `apiErrorStatus`, `quotaLimits.resetsAt`).
 */
export function detectLimitFromTranscriptLine(
  line: string,
  now: Date = new Date(),
): LimitDetectionResult | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(trimmed) as unknown;
  } catch {
    return detectLimit(trimmed, now).detected ? detectLimit(trimmed, now) : null;
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const textBlob = extractTextBlob(obj);

  const isRateLimit =
    obj.error === "rate_limit" ||
    obj.apiErrorStatus === 429 ||
    (typeof obj.isApiErrorMessage === "boolean" &&
      obj.isApiErrorMessage &&
      /session limit|usage limit|rate limit/i.test(textBlob));

  if (!isRateLimit) {
    // Fall back to text patterns inside message content
    if (textBlob) {
      const fromText = detectLimit(textBlob, now);
      if (fromText.detected) return fromText;
    }
    return null;
  }

  const quota = obj.quotaLimits;
  let resetAt: Date | undefined;
  let retryAfterSeconds: number | undefined;

  if (quota && typeof quota === "object" && !Array.isArray(quota)) {
    const q = quota as Record<string, unknown>;
    if (typeof q.resetsAt === "number" && Number.isFinite(q.resetsAt)) {
      // Claude stores unix seconds
      const ms = q.resetsAt > 1e12 ? q.resetsAt : q.resetsAt * 1000;
      resetAt = new Date(ms);
    }
    if (
      typeof q.lowPriorityRetryAfterSeconds === "number" &&
      Number.isFinite(q.lowPriorityRetryAfterSeconds)
    ) {
      retryAfterSeconds = q.lowPriorityRetryAfterSeconds;
    }
  }

  if (!resetAt && textBlob) {
    const fromText = detectLimit(textBlob, now);
    if (fromText.resetAt) resetAt = fromText.resetAt;
    if (fromText.retryAfterSeconds !== undefined) {
      retryAfterSeconds = fromText.retryAfterSeconds;
    }
  }

  const result: LimitDetectionResult = {
    detected: true,
    type: "usage_limit",
    confidence: 0.99,
    rawOutput: textBlob || trimmed.slice(0, 500),
    message: "transcript_rate_limit",
  };
  if (resetAt) result.resetAt = resetAt;
  if (retryAfterSeconds !== undefined) result.retryAfterSeconds = retryAfterSeconds;
  return result;
}

function extractTextBlob(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  const message = obj.message;
  if (message && typeof message === "object" && !Array.isArray(message)) {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string") parts.push(content);
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block && typeof block === "object" && !Array.isArray(block)) {
          const text = (block as Record<string, unknown>).text;
          if (typeof text === "string") parts.push(text);
        }
      }
    }
  }
  if (typeof obj.content === "string") parts.push(obj.content);
  return parts.join("\n");
}
