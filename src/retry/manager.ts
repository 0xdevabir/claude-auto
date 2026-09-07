import { fallbackResetAt, withResetBuffer } from "../reset/calculator.js";
import type { LimitDetectionResult } from "../limit/types.js";
import type { ClaudeAutoConfig } from "../config/defaults.js";
import { RetryPolicy } from "./policy.js";

export interface WaitPlan {
  resetAt: Date;
  retryAt: Date;
  usedFallback: boolean;
  usedBackoff: boolean;
  reason: string;
}

export class RetryManager {
  private readonly policy: RetryPolicy;
  private sawExplicitReset = false;

  constructor(private readonly config: ClaudeAutoConfig) {
    this.policy = new RetryPolicy(config);
  }

  planFromDetection(detection: LimitDetectionResult, now: Date = new Date()): WaitPlan {
    if (detection.resetAt) {
      this.sawExplicitReset = true;
      this.policy.resetUncertain();
      return {
        resetAt: detection.resetAt,
        retryAt: withResetBuffer(detection.resetAt, this.config.resetBufferSeconds),
        usedFallback: false,
        usedBackoff: false,
        reason: "parsed_reset",
      };
    }

    if (detection.retryAfterSeconds !== undefined) {
      this.policy.resetUncertain();
      const resetAt = fallbackResetAt(now, detection.retryAfterSeconds);
      return {
        resetAt,
        retryAt: withResetBuffer(resetAt, this.config.resetBufferSeconds),
        usedFallback: false,
        usedBackoff: false,
        reason: "retry_after_seconds",
      };
    }

    const waitSeconds = this.sawExplicitReset
      ? this.policy.nextUncertainWaitSeconds()
      : this.policy.consumeFallbackOrBackoff(this.config.fallbackResetSeconds);

    const usedFallback =
      !this.sawExplicitReset && waitSeconds === this.config.fallbackResetSeconds;
    const resetAt = fallbackResetAt(now, waitSeconds);
    return {
      resetAt,
      retryAt: withResetBuffer(resetAt, this.config.resetBufferSeconds),
      usedFallback,
      usedBackoff: !usedFallback,
      reason: usedFallback ? "fallback" : "backoff",
    };
  }
}
