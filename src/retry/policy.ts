import type { ClaudeAutoConfig } from "../config/defaults.js";

export function nextBackoffSeconds(
  attempt: number,
  config: Pick<
    ClaudeAutoConfig,
    "backoffInitialSeconds" | "backoffMultiplier" | "backoffMaxSeconds"
  >,
): number {
  const n = Math.max(0, attempt);
  const value = config.backoffInitialSeconds * config.backoffMultiplier ** n;
  return Math.min(config.backoffMaxSeconds, Math.floor(value));
}

export class RetryPolicy {
  private uncertainAttempts = 0;
  private usedFallback = false;

  constructor(
    private readonly config: Pick<
      ClaudeAutoConfig,
      "backoffInitialSeconds" | "backoffMultiplier" | "backoffMaxSeconds"
    >,
  ) {}

  resetUncertain(): void {
    this.uncertainAttempts = 0;
    this.usedFallback = false;
  }

  nextUncertainWaitSeconds(): number {
    const seconds = nextBackoffSeconds(this.uncertainAttempts, this.config);
    this.uncertainAttempts += 1;
    return seconds;
  }

  /** First unknown reset → configured fallback; later → backoff. */
  consumeFallbackOrBackoff(fallbackSeconds: number): number {
    if (!this.usedFallback) {
      this.usedFallback = true;
      return fallbackSeconds;
    }
    return this.nextUncertainWaitSeconds();
  }
}
