import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class AutoDebugWorkflow extends BaseWorkflow {
  readonly name = "Auto Debug";
  readonly category: TaskCategory = "debugging";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    const errorSnippet = ctx.prompt ? `for error: "${ctx.prompt.slice(0, 100)}..."` : "";
    return {
      success: true,
      summary: `Auto Debug initialized ${errorSnippet}. Diagnostic phase: ${routing.phases.plan?.model ?? "local"}, Patch phase: ${routing.phases.execution.model}.`,
    };
  }
}
