import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class CodeRefactorWorkflow extends BaseWorkflow {
  readonly name = "Code Refactor";
  readonly category: TaskCategory = "refactoring";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    return {
      success: true,
      summary: `Code Refactor configured for ${ctx.targetPaths?.join(", ") ?? "workspace"}. Planning: ${routing.phases.plan?.model ?? "none"}, Execution: ${routing.phases.execution.model}.`,
    };
  }
}
