import { ConfigurationError } from "../errors/errors.js";
import type { ClaudeAutoConfig } from "./defaults.js";

function expectNumber(name: string, value: unknown, min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw new ConfigurationError(
      `Invalid config "${name}": expected a number >= ${min}.`,
    );
  }
  return value;
}

function expectBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ConfigurationError(`Invalid config "${name}": expected a boolean.`);
  }
  return value;
}

function expectString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ConfigurationError(
      `Invalid config "${name}": expected a non-empty string.`,
    );
  }
  return value;
}

export function validateConfig(
  partial: Partial<ClaudeAutoConfig>,
  base: ClaudeAutoConfig,
): ClaudeAutoConfig {
  const merged: ClaudeAutoConfig = { ...base, ...partial };

  merged.fallbackResetSeconds = expectNumber(
    "fallbackResetSeconds",
    merged.fallbackResetSeconds,
    0,
  );
  merged.resetBufferSeconds = expectNumber(
    "resetBufferSeconds",
    merged.resetBufferSeconds,
    0,
  );
  merged.maxAutoResumes = expectNumber("maxAutoResumes", merged.maxAutoResumes, 0);
  merged.continuationPrompt = expectString(
    "continuationPrompt",
    merged.continuationPrompt,
  );
  merged.countdown = expectBoolean("countdown", merged.countdown);
  merged.verbose = expectBoolean("verbose", merged.verbose);
  merged.autoResume = expectBoolean("autoResume", merged.autoResume);
  merged.backoffInitialSeconds = expectNumber(
    "backoffInitialSeconds",
    merged.backoffInitialSeconds,
    1,
  );
  merged.backoffMultiplier = expectNumber(
    "backoffMultiplier",
    merged.backoffMultiplier,
    1,
  );
  merged.backoffMaxSeconds = expectNumber(
    "backoffMaxSeconds",
    merged.backoffMaxSeconds,
    1,
  );
  merged.mockLimitAfterMs = expectNumber("mockLimitAfterMs", merged.mockLimitAfterMs, 0);
  merged.mockResetAfterMs = expectNumber("mockResetAfterMs", merged.mockResetAfterMs, 0);
  merged.mockCompleteAfterMs = expectNumber(
    "mockCompleteAfterMs",
    merged.mockCompleteAfterMs,
    0,
  );

  return merged;
}

export function parseConfigFile(raw: unknown): Partial<ClaudeAutoConfig> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ConfigurationError("Config file must contain a JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  const out: Partial<ClaudeAutoConfig> = {};

  const numberKeys = [
    "fallbackResetSeconds",
    "resetBufferSeconds",
    "maxAutoResumes",
    "backoffInitialSeconds",
    "backoffMultiplier",
    "backoffMaxSeconds",
    "mockLimitAfterMs",
    "mockResetAfterMs",
    "mockCompleteAfterMs",
  ] as const;
  for (const key of numberKeys) {
    if (key in obj) {
      const v = obj[key];
      if (typeof v !== "number") {
        throw new ConfigurationError(`Config "${key}" must be a number.`);
      }
      out[key] = v;
    }
  }

  const boolKeys = ["countdown", "verbose", "autoResume"] as const;
  for (const key of boolKeys) {
    if (key in obj) {
      const v = obj[key];
      if (typeof v !== "boolean") {
        throw new ConfigurationError(`Config "${key}" must be a boolean.`);
      }
      out[key] = v;
    }
  }

  if ("continuationPrompt" in obj) {
    const v = obj.continuationPrompt;
    if (typeof v !== "string") {
      throw new ConfigurationError('Config "continuationPrompt" must be a string.');
    }
    out.continuationPrompt = v;
  }

  return out;
}
