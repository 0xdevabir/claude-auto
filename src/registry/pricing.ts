import { getModelCapability, ModelCapability, ModelId } from "./models.js";

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
  isCustomPriced?: boolean;
}

export function calculateCostEstimate(
  modelId: ModelId,
  tokens: TokenUsageEstimate,
  pricingOverrides?: Partial<Record<ModelId, {
    costPerMillionInputTokensUsd: number;
    costPerMillionOutputTokensUsd: number;
    costPerMillionCacheReadTokensUsd: number;
  }>>,
): CostEstimateResult {
  const cap = getModelCapability(modelId);
  const override = pricingOverrides?.[modelId];

  const inputRate = override?.costPerMillionInputTokensUsd ?? cap.costPerMillionInputTokensUsd;
  const outputRate = override?.costPerMillionOutputTokensUsd ?? cap.costPerMillionOutputTokensUsd;
  const cacheRate = override?.costPerMillionCacheReadTokensUsd ?? cap.costPerMillionCacheReadTokensUsd;

  const inputCost = (tokens.estimatedInputTokens / 1_000_000) * inputRate;
  const outputCost = (tokens.estimatedOutputTokens / 1_000_000) * outputRate;
  const cacheCost = ((tokens.estimatedCacheReadTokens ?? 0) / 1_000_000) * cacheRate;
  const total = Number((inputCost + outputCost + cacheCost).toFixed(6));

  return {
    modelId,
    inputCostUsd: Number(inputCost.toFixed(6)),
    outputCostUsd: Number(outputCost.toFixed(6)),
    cacheCostUsd: Number(cacheCost.toFixed(6)),
    totalCostUsd: total,
    tokens,
    isCustomPriced: override !== undefined,
  };
}
