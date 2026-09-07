export type LimitType =
  | "usage_limit"
  | "rate_limit"
  | "temporary_error"
  | "authentication_error"
  | "network_error"
  | "permission_error"
  | "invalid_command"
  | "session_error"
  | "unknown";

export interface LimitDetectionResult {
  detected: boolean;
  type: LimitType;
  resetAt?: Date;
  retryAfterSeconds?: number;
  confidence: number;
  rawOutput?: string;
  message?: string;
}

export function isRetryableLimit(type: LimitType): boolean {
  return type === "usage_limit" || type === "rate_limit" || type === "temporary_error";
}
