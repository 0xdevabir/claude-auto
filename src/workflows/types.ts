import { OptimizationProfile } from "../registry/profiles.js";
import { RoutingDecision } from "../router/types.js";

export interface WorkflowContext {
  prompt?: string | undefined;
  targetPaths?: string[] | undefined;
  workingDir?: string | undefined;
  profile?: OptimizationProfile | undefined;
  dryRun?: boolean | undefined;
}

export interface WorkflowResult {
  workflowName: string;
  success: boolean;
  routing: RoutingDecision;
  summary: string;
  generatedArtifacts?: string[];
  durationMs: number;
}
