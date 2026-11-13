import { HeuristicAnalysisResult } from "./heuristics.js";
import { PhaseAllocation, RoutingDecision } from "./types.js";

export function formatRoutingExplanation(
  decision: Pick<RoutingDecision, "category" | "complexity" | "complexityScore" | "profile" | "phases">,
  analysis: HeuristicAnalysisResult,
): string {
  const parts: string[] = [];

  parts.push(
    `Classified task as [${decision.category.toUpperCase()}] with [${decision.complexity.toUpperCase()}] complexity (score: ${decision.complexityScore}).`,
  );

  if (analysis.fileCount > 0 || analysis.totalLines > 0 || analysis.gitDiffLines > 0) {
    parts.push(
      `Context: ${analysis.fileCount} file(s), ${analysis.totalLines} lines inspected, ${analysis.gitDiffLines} git diff lines.`,
    );
  }

  const { plan, execution, verification } = decision.phases;

  if (plan) {
    parts.push(`Plan phase → ${plan.model} (effort: ${plan.effort}). ${plan.rationale}`);
  }

  parts.push(
    `Execution phase → ${execution.model} (effort: ${execution.effort}). ${execution.rationale}`,
  );

  if (verification) {
    parts.push(
      `Verification phase → ${verification.model} (effort: ${verification.effort}). ${verification.rationale}`,
    );
  }

  parts.push(`Optimized for [${decision.profile.toUpperCase()}] profile.`);

  return parts.join(" ");
}
