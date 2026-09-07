export interface ClaudeAutoConfig {
  fallbackResetSeconds: number;
  resetBufferSeconds: number;
  maxAutoResumes: number;
  continuationPrompt: string;
  countdown: boolean;
  verbose: boolean;
  autoResume: boolean;
  backoffInitialSeconds: number;
  backoffMultiplier: number;
  backoffMaxSeconds: number;
  mockLimitAfterMs: number;
  mockResetAfterMs: number;
  mockCompleteAfterMs: number;
}

export const DEFAULT_CONTINUATION_PROMPT = [
  "Continue from where you stopped.",
  "",
  "Do not repeat completed work.",
  "",
  "Inspect the current project state and continue the original task.",
  "",
  "If there are incomplete changes, finish them.",
  "",
  "Continue working until the original task is complete.",
].join("\n");

export const DEFAULT_CONFIG: ClaudeAutoConfig = {
  fallbackResetSeconds: 1800,
  resetBufferSeconds: 5,
  maxAutoResumes: 20,
  continuationPrompt: DEFAULT_CONTINUATION_PROMPT,
  countdown: true,
  verbose: false,
  autoResume: true,
  backoffInitialSeconds: 30,
  backoffMultiplier: 2,
  backoffMaxSeconds: 900,
  mockLimitAfterMs: 3000,
  mockResetAfterMs: 5000,
  mockCompleteAfterMs: 2000,
};
