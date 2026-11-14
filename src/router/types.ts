import { z } from "zod";
import { EffortLevel, ModelId } from "../registry/models.js";
import { OptimizationProfile } from "../registry/profiles.js";

export const TaskCategorySchema = z.enum([
  "documentation",
  "test_generation",
  "explanation",
  "refactoring",
  "debugging",
  "planning",
  "architecture",
  "review",
  "execution",
  "security_audit",
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

export const TaskComplexitySchema = z.enum(["low", "medium", "high"]);
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>;

export interface PhaseAllocation {
  model: ModelId;
  effort: EffortLevel;
  tools: string[];
  rationale: string;
}

export interface RoutingDecision {
  taskId: string;
  category: TaskCategory;
  complexity: TaskComplexity;
  complexityScore: number;
  confidence: number;
  profile: OptimizationProfile;
  phases: {
    plan?: PhaseAllocation | undefined;
    execution: PhaseAllocation;
    verification?: PhaseAllocation | undefined;
  };
  explanation: string;
  estimatedTokens: {
    input: number;
    output: number;
  };
  estimatedCostUsd: number;
}
