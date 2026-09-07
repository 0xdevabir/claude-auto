/** Patterns derived from Claude Code error docs and common CLI wording. */

export interface TextPattern {
  readonly name: string;
  readonly regex: RegExp;
  readonly type:
    | "usage_limit"
    | "rate_limit"
    | "temporary_error"
    | "authentication_error"
    | "network_error"
    | "permission_error"
    | "invalid_command"
    | "session_error";
  readonly confidence: number;
  readonly retryable: boolean;
}

export const LIMIT_PATTERNS: readonly TextPattern[] = [
  {
    name: "session_limit",
    regex: /you(?:'|’)ve hit your (?:session|weekly|opus) limit/i,
    type: "usage_limit",
    confidence: 0.98,
    retryable: true,
  },
  {
    name: "usage_limit_reached",
    regex: /usage limit (?:reached|exceeded)|hit your usage limit/i,
    type: "usage_limit",
    confidence: 0.95,
    retryable: true,
  },
  {
    name: "spend_limit",
    regex: /spend limit (?:reached|exceeded)|monthly spend limit/i,
    type: "usage_limit",
    confidence: 0.9,
    retryable: true,
  },
  {
    name: "rate_limit_reached",
    regex: /rate limit reached|API Error:\s*Rate limit/i,
    type: "rate_limit",
    confidence: 0.92,
    retryable: true,
  },
  {
    name: "request_rejected_429",
    regex: /request rejected\s*\(429\)|status(?:\s*code)?\s*429\b/i,
    type: "rate_limit",
    confidence: 0.9,
    retryable: true,
  },
  {
    name: "temporary_limiting",
    regex: /server is temporarily limiting requests/i,
    type: "temporary_error",
    confidence: 0.88,
    retryable: true,
  },
  {
    name: "out_of_credits",
    regex: /credit balance is too low|out of credits|usage credits required/i,
    type: "usage_limit",
    confidence: 0.85,
    retryable: true,
  },
];

export const NON_LIMIT_PATTERNS: readonly TextPattern[] = [
  {
    name: "auth_failed",
    regex: /authentication failed|not authenticated|invalid api key|unauthorized/i,
    type: "authentication_error",
    confidence: 0.95,
    retryable: false,
  },
  {
    name: "permission_denied",
    regex: /permission denied|permissions? (?:prompt|required)|not authorized to/i,
    type: "permission_error",
    confidence: 0.9,
    retryable: false,
  },
  {
    name: "command_not_found",
    regex: /command not found|unknown (?:option|command)|invalid (?:request|option)/i,
    type: "invalid_command",
    confidence: 0.9,
    retryable: false,
  },
  {
    name: "network_failed",
    regex:
      /network (?:connection )?failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|TLS handshake failed/i,
    type: "network_error",
    confidence: 0.9,
    retryable: false,
  },
  {
    name: "session_not_found",
    regex:
      /no conversation found with session id|failed to resume the conversation|session not found/i,
    type: "session_error",
    confidence: 0.95,
    retryable: false,
  },
];

export const RESET_HINT_PATTERNS: readonly RegExp[] = [
  /resets?\s+(?:at\s+)?([^\n·|]+)/i,
  /try again in\s+([^\n.]+)/i,
  /retry after\s+(\d+)\s*seconds?/i,
  /retry[- ]after[:\s]+(\d+)/i,
  /auto-resuming at\s+([^\n·|]+)/i,
];
