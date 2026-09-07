import { LIMIT_PATTERNS, NON_LIMIT_PATTERNS } from "./patterns.js";
import type { LimitDetectionResult, LimitType } from "./types.js";
import { parseResetInfo } from "../reset/parser.js";

export function detectLimit(
  output: string,
  now: Date = new Date(),
): LimitDetectionResult {
  const text = output ?? "";

  for (const pattern of NON_LIMIT_PATTERNS) {
    if (pattern.regex.test(text)) {
      // Non-limits win unless a stronger usage limit is also present with higher priority wording
      const hasUsage = LIMIT_PATTERNS.some(
        (p) => p.type === "usage_limit" && p.regex.test(text),
      );
      if (
        !hasUsage ||
        pattern.type === "session_error" ||
        pattern.type === "authentication_error"
      ) {
        return {
          detected: false,
          type: pattern.type,
          confidence: pattern.confidence,
          rawOutput: text,
          message: pattern.name,
        };
      }
    }
  }

  let best: LimitDetectionResult | null = null;
  for (const pattern of LIMIT_PATTERNS) {
    if (!pattern.regex.test(text)) continue;
    const reset = parseResetInfo(text, now);
    const candidate: LimitDetectionResult = {
      detected: true,
      type: pattern.type,
      confidence: pattern.confidence,
      rawOutput: text,
      message: pattern.name,
    };
    if (reset.resetAt) candidate.resetAt = reset.resetAt;
    if (reset.retryAfterSeconds !== undefined) {
      candidate.retryAfterSeconds = reset.retryAfterSeconds;
    }
    if (!best || candidate.confidence > best.confidence) {
      best = candidate;
    }
  }

  if (best) return best;

  // Soft heuristic: "resets" near "limit" without matching non-limits
  if (/\blimit\b/i.test(text) && /\bresets?\b/i.test(text)) {
    const reset = parseResetInfo(text, now);
    const soft: LimitDetectionResult = {
      detected: true,
      type: "usage_limit" satisfies LimitType,
      confidence: 0.55,
      rawOutput: text,
      message: "soft_limit_resets_heuristic",
    };
    if (reset.resetAt) soft.resetAt = reset.resetAt;
    if (reset.retryAfterSeconds !== undefined) {
      soft.retryAfterSeconds = reset.retryAfterSeconds;
    }
    return soft;
  }

  return {
    detected: false,
    type: "unknown",
    confidence: 0,
    rawOutput: text,
  };
}
