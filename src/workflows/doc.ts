import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class DocumentationGeneratorWorkflow extends BaseWorkflow {
  readonly name = "Documentation Generator";
  readonly category: TaskCategory = "documentation";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    return {
      success: true,
      summary: `Documentation Generator assigned to ${routing.phases.execution.model} (effort: ${routing.phases.execution.effort}) optimizing for minimal token cost.`,
    };
  }
}
