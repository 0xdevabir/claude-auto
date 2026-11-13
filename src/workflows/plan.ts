import { promises as fs } from "node:fs";
import path from "node:path";
import { RoutingDecision, TaskCategory } from "../router/types.js";
import { BaseWorkflow } from "./base.js";
import { WorkflowContext, WorkflowResult } from "./types.js";

export class SmartPlanWorkflow extends BaseWorkflow {
  readonly name = "Smart Plan";
  readonly category: TaskCategory = "planning";

  protected async executeWorkflow(
    ctx: WorkflowContext,
    routing: RoutingDecision,
  ): Promise<Omit<WorkflowResult, "workflowName" | "routing" | "durationMs">> {
    const cwd = ctx.workingDir ?? process.cwd();
    const plansDir = path.join(cwd, ".claude-auto", "plans");
    await fs.mkdir(plansDir, { recursive: true });

    const planId = `plan-${Date.now()}`;
    const planFile = path.join(plansDir, `${planId}.md`);

    const planContent = `# Architecture & Implementation Plan: ${ctx.prompt ?? "Feature Blueprint"}

- **Created**: ${new Date().toISOString()}
- **Allocated Model**: ${routing.phases.execution.model} (effort: ${routing.phases.execution.effort})
- **Profile**: ${routing.profile}
- **Estimated Cost**: $${routing.estimatedCostUsd.toFixed(4)}

## 1. High-Level Architecture
${ctx.prompt ? `Objective: ${ctx.prompt}` : "Detailed modular design plan."}

## 2. Target File Scope
${(ctx.targetPaths ?? ["(Auto-detected from workspace)"]).map((p) => `- \`${p}\``).join("\n")}

## 3. Phase Decomposition
1. **Planning**: ${routing.phases.plan?.model ?? "Local Heuristic"}
2. **Execution**: ${routing.phases.execution.model}
3. **Verification**: ${routing.phases.verification?.model ?? "Local Test Runner"}

## 4. Next Steps
Run \`claude-auto exec .claude-auto/plans/${planId}.md\` to execute this plan.
`;

    await fs.writeFile(planFile, planContent, "utf8");

    return {
      success: true,
      summary: `Smart Plan generated successfully at ${planFile}. ${routing.explanation}`,
      generatedArtifacts: [planFile],
    };
  }
}
