import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class TestGeneratorWorkflow extends BaseWorkflow {
  readonly name = "Test Generator";
  readonly category: TaskCategory = "test_generation";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    return {
      success: true,
      summary: `Test Generator assigned to ${routing.phases.execution.model} (effort: ${routing.phases.execution.effort}) with verification step on ${routing.phases.verification?.model ?? "local runner"}.`,
    };
  }
}
