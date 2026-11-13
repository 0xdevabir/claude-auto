import { spawnSync } from "node:child_process";
import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class CodeReviewWorkflow extends BaseWorkflow {
  readonly name = "Code Review";
  readonly category: TaskCategory = "review";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    const cwd = ctx.workingDir ?? process.cwd();
    let diffStats = "No uncommitted git changes found.";

    try {
      const res = spawnSync("git", ["diff", "--stat"], { cwd, encoding: "utf8" });
      if (res.status === 0 && res.stdout.trim()) {
        diffStats = res.stdout.trim();
      }
    } catch {
      // Non-git directory
    }

    return {
      success: true,
      summary: `Code Review dispatched to read-only agent with ${routing.phases.execution.model} (effort: ${routing.phases.execution.effort}).\nDiff summary:\n${diffStats}`,
    };
  }
}
