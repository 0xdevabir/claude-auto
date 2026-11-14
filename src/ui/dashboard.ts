import * as clack from "@clack/prompts";
import chalk from "chalk";
import { defaultTaskAnalyzer } from "../analyzer/task-analyzer.js";
import { loadConfig, saveConfig } from "../config/manager.js";
import { defaultCostTracker } from "../cost/tracker.js";
import { defaultTaskDecomposer } from "../distribution/decomposer.js";
import { defaultTaskScheduler } from "../distribution/scheduler.js";
import { defaultExecutionEngine } from "../execution/executor.js";
import { defaultPlanningEngine } from "../planning/planner.js";
import { OptimizationProfile } from "../registry/profiles.js";
import { defaultModelRouter } from "../router/engine.js";
import { defaultVerificationEngine } from "../verification/verifier.js";
import { AutoDebugWorkflow } from "../workflows/debug.js";
import { DocumentationGeneratorWorkflow } from "../workflows/doc.js";
import { CodeRefactorWorkflow } from "../workflows/refactor.js";
import { CodeReviewWorkflow } from "../workflows/review.js";
import { TestGeneratorWorkflow } from "../workflows/test.js";

export async function runInteractiveDashboard(): Promise<number> {
  console.clear();
  clack.intro(chalk.bgCyan.black.bold(" Claude Auto — Intelligent Productivity & Model Orchestration "));

  const menuChoice = await clack.select({
    message: "Select an option from the main menu:",
    options: [
      { value: "route", label: "1. Auto Route", hint: "Analyze complexity & get deterministic model allocation" },
      { value: "plan", label: "2. Smart Plan", hint: "Generate modular architecture & execution roadmap" },
      { value: "distribute", label: "3. Smart Distribution", hint: "Decompose task into dependency DAG" },
      { value: "parallel", label: "4. Parallel Execution", hint: "Execute independent DAG tasks concurrently" },
      { value: "debug", label: "5. Auto Debug", hint: "Isolate root cause, apply patch & verify" },
      { value: "review", label: "6. Code Review", hint: "Inspect git diff for security & quality flaws" },
      { value: "refactor", label: "7. Refactor", hint: "Clean, extract & optimize target files safely" },
      { value: "test", label: "8. Test Generator", hint: "Scaffold resilient unit and integration tests" },
      { value: "doc", label: "9. Documentation Generator", hint: "Generate JSDoc and architecture specs" },
      { value: "optimizer", label: "10. Token Optimizer", hint: "Audit cache, profiles & token reduction strategies" },
      { value: "stats", label: "11. Usage Statistics", hint: "View token consumption, costs & savings" },
      { value: "config", label: "12. Configuration", hint: "Configure profiles, default models & budget limits" },
    ],
  });

  if (clack.isCancel(menuChoice)) {
    clack.cancel("Operation cancelled.");
    return 0;
  }

  const { config } = await loadConfig();

  switch (menuChoice) {
    case "route": {
      const prompt = await clack.text({
        message: "Enter task prompt or description:",
        placeholder: "e.g. Refactor authentication to support OAuth2 tokens",
      });
      if (clack.isCancel(prompt)) return 0;

      const s = clack.spinner();
      s.start("Computing deterministic task analysis & routing...");
      const startMs = Date.now();
      const analysis = await defaultTaskAnalyzer.analyze({ prompt });
      const routing = await defaultModelRouter.route({ prompt }, { profile: config.optimizationStrategy });
      const overheadMs = Date.now() - startMs;
      s.stop("Analysis complete!");

      clack.note(
        `• Category:       ${chalk.bold(analysis.category.toUpperCase())}\n` +
          `• Complexity:     ${chalk.bold(analysis.complexity.toUpperCase())} (Score: ${analysis.complexityScore})\n` +
          `• Security Flag:  ${analysis.security.isSecuritySensitive ? chalk.red("YES (Flags: " + analysis.security.flags.join(", ") + ")") : chalk.green("Clean")}\n` +
          `• Architecture:   ${analysis.architecture.isArchitecturalChange ? chalk.yellow("Cross-subsystem impact") : "Localized"}\n` +
          `• Execution:      ${chalk.green(routing.phases.execution.model)} (effort: ${routing.phases.execution.effort})\n` +
          (routing.phases.plan ? `• Planning:       ${chalk.magenta(routing.phases.plan.model)} (effort: ${routing.phases.plan.effort})\n` : "") +
          (routing.phases.verification ? `• Verification:   ${chalk.cyan(routing.phases.verification.model)} (effort: ${routing.phases.verification.effort})\n` : "") +
          `• Est. Cost:      ${chalk.yellow(`$${routing.estimatedCostUsd.toFixed(4)}`)}\n` +
          `• Routing Time:   ${chalk.dim(`${overheadMs} ms (local, zero AI calls)`)}\n\n` +
          chalk.dim(routing.explanation),
        "Auto Route Allocation",
      );

      await defaultCostTracker.recordUsage({
        workflowId: routing.taskId,
        modelId: routing.phases.execution.model,
        isEstimated: true,
        inputTokens: routing.estimatedTokens.input,
        outputTokens: routing.estimatedTokens.output,
        cacheReadTokens: 0,
        routingOverheadMs: overheadMs,
      });

      clack.outro(chalk.green("Routing decision computed and recorded."));
      return 0;
    }

    case "plan": {
      const prompt = await clack.text({
        message: "Enter feature or system design goal:",
        placeholder: "e.g. Build distributed pub-sub message queue",
      });
      if (clack.isCancel(prompt)) return 0;

      const s = clack.spinner();
      s.start("Analyzing workspace & scaffolding implementation plan...");
      const planArtifact = await defaultPlanningEngine.generatePlan({
        prompt,
        profile: config.optimizationStrategy,
      });
      s.stop("Plan generated!");

      clack.note(
        `Plan ID: \`${planArtifact.planId}\`\n` +
          `Artifact: ${chalk.cyan(planArtifact.markdownPath)}\n` +
          `Tasks: ${planArtifact.distributionPlan.tasks.length} decomposed atomic steps\n` +
          `Batches: ${planArtifact.distributionPlan.executionBatches.length} sequential waves`,
        "Smart Plan Ready",
      );

      const proceed = await clack.confirm({
        message: "Approve plan for execution?",
        initialValue: true,
      });
      if (clack.isCancel(proceed) || !proceed) {
        clack.outro(chalk.yellow("Plan saved. You can inspect or run it later with `claude-auto exec`."));
        return 0;
      }

      clack.outro(chalk.green(`Plan approved! Run 'claude-auto exec ${planArtifact.planId}' to implement.`));
      return 0;
    }

    case "distribute": {
      const prompt = await clack.text({
        message: "Enter task to decompose into DAG:",
        placeholder: "e.g. Modernize database schema and rewrite repositories",
      });
      if (clack.isCancel(prompt)) return 0;

      const s = clack.spinner();
      s.start("Decomposing task and resolving dependencies...");
      const analysis = await defaultTaskAnalyzer.analyze({ prompt });
      const plan = await defaultTaskDecomposer.decompose(analysis, config.optimizationStrategy);
      s.stop("Task decomposition complete!");

      const taskLines = plan.tasks.map((t) =>
        `• [${t.id}] ${t.name} → ${chalk.green(t.allocatedModel)} (deps: ${t.dependencies.length > 0 ? t.dependencies.join(", ") : "none"})`,
      );

      clack.note(
        `Total Subtasks: ${plan.tasks.length}\n` +
          `Execution Waves: ${plan.executionBatches.length}\n` +
          `Conflicts Resolved: ${plan.detectedConflicts.length}\n\n` +
          taskLines.join("\n"),
        "Distribution DAG Breakdown",
      );

      clack.outro(chalk.green("Smart distribution complete."));
      return 0;
    }

    case "parallel": {
      const prompt = await clack.text({
        message: "Enter task for parallel distributed execution:",
        placeholder: "e.g. Scaffold comprehensive API routes and unit test suites",
      });
      if (clack.isCancel(prompt)) return 0;

      const s = clack.spinner();
      s.start("Planning distribution DAG...");
      const analysis = await defaultTaskAnalyzer.analyze({ prompt });
      const plan = await defaultTaskDecomposer.decompose(analysis, config.optimizationStrategy);
      s.stop(`DAG constructed with ${plan.tasks.length} tasks across ${plan.executionBatches.length} waves.`);

      const budgetCheck = await defaultCostTracker.checkBudget(plan.totalEstimatedCostUsd, config.budgetLimits);
      if (budgetCheck.warningMessage) {
        clack.log.warn(chalk.yellow(budgetCheck.warningMessage));
      }

      const pSpinner = clack.spinner();
      pSpinner.start("Executing parallel task waves...");

      const summary = await defaultTaskScheduler.executePlan(
        plan,
        async (task) => {
          const res = await defaultExecutionEngine.executeTask(task, { dryRun: false });
          return {
            summary: res.summary,
            modifiedFiles: res.modifiedFiles,
          };
        },
        {
          maxParallelTasks: config.maxParallelTasks,
          hooks: {
            onTaskStart: (t) => pSpinner.message(`Running [${t.id}] ${t.name} on ${t.allocatedModel}...`),
          },
        },
      );

      pSpinner.stop("Parallel execution complete!");

      clack.note(
        `• Completed: ${chalk.green(summary.completedTasks)} / ${summary.totalTasks}\n` +
          `• Failed:    ${summary.failedTasks > 0 ? chalk.red(summary.failedTasks) : "0"}\n` +
          `• Skipped:   ${summary.skippedTasks > 0 ? chalk.yellow(summary.skippedTasks) : "0"}\n` +
          `• Duration:  ${Math.round(summary.durationMs / 1000)}s\n` +
          `• Modified Files: ${summary.modifiedFiles.length > 0 ? summary.modifiedFiles.join(", ") : "None"}`,
        "Execution Summary",
      );

      const verif = await defaultVerificationEngine.verify({
        expectedFiles: summary.modifiedFiles,
      });

      if (verif.overallSuccess) {
        clack.outro(chalk.green(`✔ ${verif.summary}`));
      } else {
        clack.outro(chalk.red(`✖ ${verif.summary}`));
      }
      return 0;
    }

    case "debug": {
      const errInput = await clack.text({
        message: "Enter error message, stack trace or failing command:",
        placeholder: "e.g. TypeError: Cannot read properties of undefined in auth.ts:58",
      });
      if (clack.isCancel(errInput)) return 0;

      const s = clack.spinner();
      s.start("Triaging error and generating fix plan...");
      const wf = new AutoDebugWorkflow();
      const res = await wf.run({ prompt: errInput, profile: config.optimizationStrategy });
      s.stop("Diagnostic complete!");

      clack.note(res.summary, "Auto Debug Status");
      clack.outro(chalk.green("Debugging routine configured."));
      return 0;
    }

    case "review": {
      const s = clack.spinner();
      s.start("Scanning repository git diff and static analysis triggers...");
      const wf = new CodeReviewWorkflow();
      const res = await wf.run({ profile: config.optimizationStrategy });
      s.stop("Review analysis complete!");

      clack.note(res.summary, "Code Review Summary");
      clack.outro(chalk.green("Code review dispatched."));
      return 0;
    }

    case "refactor": {
      const target = await clack.text({
        message: "Target file or directory to refactor:",
        placeholder: "e.g. src/router/engine.ts",
      });
      if (clack.isCancel(target)) return 0;

      const s = clack.spinner();
      s.start("Evaluating refactoring boundaries...");
      const wf = new CodeRefactorWorkflow();
      const res = await wf.run({ targetPaths: [target], profile: config.optimizationStrategy });
      s.stop("Refactor plan ready!");

      clack.note(res.summary, "Refactor Routine");
      clack.outro(chalk.green("Refactor routine initialized."));
      return 0;
    }

    case "test": {
      const target = await clack.text({
        message: "Target file to generate tests for:",
        placeholder: "e.g. src/distribution/dag.ts",
      });
      if (clack.isCancel(target)) return 0;

      const s = clack.spinner();
      s.start("Scaffolding test suite...");
      const wf = new TestGeneratorWorkflow();
      const res = await wf.run({ targetPaths: [target], profile: config.optimizationStrategy });
      s.stop("Test generation prepared!");

      clack.note(res.summary, "Test Generator Status");
      clack.outro(chalk.green("Test generation complete."));
      return 0;
    }

    case "doc": {
      const target = await clack.text({
        message: "Target file or module to document:",
        placeholder: "e.g. src/analyzer/task-analyzer.ts",
      });
      if (clack.isCancel(target)) return 0;

      const s = clack.spinner();
      s.start("Generating documentation spec...");
      const wf = new DocumentationGeneratorWorkflow();
      const res = await wf.run({ targetPaths: [target], profile: config.optimizationStrategy });
      s.stop("Documentation prepared!");

      clack.note(res.summary, "Documentation Status");
      clack.outro(chalk.green("Documentation complete."));
      return 0;
    }

    case "optimizer": {
      const s = clack.spinner();
      s.start("Inspecting token efficiency & routing metrics...");
      const stats = await defaultCostTracker.getUsageSummary();
      s.stop("Optimization analysis complete!");

      clack.note(
        `• Current Profile:      ${chalk.bold(config.optimizationStrategy.toUpperCase())}\n` +
          `• Total Spend:          ${chalk.yellow(`$${stats.totalCostUsd.toFixed(3)}`)}\n` +
          `• Estimated Savings:    ${chalk.green(`$${stats.costComparison.dollarsSaved.toFixed(3)} (${stats.costComparison.percentageSaved}%)`)}\n` +
          `• Avg Routing Overhead: ${chalk.dim(`${stats.averageRoutingOverheadMs} ms`)}\n\n` +
          `Recommendations:\n` +
          stats.recommendations.map((r) => `  - ${r}`).join("\n"),
        "Token & Cost Optimization",
      );

      clack.outro(chalk.green("Optimization audit complete."));
      return 0;
    }

    case "stats": {
      const s = clack.spinner();
      s.start("Loading usage statistics...");
      const stats = await defaultCostTracker.getUsageSummary();
      s.stop("Stats loaded!");

      clack.note(
        `• Workflows Tracked: ${stats.totalWorkflows} (${stats.measuredCount} measured, ${stats.estimatedCount} estimated)\n` +
          `• Total Cost:        ${chalk.yellow(`$${stats.totalCostUsd.toFixed(4)}`)}\n` +
          `• Total Input:       ${stats.totalInputTokens.toLocaleString()} tokens\n` +
          `• Total Output:      ${stats.totalOutputTokens.toLocaleString()} tokens\n` +
          `• Routed Spend:      $${stats.costComparison.routedCostUsd.toFixed(3)}\n` +
          `• Baseline (Opus):   $${stats.costComparison.unroutedOpusCostUsd.toFixed(3)}\n` +
          `• Net Savings:       ${chalk.green(`$${stats.costComparison.dollarsSaved.toFixed(3)} (${stats.costComparison.percentageSaved}%)`)}`,
        "Claude Auto Usage Statistics",
      );

      clack.outro(chalk.green("Stats display complete."));
      return 0;
    }

    case "config": {
      const selectedStrat = (await clack.select({
        message: "Select active Optimization Strategy:",
        options: [
          { value: "balanced", label: "Balanced", hint: "Optimal cost & precision (Recommended)" },
          { value: "economy", label: "Economy", hint: "Aggressive Haiku routing, low effort" },
          { value: "quality", label: "Quality", hint: "Opus & high-effort Sonnet" },
        ],
        initialValue: config.optimizationStrategy,
      })) as OptimizationProfile;

      if (clack.isCancel(selectedStrat)) return 0;

      const maxParallel = await clack.text({
        message: "Maximum parallel tasks:",
        initialValue: String(config.maxParallelTasks),
      });
      if (clack.isCancel(maxParallel)) return 0;

      const numParallel = parseInt(maxParallel, 10) || 3;

      const updated = {
        ...config,
        optimizationStrategy: selectedStrat,
        maxParallelTasks: numParallel,
      };

      await saveConfig(updated);
      clack.outro(chalk.green("Configuration saved successfully to ~/.claude-auto/config.json"));
      return 0;
    }

    default:
      clack.outro("Option not recognized.");
      return 0;
  }
}
