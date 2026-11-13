import { describe, expect, it } from "vitest";
import { getModelCapability, MODEL_REGISTRY } from "../../src/registry/models.js";
import { calculateCostEstimate } from "../../src/registry/pricing.js";
import { OPTIMIZATION_PROFILES } from "../../src/registry/profiles.js";

describe("Model Registry & Pricing", () => {
  it("registers all supported models with required capabilities", () => {
    expect(MODEL_REGISTRY.haiku).toBeDefined();
    expect(MODEL_REGISTRY.sonnet).toBeDefined();
    expect(MODEL_REGISTRY.opus).toBeDefined();
    expect(MODEL_REGISTRY.opusplan).toBeDefined();
    expect(MODEL_REGISTRY["sonnet[1m]"]).toBeDefined();
    expect(MODEL_REGISTRY["opus[1m]"]).toBeDefined();

    expect(MODEL_REGISTRY.sonnet.supportsExtendedThinking).toBe(true);
    expect(MODEL_REGISTRY.haiku.supportsExtendedThinking).toBe(false);
  });

  it("calculates accurate cost estimates", () => {
    const est = calculateCostEstimate("sonnet", {
      estimatedInputTokens: 10_000,
      estimatedOutputTokens: 2_000,
    });

    expect(est.modelId).toBe("sonnet");
    expect(est.inputCostUsd).toBe(0.03);
    expect(est.outputCostUsd).toBe(0.03);
    expect(est.totalCostUsd).toBe(0.06);
  });

  it("exposes all three optimization profiles", () => {
    expect(OPTIMIZATION_PROFILES.economy).toBeDefined();
    expect(OPTIMIZATION_PROFILES.balanced).toBeDefined();
    expect(OPTIMIZATION_PROFILES.quality).toBeDefined();
  });

  it("throws for unknown model ids", () => {
    // @ts-expect-error testing invalid id
    expect(() => getModelCapability("invalid-model")).toThrow();
  });
});
