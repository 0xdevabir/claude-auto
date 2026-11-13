import { Command } from "commander";
import pc from "picocolors";
import { installClaudeAutoIntegration } from "./adapters/subagent.js";
import { OptimizationProfile } from "./registry/profiles.js";
import { defaultModelRouter } from "./router/engine.js";
import { runInteractiveDashboard } from "./ui/dashboard.js";
import { PACKAGE_VERSION } from "./version.js";
import { AutoDebugWorkflow } from "./workflows/debug.js";
import { DocumentationGeneratorWorkflow } from "./workflows/doc.js";
import { AutoExecuteWorkflow } from "./workflows/execute.js";
import { CodeExplanationWorkflow } from "./workflows/explain.js";
import { SmartPlanWorkflow } from "./workflows/plan.js";
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
    .command("plan [prompt]")
    .description("Smart Plan — generate high-level architectural roadmap")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .option("--dry-run", "Simulate routing and planning without writing files")
    .action(async (prompt, options) => {
      const wf = new SmartPlanWorkflow();
      const res = await wf.run({
        prompt,
        profile: options.profile as OptimizationProfile,
        dryRun: options.dryRun,
      });
      console.log(pc.green(res.summary));
    });

  program
    .command("exec [target]")
    .description("Auto Execute — implement feature or execute existing plan")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (target, options) => {
      const wf = new AutoExecuteWorkflow();
      const res = await wf.run({
        prompt: target,
        profile: options.profile as OptimizationProfile,
      });
      console.log(pc.green(res.summary));
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
      console.log(pc.green(res.summary));
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
      console.log(pc.green(res.summary));
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
      console.log(pc.green(res.summary));
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
      console.log(pc.green(res.summary));
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
      console.log(pc.green(res.summary));
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
      console.log(pc.green(res.summary));
    });

  program
    .command("route [prompt]")
    .description("Analyze task complexity and print routing decision")
    .option("-p, --profile <profile>", "Optimization profile (economy | balanced | quality)", "balanced")
    .action(async (prompt, options) => {
      const decision = await defaultModelRouter.route(
        { prompt },
        { profile: options.profile as OptimizationProfile },
      );
      console.log(pc.cyan(`\nModel Routing Allocation:`));
      console.log(`• Category:     ${decision.category}`);
      console.log(`• Complexity:   ${decision.complexity} (score: ${decision.complexityScore})`);
      console.log(`• Execution:    ${decision.phases.execution.model} (effort: ${decision.phases.execution.effort})`);
      if (decision.phases.plan) {
        console.log(`• Planning:     ${decision.phases.plan.model} (effort: ${decision.phases.plan.effort})`);
      }
      if (decision.phases.verification) {
        console.log(`• Verification: ${decision.phases.verification.model} (effort: ${decision.phases.verification.effort})`);
      }
      console.log(`• Est. Cost:    $${decision.estimatedCostUsd.toFixed(4)}`);
      console.log(`\n${pc.dim(decision.explanation)}\n`);
    });

  program
    .command("install")
    .description("Install /claude-auto slash command and core subagents for Claude Code")
    .option("--project", "Install locally in current project (.claude) instead of user home", false)
    .action(async (options) => {
      const scope = options.project ? "project" : "global";
      const res = await installClaudeAutoIntegration({ scope });
      console.log(pc.green(`\n✓ Claude Auto integration installed successfully (${scope} scope)!`));
      console.log(`✓ Slash command: ${res.slashCommandPath}`);
      console.log(`✓ Subagents deployed:`);
      for (const p of res.agentPaths) {
        console.log(`  • ${p}`);
      }
      console.log(pc.cyan(`\nInside Claude Code, you can now type: /claude-auto\n`));
    });

  return program;
}
