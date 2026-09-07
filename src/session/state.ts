export type PersistedStatus =
  "idle" | "running" | "waiting" | "resuming" | "completed" | "error" | "cancelled";

export interface PersistedState {
  sessionId: string | null;
  startedAt: string | null;
  resumeCount: number;
  status: PersistedStatus;
  resetAt: string | null;
  mode: "interactive" | "print" | "mock" | null;
  lastError: string | null;
  cwd: string | null;
  prompt: string | null;
}

export function emptyState(): PersistedState {
  return {
    sessionId: null,
    startedAt: null,
    resumeCount: 0,
    status: "idle",
    resetAt: null,
    mode: null,
    lastError: null,
    cwd: null,
    prompt: null,
  };
}
