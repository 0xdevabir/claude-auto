import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class AutoExecuteWorkflow extends BaseWorkflow {
  readonly name = "Auto Execute";
  readonly category: TaskCategory = "execution";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    return {
      success: true,
      summary: `Auto Execute prepared execution bundle using ${routing.phases.execution.model} (effort: ${routing.phases.execution.effort}). ${routing.explanation}`,
    };
  }
}
