export class ClaudeAutoError extends Error {
  readonly code: string;
  readonly details?: Record<string, string | number | boolean | undefined>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, string | number | boolean | undefined>,
  ) {
    super(message);
    this.name = "ClaudeAutoError";
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class ClaudeNotInstalledError extends ClaudeAutoError {
  constructor(message = "Claude Code was not found on PATH.") {
    super("CLAUDE_NOT_INSTALLED", message);
    this.name = "ClaudeNotInstalledError";
  }
}

export class ClaudeVersionUnsupportedError extends ClaudeAutoError {
  constructor(version: string) {
    super(
      "CLAUDE_VERSION_UNSUPPORTED",
      `Claude Code version "${version}" does not appear to support required session resume flags.`,
      { version },
    );
    this.name = "ClaudeVersionUnsupportedError";
  }
}

export class SessionNotFoundError extends ClaudeAutoError {
  constructor(sessionId: string) {
    super(
      "SESSION_NOT_FOUND",
      `No Claude Code conversation was found for session ${sessionId}.`,
      { sessionId },
    );
    this.name = "SessionNotFoundError";
  }
}

export class SessionResumeError extends ClaudeAutoError {
  constructor(sessionId: string, reason?: string) {
    super(
      "SESSION_RESUME_ERROR",
      [
        "The Claude Code session could not be resumed.",
        "",
        `Session: ${sessionId}`,
        "",
        "Possible reasons:",
        "- Claude Code no longer has the session",
        "- the session expired",
        "- the installed Claude Code version changed",
        "- resume functionality is unavailable",
        "",
        "No new session was started.",
        reason ? `\nDetail: ${reason}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      { sessionId },
    );
    this.name = "SessionResumeError";
  }
}

export class UsageLimitError extends ClaudeAutoError {
  constructor(message = "Claude usage limit detected.") {
    super("USAGE_LIMIT", message);
    this.name = "UsageLimitError";
  }
}

export class AuthenticationError extends ClaudeAutoError {
  constructor(message = "Claude Code authentication failed.") {
    super("AUTH_ERROR", message);
    this.name = "AuthenticationError";
  }
}

export class NetworkError extends ClaudeAutoError {
  constructor(message = "Network failure while talking to Claude Code.") {
    super("NETWORK_ERROR", message);
    this.name = "NetworkError";
  }
}

export class ConfigurationError extends ClaudeAutoError {
  constructor(message: string) {
    super("CONFIG_ERROR", message);
    this.name = "ConfigurationError";
  }
}

export class ProcessError extends ClaudeAutoError {
  constructor(message: string) {
    super("PROCESS_ERROR", message);
    this.name = "ProcessError";
  }
}

export class MaxResumesError extends ClaudeAutoError {
  constructor(max: number) {
    super(
      "MAX_RESUMES",
      [
        "Maximum automatic resume count reached.",
        "",
        "Claude Auto stopped to prevent an infinite retry loop.",
        `Limit: ${max}`,
      ].join("\n"),
      { max },
    );
    this.name = "MaxResumesError";
  }
}

export class UserCancelledError extends ClaudeAutoError {
  constructor() {
    super("USER_CANCELLED", "Cancelled by user.");
    this.name = "UserCancelledError";
  }
}

export class LockError extends ClaudeAutoError {
  constructor(message: string) {
    super("LOCK_ERROR", message);
    this.name = "LockError";
  }
}

export function formatErrorBanner(err: unknown): string {
  if (err instanceof ClaudeAutoError) {
    return ["Claude Auto Error", "────────────────────────", err.message].join("\n");
  }
  if (err instanceof Error) {
    return ["Claude Auto Error", "────────────────────────", err.message].join("\n");
  }
  return ["Claude Auto Error", "────────────────────────", String(err)].join("\n");
}
