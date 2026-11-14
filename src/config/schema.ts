import { ConfigurationError } from "../errors/errors.js";
import { ModelIdSchema } from "../registry/models.js";
import { OptimizationProfileSchema } from "../registry/profiles.js";
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

  // Orchestration validations
  if (partial.optimizationStrategy !== undefined) {
    const parse = OptimizationProfileSchema.safeParse(merged.optimizationStrategy);
    if (!parse.success) {
      throw new ConfigurationError(`Invalid optimizationStrategy: "${merged.optimizationStrategy}". Expected economy, balanced, or quality.`);
    }
  }

  if (partial.defaultPlanningModel !== undefined) {
    const parse = ModelIdSchema.safeParse(merged.defaultPlanningModel);
    if (!parse.success) {
      throw new ConfigurationError(`Invalid defaultPlanningModel: "${merged.defaultPlanningModel}".`);
    }
  }

  if (partial.defaultExecutionModel !== undefined) {
    const parse = ModelIdSchema.safeParse(merged.defaultExecutionModel);
    if (!parse.success) {
      throw new ConfigurationError(`Invalid defaultExecutionModel: "${merged.defaultExecutionModel}".`);
    }
  }

  if (partial.defaultVerificationModel !== undefined) {
    const parse = ModelIdSchema.safeParse(merged.defaultVerificationModel);
    if (!parse.success) {
      throw new ConfigurationError(`Invalid defaultVerificationModel: "${merged.defaultVerificationModel}".`);
    }
  }

  merged.maxParallelTasks = expectNumber("maxParallelTasks", merged.maxParallelTasks, 1);
  merged.approvalRequired = expectBoolean("approvalRequired", merged.approvalRequired);

  if (merged.budgetLimits) {
    merged.budgetLimits.maxCostPerWorkflowUsd = expectNumber(
      "budgetLimits.maxCostPerWorkflowUsd",
      merged.budgetLimits.maxCostPerWorkflowUsd,
      0,
    );
    merged.budgetLimits.monthlyLimitUsd = expectNumber(
      "budgetLimits.monthlyLimitUsd",
      merged.budgetLimits.monthlyLimitUsd,
      0,
    );
    merged.budgetLimits.warnThresholdPercent = expectNumber(
      "budgetLimits.warnThresholdPercent",
      merged.budgetLimits.warnThresholdPercent,
      1,
    );
  }

  // Legacy validations
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
    "maxParallelTasks",
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

  const boolKeys = ["countdown", "verbose", "autoResume", "approvalRequired"] as const;
  for (const key of boolKeys) {
    if (key in obj) {
      const v = obj[key];
      if (typeof v !== "boolean") {
        throw new ConfigurationError(`Config "${key}" must be a boolean.`);
      }
      out[key] = v;
    }
  }

  const stringKeys = [
    "continuationPrompt",
    "optimizationStrategy",
    "defaultPlanningModel",
    "defaultExecutionModel",
    "defaultVerificationModel",
  ] as const;
  for (const key of stringKeys) {
    if (key in obj) {
      const v = obj[key];
      if (typeof v !== "string") {
        throw new ConfigurationError(`Config "${key}" must be a string.`);
      }
      (out as Record<string, unknown>)[key] = v;
    }
  }

  if ("budgetLimits" in obj && typeof obj.budgetLimits === "object" && obj.budgetLimits !== null) {
    out.budgetLimits = obj.budgetLimits as ClaudeAutoConfig["budgetLimits"];
  }

  if ("customModelPricing" in obj && typeof obj.customModelPricing === "object" && obj.customModelPricing !== null) {
    out.customModelPricing = obj.customModelPricing as ClaudeAutoConfig["customModelPricing"];
  }

  if ("workflowPresets" in obj && typeof obj.workflowPresets === "object" && obj.workflowPresets !== null) {
    out.workflowPresets = obj.workflowPresets as ClaudeAutoConfig["workflowPresets"];
  }

  return out;
}
