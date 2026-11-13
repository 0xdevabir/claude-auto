import * as clack from "@clack/prompts";
import pc from "picocolors";
import { OptimizationProfile } from "../registry/profiles.js";
import { defaultModelRouter } from "../router/engine.js";
import { AutoDebugWorkflow } from "../workflows/debug.js";
import { DocumentationGeneratorWorkflow } from "../workflows/doc.js";
import { AutoExecuteWorkflow } from "../workflows/execute.js";
import { CodeExplanationWorkflow } from "../workflows/explain.js";
import { SmartPlanWorkflow } from "../workflows/plan.js";
import { CodeRefactorWorkflow } from "../workflows/refactor.js";
import { CodeReviewWorkflow } from "../workflows/review.js";
import { TestGeneratorWorkflow } from "../workflows/test.js";

export async function runInteractiveDashboard(): Promise<number> {
  console.clear();
  clack.intro(pc.bgCyan(pc.black(" Claude Auto — Intelligent Model Orchestration ")));

  const workflowKey = await clack.select({
    message: "Select Developer Workflow:",
    options: [
      { value: "plan", label: "Smart Plan", hint: "High-level architecture & breakdown" },
      { value: "exec", label: "Auto Execute", hint: "Implement feature or execute plan" },
      { value: "review", label: "Code Review", hint: "Inspect git diff & security scan" },
      { value: "debug", label: "Auto Debug", hint: "Diagnose errors & apply fixes" },
      { value: "refactor", label: "Code Refactor", hint: "Clean & modularize code" },
      { value: "test", label: "Test Generator", hint: "Scaffold unit and integration tests" },
      { value: "doc", label: "Documentation Generator", hint: "Generate JSDoc & README specs" },
      { value: "explain", label: "Code Explanation", hint: "Step-by-step walkthrough" },
    ],
  });

  if (clack.isCancel(workflowKey)) {
    clack.cancel("Operation cancelled.");
    return 0;
  }

  const profile = (await clack.select({
    message: "Select Optimization Profile:",
    options: [
      { value: "balanced", label: "Balanced", hint: "Optimal cost & precision (Default)" },
      { value: "economy", label: "Economy", hint: "Aggressive Haiku routing, low effort" },
      { value: "quality", label: "Quality", hint: "Opus & high-effort Sonnet" },
    ],
  })) as OptimizationProfile;

  if (clack.isCancel(profile)) {
    clack.cancel("Operation cancelled.");
    return 0;
  }

  const promptInput = await clack.text({
    message: "Task description / Prompt (optional):",
    placeholder: "e.g. Refactor router to support dynamic subagents",
  });

  if (clack.isCancel(promptInput)) {
    clack.cancel("Operation cancelled.");
    return 0;
  }

  const spinner = clack.spinner();
  spinner.start("Analyzing workspace context & computing deterministic routing...");

  const routing = await defaultModelRouter.route(
    {
      prompt: promptInput || undefined,
    },
    {
      profile,
    },
  );

  spinner.stop("Routing analysis complete!");

  clack.note(
    `• Category:       ${pc.bold(routing.category.toUpperCase())}\n` +
      `• Complexity:     ${pc.bold(routing.complexity.toUpperCase())} (Score: ${routing.complexityScore})\n` +
      `• Execution:      ${pc.green(routing.phases.execution.model)} (effort: ${routing.phases.execution.effort})\n` +
      (routing.phases.plan
        ? `• Planning:       ${pc.magenta(routing.phases.plan.model)} (effort: ${routing.phases.plan.effort})\n`
        : "") +
      (routing.phases.verification
        ? `• Verification:   ${pc.cyan(routing.phases.verification.model)} (effort: ${routing.phases.verification.effort})\n`
        : "") +
      `• Est. Cost:      ${pc.yellow(`$${routing.estimatedCostUsd.toFixed(4)}`)}\n\n` +
      pc.dim(routing.explanation),
    "Model Allocation Summary",
  );

  const confirm = await clack.confirm({
    message: "Proceed with workflow execution?",
    initialValue: true,
  });

  if (clack.isCancel(confirm) || !confirm) {
    clack.cancel("Workflow aborted.");
    return 0;
  }

  const runSpinner = clack.spinner();
  runSpinner.start(`Executing ${workflowKey}...`);

  let workflow;
  switch (workflowKey) {
    case "plan":
      workflow = new SmartPlanWorkflow();
      break;
    case "exec":
      workflow = new AutoExecuteWorkflow();
      break;
    case "review":
      workflow = new CodeReviewWorkflow();
      break;
    case "debug":
      workflow = new AutoDebugWorkflow();
      break;
    case "refactor":
      workflow = new CodeRefactorWorkflow();
      break;
    case "test":
      workflow = new TestGeneratorWorkflow();
      break;
    case "doc":
      workflow = new DocumentationGeneratorWorkflow();
      break;
    case "explain":
    default:
      workflow = new CodeExplanationWorkflow();
      break;
  }

  const result = await workflow.run({
    prompt: promptInput || undefined,
    profile,
  });

  runSpinner.stop("Workflow execution complete!");

  clack.outro(pc.green(result.summary));
  return 0;
}
