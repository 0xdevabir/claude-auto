import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class CodeExplanationWorkflow extends BaseWorkflow {
  readonly name = "Code Explanation";
  readonly category: TaskCategory = "explanation";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    return {
      success: true,
      summary: `Code Explanation routed to ${routing.phases.execution.model} (effort: ${routing.phases.execution.effort}). Ready to generate visual diagrams and logic walkthroughs.`,
    };
  }
}
