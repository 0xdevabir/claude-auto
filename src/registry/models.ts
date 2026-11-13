import { z } from "zod";

export const EffortLevelSchema = z.enum(["low", "medium", "high"]);
export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const ModelIdSchema = z.enum([
  "haiku",
  "sonnet",
  "opus",
  "opusplan",
  "sonnet[1m]",
  "opus[1m]",
]);
export type ModelId = z.infer<typeof ModelIdSchema>;

export const ModelCapabilitySchema = z.object({
  id: ModelIdSchema,
  displayName: z.string(),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportsExtendedThinking: z.boolean(),
  defaultEffort: EffortLevelSchema.optional(),
  costPerMillionInputTokensUsd: z.number().nonnegative(),
  costPerMillionOutputTokensUsd: z.number().nonnegative(),
  costPerMillionCacheReadTokensUsd: z.number().nonnegative(),
  bestFor: z.array(z.string()),
  rateLimitTierPriority: z.number().int(),
});
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

export const MODEL_REGISTRY: Record<ModelId, ModelCapability> = {
  haiku: {
    id: "haiku",
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    supportsExtendedThinking: false,
    costPerMillionInputTokensUsd: 0.80,
    costPerMillionOutputTokensUsd: 4.00,
    costPerMillionCacheReadTokensUsd: 0.08,
    bestFor: ["boilerplate", "unit-tests", "documentation", "lint-fixes", "fast-triage"],
    rateLimitTierPriority: 1,
  },
  sonnet: {
    id: "sonnet",
    displayName: "Claude 3.7 Sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsExtendedThinking: true,
    defaultEffort: "medium",
    costPerMillionInputTokensUsd: 3.00,
    costPerMillionOutputTokensUsd: 15.00,
    costPerMillionCacheReadTokensUsd: 0.30,
    bestFor: ["implementation", "refactoring", "complex-debugging", "code-review"],
    rateLimitTierPriority: 2,
  },
  opus: {
    id: "opus",
    displayName: "Claude 3.7 Opus",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsExtendedThinking: true,
    defaultEffort: "high",
    costPerMillionInputTokensUsd: 15.00,
    costPerMillionOutputTokensUsd: 75.00,
    costPerMillionCacheReadTokensUsd: 1.50,
    bestFor: ["system-architecture", "subtle-concurrency-bugs", "formal-specifications"],
    rateLimitTierPriority: 3,
  },
  opusplan: {
    id: "opusplan",
    displayName: "Opus Plan (Opus planning + Sonnet execution)",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsExtendedThinking: true,
    defaultEffort: "high",
    costPerMillionInputTokensUsd: 6.00,
    costPerMillionOutputTokensUsd: 30.00,
    costPerMillionCacheReadTokensUsd: 0.60,
    bestFor: ["smart-plan-to-execute"],
    rateLimitTierPriority: 2,
  },
  "sonnet[1m]": {
    id: "sonnet[1m]",
    displayName: "Claude 3.7 Sonnet (1M Context)",
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    supportsExtendedThinking: true,
    costPerMillionInputTokensUsd: 6.00,
    costPerMillionOutputTokensUsd: 22.50,
    costPerMillionCacheReadTokensUsd: 0.60,
    bestFor: ["repository-wide-refactoring", "massive-monorepo-analysis"],
    rateLimitTierPriority: 4,
  },
  "opus[1m]": {
    id: "opus[1m]",
    displayName: "Claude 3.7 Opus (1M Context)",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    supportsExtendedThinking: true,
    costPerMillionInputTokensUsd: 30.00,
    costPerMillionOutputTokensUsd: 112.50,
    costPerMillionCacheReadTokensUsd: 3.00,
    bestFor: ["full-codebase-architecture-migration"],
    rateLimitTierPriority: 5,
  },
};

export function getModelCapability(id: ModelId): ModelCapability {
  const model = MODEL_REGISTRY[id];
  if (!model) {
    throw new Error(`Unsupported model id: ${id}`);
  }
  return model;
}
