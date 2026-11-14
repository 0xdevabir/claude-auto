import { randomUUID } from "node:crypto";
import { EffortLevel, ModelId } from "../registry/models.js";
import { calculateCostEstimate } from "../registry/pricing.js";
import { OptimizationProfile } from "../registry/profiles.js";
import { globalRoutingCache } from "./cache.js";
import { formatRoutingExplanation } from "./explanation.js";
import { analyzeHeuristics, HeuristicAnalysisInput, HeuristicAnalysisResult } from "./heuristics.js";
import { PhaseAllocation, RoutingDecision, TaskCategory, TaskComplexity } from "./types.js";

export interface RouteTaskOptions {
  categoryOverride?: TaskCategory;
  profile?: OptimizationProfile;
  skipCache?: boolean;
}

export class ModelRouterEngine {
  private cache = globalRoutingCache;

  async route(
    input: HeuristicAnalysisInput,
    options: RouteTaskOptions = {},
  ): Promise<RoutingDecision> {
    const profile: OptimizationProfile = options.profile ?? "balanced";
    const cacheKey = this.cache.computeHash({
      prompt: input.prompt,
      targetPaths: input.targetPaths,
      profile,
      category: options.categoryOverride,
    });

    if (!options.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const analysis = await analyzeHeuristics(input);
    const category: TaskCategory = options.categoryOverride ?? analysis.category;
    const complexity: TaskComplexity = analysis.complexity;

    const phases = this.resolvePhases(category, complexity, profile);

    const estTokens = this.estimateTokenLoad(category, complexity, analysis);
    const costEstimate = calculateCostEstimate(phases.execution.model, {
      estimatedInputTokens: estTokens.input,
      estimatedOutputTokens: estTokens.output,
    });

    const preliminaryDecision = {
      category,
      complexity,
      complexityScore: analysis.complexityScore,
      profile,
      phases,
    };

    const explanation = formatRoutingExplanation(preliminaryDecision, analysis);

    const decision: RoutingDecision = {
      taskId: `task-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`,
      category,
      complexity,
      complexityScore: analysis.complexityScore,
      confidence: analysis.confidence,
      profile,
      phases,
      explanation,
      estimatedTokens: estTokens,
      estimatedCostUsd: costEstimate.totalCostUsd,
    };

    this.cache.set(cacheKey, decision);
    return decision;
  }

  private resolvePhases(
    cat: TaskCategory,
    comp: TaskComplexity,
    profile: OptimizationProfile,
  ): RoutingDecision["phases"] {
    let execModel: ModelId = "sonnet";
    let execEffort: EffortLevel = "medium";
    let planModel: ModelId | undefined;
    let planEffort: EffortLevel | undefined;
    let verifModel: ModelId | undefined;
    let verifEffort: EffortLevel | undefined;

    const baseTools = ["Read", "Grep", "Glob"];
    const execTools = [...baseTools, "Write", "Edit", "Bash"];

    // Category-specific decision matrix with profile biases
    switch (cat) {
      case "documentation":
        execModel = profile === "quality" ? "sonnet" : "haiku";
        execEffort = "low";
        break;

      case "explanation":
        execModel = profile === "quality" ? "sonnet" : comp === "high" ? "sonnet" : "haiku";
        execEffort = profile === "quality" ? "medium" : "low";
        break;

      case "test_generation":
        if (profile === "economy") {
          execModel = "haiku";
          execEffort = "low";
        } else if (profile === "quality" || comp === "high") {
          planModel = "sonnet";
          planEffort = "medium";
          execModel = "sonnet";
          execEffort = "low";
          verifModel = "haiku";
          verifEffort = "low";
        } else {
          execModel = "haiku";
          execEffort = "low";
          verifModel = "haiku";
          verifEffort = "low";
        }
        break;

      case "refactoring":
        if (profile === "economy") {
          execModel = comp === "high" ? "sonnet" : "haiku";
          execEffort = "low";
        } else if (profile === "quality") {
          planModel = "sonnet";
          planEffort = "high";
          execModel = comp === "high" ? "opus" : "sonnet";
          execEffort = "medium";
          verifModel = "sonnet";
          verifEffort = "low";
        } else {
          planModel = comp === "high" ? "sonnet" : undefined;
          planEffort = "medium";
          execModel = "sonnet";
          execEffort = comp === "high" ? "medium" : "low";
          verifModel = "haiku";
          verifEffort = "low";
        }
        break;

      case "debugging":
        if (profile === "economy") {
          execModel = comp === "high" ? "sonnet" : "haiku";
          execEffort = "low";
        } else if (profile === "quality") {
          planModel = "opus";
          planEffort = "high";
          execModel = "sonnet";
          execEffort = "high";
          verifModel = "haiku";
          verifEffort = "low";
        } else {
          if (comp === "high") {
            planModel = "opus";
            planEffort = "medium";
            execModel = "sonnet";
            execEffort = "medium";
          } else {
            execModel = "sonnet";
            execEffort = "low";
          }
          verifModel = "haiku";
          verifEffort = "low";
        }
        break;

      case "planning":
        if (profile === "economy") {
          execModel = "sonnet";
          execEffort = "medium";
        } else if (profile === "quality") {
          execModel = "opus";
          execEffort = "high";
        } else {
          execModel = "opusplan";
          execEffort = "high";
        }
        break;

      case "architecture":
        if (profile === "economy") {
          execModel = "sonnet";
          execEffort = "medium";
        } else if (profile === "quality") {
          execModel = "opus";
          execEffort = "high";
        } else {
          execModel = "opusplan";
          execEffort = "high";
        }
        break;

      case "security_audit":
        if (profile === "economy") {
          execModel = "sonnet";
          execEffort = "low";
        } else if (profile === "quality") {
          execModel = "opus";
          execEffort = "high";
        } else {
          execModel = "sonnet";
          execEffort = "high";
        }
        break;

      case "review":
        if (profile === "economy") {
          execModel = "haiku";
          execEffort = "low";
        } else if (profile === "quality") {
          execModel = comp === "high" ? "opus" : "sonnet";
          execEffort = "high";
        } else {
          execModel = "sonnet";
          execEffort = comp === "high" ? "high" : "medium";
        }
        break;

      case "execution":
      default:
        if (profile === "economy") {
          execModel = "haiku";
          execEffort = "low";
        } else if (profile === "quality") {
          planModel = "sonnet";
          planEffort = "high";
          execModel = "sonnet";
          execEffort = "medium";
          verifModel = "haiku";
          verifEffort = "low";
        } else {
          execModel = "sonnet";
          execEffort = "medium";
          verifModel = "haiku";
          verifEffort = "low";
        }
        break;
    }

    const phases: RoutingDecision["phases"] = {
      execution: {
        model: execModel,
        effort: execEffort,
        tools: cat === "review" ? baseTools : execTools,
        rationale: `Selected ${execModel} (effort: ${execEffort}) for execution under ${profile} profile.`,
      },
    };

    if (planModel) {
      phases.plan = {
        model: planModel,
        effort: planEffort ?? "medium",
        tools: baseTools,
        rationale: `Pre-execution plan mapped to ${planModel} (effort: ${planEffort ?? "medium"}).`,
      };
    }

    if (verifModel) {
      phases.verification = {
        model: verifModel,
        effort: verifEffort ?? "low",
        tools: [...baseTools, "Bash"],
        rationale: `Post-execution verification mapped to ${verifModel} (effort: ${verifEffort ?? "low"}).`,
      };
    }

    return phases;
  }

  private estimateTokenLoad(
    cat: TaskCategory,
    comp: TaskComplexity,
    analysis: HeuristicAnalysisResult,
  ): { input: number; output: number } {
    const baseInput = 1500 + analysis.totalLines * 4 + analysis.gitDiffLines * 3;
    const baseOutput =
      cat === "documentation" || cat === "test_generation" ? 2500 : comp === "high" ? 3500 : 1200;

    return {
      input: Math.min(100_000, baseInput),
      output: Math.min(32_000, baseOutput),
    };
  }
}

export const defaultModelRouter = new ModelRouterEngine();
