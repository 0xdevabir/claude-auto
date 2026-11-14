import { Command } from "commander";
import chalk from "chalk";
import { installClaudeAutoIntegration } from "./adapters/subagent.js";
import { defaultTaskAnalyzer } from "./analyzer/task-analyzer.js";
import { loadConfig } from "./config/manager.js";
import { defaultCostTracker } from "./cost/tracker.js";
import { defaultTaskDecomposer } from "./distribution/decomposer.js";
import { defaultTaskScheduler } from "./distribution/scheduler.js";
import { defaultExecutionEngine } from "./execution/executor.js";
import { defaultPlanningEngine } from "./planning/planner.js";
import { OptimizationProfile } from "./registry/profiles.js";
import { defaultModelRouter } from "./router/engine.js";
import { runInteractiveDashboard } from "./ui/dashboard.js";
import { defaultVerificationEngine } from "./verification/verifier.js";
import { PACKAGE_VERSION } from "./version.js";
import { AutoDebugWorkflow } from "./workflows/debug.js";
import { DocumentationGeneratorWorkflow } from "./workflows/doc.js";
import { AutoExecuteWorkflow } from "./workflows/execute.js";
import { CodeExplanationWorkflow } from "./workflows/explain.js";
import { CodeRefactorWorkflow } from "./workflows/refactor.js";
import { CodeReviewWorkflow } from "./workflows/review.js";
import { TestGeneratorWorkflow } from "./workflows/test.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("claude-auto")
    .description("Intelligent productivity and model-orchestration toolkit for Claude Code")
    .version(PACKAGE_VERSION);

  program
    .command("dashboard", { isDefault: false })
    .description("Launch the interactive terminal dashboard")
    .action(async () => {
      const code = await runInteractiveDashboard();
      process.exit(code);
    });

  program
    .command("route [prompt]")
    .description("Analyze task complexity, security and print deterministic routing allocation")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (prompt, options) => {
      const analysis = await defaultTaskAnalyzer.analyze({ prompt });
      const decision = await defaultModelRouter.route(
        { prompt },
        { profile: options.profile as OptimizationProfile },
      );

      console.log(chalk.cyan(`\nModel Routing Allocation:`));
      console.log(`• Category:     ${chalk.bold(analysis.category.toUpperCase())}`);
      console.log(`• Complexity:   ${chalk.bold(analysis.complexity.toUpperCase())} (score: ${analysis.complexityScore})`);
      console.log(`• Security:     ${analysis.security.isSecuritySensitive ? chalk.red("Sensitive (" + analysis.security.flags.join(", ") + ")") : chalk.green("Clean")}`);
      console.log(`• Execution:    ${chalk.green(decision.phases.execution.model)} (effort: ${decision.phases.execution.effort})`);
      if (decision.phases.plan) {
        console.log(`• Planning:     ${chalk.magenta(decision.phases.plan.model)} (effort: ${decision.phases.plan.effort})`);
      }
      if (decision.phases.verification) {
        console.log(`• Verification: ${chalk.cyan(decision.phases.verification.model)} (effort: ${decision.phases.verification.effort})`);
      }
      console.log(`• Est. Cost:    ${chalk.yellow(`$${decision.estimatedCostUsd.toFixed(4)}`)}`);
      console.log(`\n${chalk.dim(decision.explanation)}\n`);
    });

  program
    .command("plan [prompt]")
    .description("Smart Plan — generate high-level architectural roadmap and DAG")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (prompt, options) => {
      const artifact = await defaultPlanningEngine.generatePlan({
        prompt: prompt || "System Architecture Plan",
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(`\n✔ Smart Plan generated successfully!`));
      console.log(`• Markdown: ${artifact.markdownPath}`);
      console.log(`• JSON:     ${artifact.jsonPath}`);
      console.log(`• Subtasks: ${artifact.distributionPlan.tasks.length} atomic steps across ${artifact.distributionPlan.executionBatches.length} waves\n`);
    });

  program
    .command("distribute [prompt]")
    .description("Smart Distribution — decompose task and resolve file conflicts")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (prompt, options) => {
      const analysis = await defaultTaskAnalyzer.analyze({ prompt });
      const plan = await defaultTaskDecomposer.decompose(analysis, options.profile as OptimizationProfile);
      console.log(chalk.cyan(`\nSmart Task Distribution DAG:`));
      console.log(`• Workflow ID:  ${plan.workflowId}`);
      console.log(`• Subtasks:     ${plan.tasks.length}`);
      console.log(`• Parallel Waves: ${plan.executionBatches.length}`);
      for (const batch of plan.executionBatches) {
        console.log(`  Wave ${batch.waveIndex}:`);
        for (const t of batch.parallelTasks) {
          console.log(`    - [${t.id}] ${t.name} → ${chalk.green(t.allocatedModel)}`);
        }
      }
      console.log("");
    });

  program
    .command("exec [target]")
    .description("Auto Execute — implement feature or execute plan")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (target, options) => {
      const wf = new AutoExecuteWorkflow();
      const res = await wf.run({
        prompt: target,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("parallel [prompt]")
    .description("Parallel Execution — execute unblocked DAG tasks concurrently")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .option("-c, --concurrency <number>", "Maximum parallel tasks", "3")
    .action(async (prompt, options) => {
      const analysis = await defaultTaskAnalyzer.analyze({ prompt });
      const plan = await defaultTaskDecomposer.decompose(analysis, options.profile as OptimizationProfile);
      const concurrency = parseInt(options.concurrency, 10) || 3;

      console.log(chalk.cyan(`Starting parallel execution of ${plan.tasks.length} tasks (concurrency: ${concurrency})...`));

      const summary = await defaultTaskScheduler.executePlan(
        plan,
        async (task) => {
          const res = await defaultExecutionEngine.executeTask(task, { dryRun: false });
          return { summary: res.summary, modifiedFiles: res.modifiedFiles };
        },
        {
          maxParallelTasks: concurrency,
          hooks: {
            onTaskStart: (t) => console.log(chalk.dim(`  ▶ [${t.id}] ${t.name} on ${t.allocatedModel}...`)),
            onTaskComplete: (t) => console.log(chalk.green(`  ✔ [${t.id}] ${t.name} completed`)),
            onTaskFail: (t, err) => console.log(chalk.red(`  ✖ [${t.id}] ${t.name} failed: ${err.message}`)),
          },
        },
      );

      console.log(chalk.green(`\nExecution complete: ${summary.completedTasks}/${summary.totalTasks} succeeded in ${Math.round(summary.durationMs / 1000)}s.`));
    });

  program
    .command("verify")
    .description("Run comprehensive verification: typecheck, tests & git diff")
    .action(async () => {
      console.log(chalk.cyan("Running comprehensive verification suite..."));
      const report = await defaultVerificationEngine.verify();
      if (report.overallSuccess) {
        console.log(chalk.green(`\n✔ ${report.summary}\n`));
      } else {
        console.log(chalk.red(`\n✖ ${report.summary}\n`));
      }
      if (report.typecheck.output) {
        console.log(chalk.dim(report.typecheck.output));
      }
      if (report.tests.output) {
        console.log(chalk.dim(report.tests.output));
      }
    });

  program
    .command("review [target]")
    .description("Code Review — perform static analysis & security check on diff")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (target, options) => {
      const wf = new CodeReviewWorkflow();
      const res = await wf.run({
        targetPaths: target ? [target] : undefined,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("debug [error]")
    .description("Auto Debug — diagnose errors and apply fixes")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (error, options) => {
      const wf = new AutoDebugWorkflow();
      const res = await wf.run({
        prompt: error,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("refactor [path]")
    .description("Code Refactor — clean and modularize target code")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (targetPath, options) => {
      const wf = new CodeRefactorWorkflow();
      const res = await wf.run({
        targetPaths: targetPath ? [targetPath] : undefined,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("test [path]")
    .description("Test Generator — scaffold unit & integration tests")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (targetPath, options) => {
      const wf = new TestGeneratorWorkflow();
      const res = await wf.run({
        targetPaths: targetPath ? [targetPath] : undefined,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("doc [path]")
    .description("Documentation Generator — generate JSDoc and specs")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (targetPath, options) => {
      const wf = new DocumentationGeneratorWorkflow();
      const res = await wf.run({
        targetPaths: targetPath ? [targetPath] : undefined,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("explain [path]")
    .description("Code Explanation — step-by-step walkthrough & logic explanation")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (targetPath, options) => {
      const wf = new CodeExplanationWorkflow();
      const res = await wf.run({
        targetPaths: targetPath ? [targetPath] : undefined,
        profile: options.profile as OptimizationProfile,
      });
      console.log(chalk.green(res.summary));
    });

  program
    .command("stats")
    .description("Display token consumption, costs and savings")
    .action(async () => {
      const stats = await defaultCostTracker.getUsageSummary();
      console.log(chalk.cyan(`\nClaude Auto Usage Statistics:`));
      console.log(`• Workflows Tracked: ${stats.totalWorkflows}`);
      console.log(`• Total Cost:        $${stats.totalCostUsd.toFixed(4)}`);
      console.log(`• Total Input:       ${stats.totalInputTokens.toLocaleString()} tokens`);
      console.log(`• Total Output:      ${stats.totalOutputTokens.toLocaleString()} tokens`);
      console.log(`• Routed Spend:      $${stats.costComparison.routedCostUsd.toFixed(3)}`);
      console.log(`• Baseline (Opus):   $${stats.costComparison.unroutedOpusCostUsd.toFixed(3)}`);
      console.log(`• Net Savings:       ${chalk.green(`$${stats.costComparison.dollarsSaved.toFixed(3)} (${stats.costComparison.percentageSaved}%)`)}`);
      console.log(`• Avg Overhead:      ${stats.averageRoutingOverheadMs} ms\n`);
    });

  program
    .command("install")
    .description("Install /claude-auto slash command and core subagents for Claude Code")
    .option("--project", "Install locally in current project (.claude) instead of user home", false)
    .action(async (options) => {
      const scope = options.project ? "project" : "global";
      const res = await installClaudeAutoIntegration({ scope });
      console.log(chalk.green(`\n✓ Claude Auto integration installed successfully (${scope} scope)!`));
      console.log(`✓ Slash command: ${res.slashCommandPath}`);
      console.log(`✓ Subagents deployed:`);
      for (const p of res.agentPaths) {
        console.log(`  • ${p}`);
      }
      console.log(chalk.cyan(`\nInside Claude Code, you can now type: /claude-auto\n`));
    });

  return program;
}
