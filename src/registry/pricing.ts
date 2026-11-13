import { z } from "zod";
import { getModelCapability, ModelId } from "./models.js";

export interface TokenUsageEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCacheReadTokens?: number;
}

export interface CostEstimateResult {
  modelId: ModelId;
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCostUsd: number;
  totalCostUsd: number;
  tokens: TokenUsageEstimate;
}

export function calculateCostEstimate(
  modelId: ModelId,
  tokens: TokenUsageEstimate,
): CostEstimateResult {
  const cap = getModelCapability(modelId);
  const inputCost = (tokens.estimatedInputTokens / 1_000_000) * cap.costPerMillionInputTokensUsd;
  const outputCost = (tokens.estimatedOutputTokens / 1_000_000) * cap.costPerMillionOutputTokensUsd;
  const cacheCost =
    ((tokens.estimatedCacheReadTokens ?? 0) / 1_000_000) * cap.costPerMillionCacheReadTokensUsd;
  const total = Number((inputCost + outputCost + cacheCost).toFixed(6));

  return {
    modelId,
    inputCostUsd: Number(inputCost.toFixed(6)),
    outputCostUsd: Number(outputCost.toFixed(6)),
    cacheCostUsd: Number(cacheCost.toFixed(6)),
    totalCostUsd: total,
    tokens,
  };
}
