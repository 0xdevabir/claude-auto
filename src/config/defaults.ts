import { ModelId } from "../registry/models.js";
import { OptimizationProfile } from "../registry/profiles.js";

export interface BudgetLimitsConfig {
  maxCostPerWorkflowUsd: number;
  monthlyLimitUsd: number;
  warnThresholdPercent: number;
}

export interface ModelPricingOverride {
  costPerMillionInputTokensUsd: number;
  costPerMillionOutputTokensUsd: number;
  costPerMillionCacheReadTokensUsd: number;
}

export interface ClaudeAutoConfig {
  // Model Orchestration & Toolkit Config
  optimizationStrategy: OptimizationProfile;
  defaultPlanningModel: ModelId;
  defaultExecutionModel: ModelId;
  defaultVerificationModel: ModelId;
  maxParallelTasks: number;
  approvalRequired: boolean;
  budgetLimits: BudgetLimitsConfig;
  customModelPricing?: Partial<Record<ModelId, ModelPricingOverride>> | undefined;
  workflowPresets?: Record<string, Record<string, unknown>> | undefined;

  // Rate limit / Session wrapper config (backward compatible)
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
  // New Orchestration defaults
  optimizationStrategy: "balanced",
  defaultPlanningModel: "opusplan",
  defaultExecutionModel: "sonnet",
  defaultVerificationModel: "haiku",
  maxParallelTasks: 3,
  approvalRequired: true,
  budgetLimits: {
    maxCostPerWorkflowUsd: 2.00,
    monthlyLimitUsd: 50.00,
    warnThresholdPercent: 80,
  },
  customModelPricing: {},
  workflowPresets: {
    fast: {
      optimizationStrategy: "economy",
      defaultPlanningModel: "sonnet",
      defaultExecutionModel: "haiku",
      defaultVerificationModel: "haiku",
    },
    deep: {
      optimizationStrategy: "quality",
      defaultPlanningModel: "opus",
      defaultExecutionModel: "sonnet",
      defaultVerificationModel: "sonnet",
    },
  },

  // Legacy Rate limit defaults
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
