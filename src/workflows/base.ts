import { defaultModelRouter, ModelRouterEngine } from "../router/engine.js";
import { TaskCategory } from "../router/types.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export abstract class BaseWorkflow {
  abstract readonly name: string;
  abstract readonly category: TaskCategory;

  protected router: ModelRouterEngine = defaultModelRouter;

  async run(ctx: WorkflowContext): Promise<WorkflowResult> {
    const start = Date.now();

    const routing = await this.router.route(
      {
        prompt: ctx.prompt,
        targetPaths: ctx.targetPaths,
        workingDir: ctx.workingDir,
      },
      {
        categoryOverride: this.category,
        profile: ctx.profile ?? "balanced",
      },
    );

    if (ctx.dryRun) {
      return {
        workflowName: this.name,
        success: true,
        routing,
        summary: `Dry-run completed for ${this.name}. ${routing.explanation}`,
        durationMs: Date.now() - start,
      };
    }

    const result = await this.executeWorkflow(ctx, routing);
    return {
      ...result,
      workflowName: this.name,
      routing,
      durationMs: Date.now() - start,
    };
  }

  protected abstract executeWorkflow(
    ctx: WorkflowContext,
    routing: ReturnType<ModelRouterEngine["route"]> extends Promise<infer T> ? T : never,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">>;
}
