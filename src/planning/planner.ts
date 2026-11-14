import { promises as fs } from "node:fs";
import path from "node:path";
import { ComprehensiveTaskAnalysis, defaultTaskAnalyzer } from "../analyzer/task-analyzer.js";
import { defaultTaskDecomposer } from "../distribution/decomposer.js";
import { DistributionPlan } from "../distribution/types.js";
import { OptimizationProfile } from "../registry/profiles.js";

export interface PlanArtifact {
  planId: string;
  createdAt: string;
  prompt: string;
  analysis: ComprehensiveTaskAnalysis;
  distributionPlan: DistributionPlan;
  jsonPath: string;
  markdownPath: string;
}

export class PlanningEngine {
  private analyzer = defaultTaskAnalyzer;
  private decomposer = defaultTaskDecomposer;

  async generatePlan(params: {
    prompt: string;
    targetPaths?: string[] | undefined;
    workingDir?: string | undefined;
    profile?: OptimizationProfile | undefined;
  }): Promise<PlanArtifact> {
    const cwd = params.workingDir ?? process.cwd();
    const planId = `plan-${Date.now().toString(36)}`;
    const plansDir = path.join(cwd, ".claude-auto", "plans");
    await fs.mkdir(plansDir, { recursive: true });

    // 1. Analyze the task
    const analysis = await this.analyzer.analyze({
      prompt: params.prompt,
      targetPaths: params.targetPaths,
      workingDir: cwd,
    });

    // 2. Decompose into distribution plan
    const distributionPlan = await this.decomposer.decompose(analysis, params.profile ?? "balanced");

    // 3. Format markdown specification
    const mdLines: string[] = [
      `# Claude Auto Implementation Plan: ${params.prompt}`,
      "",
      `- **Plan ID**: \`${planId}\``,
      `- **Created At**: ${new Date().toISOString()}`,
      `- **Profile**: ${params.profile ?? "balanced"}`,
      `- **Complexity**: ${analysis.complexity.toUpperCase()} (score: ${analysis.complexityScore})`,
      `- **Category**: ${analysis.category.toUpperCase()}`,
      `- **Security Sensitive**: ${analysis.security.isSecuritySensitive ? `YES (${analysis.security.flags.join(", ")})` : "NO"}`,
      `- **Estimated Cost**: $${distributionPlan.totalEstimatedCostUsd.toFixed(4)}`,
      "",
      "## 1. Project Context",
      `- **Tech Stack**: ${analysis.techStack.frameworks.concat(analysis.techStack.testRunners, [analysis.techStack.primaryLanguage]).join(", ") || "TypeScript"}`,
      `- **Git Branch**: \`${analysis.repo.currentBranch ?? "main"}\` (${analysis.repo.isDirty ? "Dirty" : "Clean"})`,
      `- **Target Files**: ${analysis.targetFiles.length > 0 ? analysis.targetFiles.map((f) => `\`${f}\``).join(", ") : "(Auto-detected from workspace)"}`,
      "",
      "## 2. Task Decomposition & Model Allocations",
      "",
      "| Task ID | Name | Category | Model | Effort | Dependencies |",
      "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ];

    for (const t of distributionPlan.tasks) {
      const deps = t.dependencies.length > 0 ? t.dependencies.join(", ") : "none";
      mdLines.push(
        `| \`${t.id}\` | ${t.name} | ${t.category} | **${t.allocatedModel}** | ${t.allocatedEffort ?? "default"} | ${deps} |`,
      );
    }

    mdLines.push("");
    mdLines.push("## 3. Parallel Execution Schedule");
    for (const batch of distributionPlan.executionBatches) {
      mdLines.push(
        `### Wave ${batch.waveIndex} (${batch.parallelTasks.length} concurrent task${batch.parallelTasks.length > 1 ? "s" : ""})`,
      );
      for (const t of batch.parallelTasks) {
        mdLines.push(`- **${t.name}** (\`${t.id}\`): ${t.description} → *${t.allocatedModel}*`);
      }
      mdLines.push("");
    }

    if (distributionPlan.detectedConflicts.length > 0) {
      mdLines.push("## 4. Conflict Resolutions");
      for (const c of distributionPlan.detectedConflicts) {
        mdLines.push(
          `- Resolved overlap on \`${c.conflictingFiles.join(", ")}\` between \`${c.taskA}\` and \`${c.taskB}\` by **${c.resolution}**.`,
        );
      }
      mdLines.push("");
    }

    mdLines.push("## 5. Verification Criteria");
    mdLines.push("1. TypeScript compile check (`tsc --noEmit`)");
    mdLines.push("2. Test suite verification (`npm test` / Vitest)");
    mdLines.push("3. Git diff inspection");

    const markdownContent = mdLines.join("\n");
    const jsonPath = path.join(plansDir, `${planId}.json`);
    const markdownPath = path.join(plansDir, `${planId}.md`);

    const artifact: PlanArtifact = {
      planId,
      createdAt: new Date().toISOString(),
      prompt: params.prompt,
      analysis,
      distributionPlan,
      jsonPath,
      markdownPath,
    };

    await fs.writeFile(jsonPath, JSON.stringify(artifact, null, 2), "utf8");
    await fs.writeFile(markdownPath, markdownContent, "utf8");

    return artifact;
  }
}

export const defaultPlanningEngine = new PlanningEngine();
