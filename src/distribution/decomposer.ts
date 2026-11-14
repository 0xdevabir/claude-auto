import { randomUUID } from "node:crypto";
import { ComprehensiveTaskAnalysis } from "../analyzer/task-analyzer.js";
import { EffortLevel, ModelId } from "../registry/models.js";
import { OptimizationProfile } from "../registry/profiles.js";
import { defaultModelRouter } from "../router/engine.js";
import { ConflictDetector } from "./conflict-detector.js";
import { TaskDependencyGraph } from "./dag.js";
import { AtomicTask, DistributionPlan } from "./types.js";

export class TaskDecomposer {
  private conflictDetector = new ConflictDetector();

  async decompose(
    analysis: ComprehensiveTaskAnalysis,
    profile: OptimizationProfile = "balanced",
  ): Promise<DistributionPlan> {
    const workflowId = `wf-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`;
    const tasks: AtomicTask[] = [];

    if (!analysis.decomposition.shouldDecompose) {
      // Single atomic task
      const route = await defaultModelRouter.route(
        { prompt: analysis.prompt, targetPaths: analysis.targetFiles },
        { profile },
      );

      tasks.push({
        id: "task-core-01",
        name: `Execute ${analysis.category}`,
        category: analysis.category,
        description: analysis.prompt,
        targetFiles: analysis.targetFiles,
        dependencies: [],
        priority: 100,
        allocatedModel: route.phases.execution.model,
        allocatedEffort: route.phases.execution.effort,
        status: "pending",
      });
    } else {
      // Multi-stage DAG decomposition
      let prevTaskId: string | null = null;
      let priority = 100;

      for (let i = 0; i < analysis.decomposition.recommendedSubtasks.length; i++) {
        const sub = analysis.decomposition.recommendedSubtasks[i]!;
        const taskId = `task-${sub.name.replace(/_/g, "-")}-${(i + 1).toString().padStart(2, "0")}`;

        let assignedModel: ModelId = "sonnet";
        let assignedEffort: EffortLevel | undefined = "medium";

        if (sub.category === "architecture") {
          assignedModel = profile === "economy" ? "sonnet" : "opus";
          assignedEffort = profile === "economy" ? "medium" : "high";
        } else if (sub.category === "test_generation" || sub.category === "documentation") {
          assignedModel = profile === "quality" ? "sonnet" : "haiku";
          assignedEffort = "low";
        } else {
          assignedModel = profile === "economy" ? "haiku" : "sonnet";
          assignedEffort = "medium";
        }

        // Target files assignment:
        // Tests target test files, docs target doc files, execution targets target files
        let taskTargetFiles = [...analysis.targetFiles];
        if (sub.category === "test_generation") {
          taskTargetFiles = analysis.targetFiles.map((f) =>
            f.endsWith(".ts") && !f.endsWith(".test.ts") ? f.replace(/\.ts$/, ".test.ts") : f,
          );
        } else if (sub.category === "documentation") {
          taskTargetFiles = ["README.md", ...analysis.targetFiles.filter((f) => f.endsWith(".md"))];
        }

        // Subtask dependencies:
        // Core implementation depends on types/architecture
        // Tests and Documentation depend on Core Implementation (can run in parallel if files disjoint!)
        const dependencies: string[] = [];
        if (i > 0 && prevTaskId) {
          if (sub.category === "test_generation" && tasks[0]) {
            // Tests can depend directly on Task 1 (architecture/types) and run in parallel with Core Implementation!
            dependencies.push(tasks[0].id);
          } else if (sub.category === "documentation" && tasks[1]) {
            // Docs depend on Core Implementation
            dependencies.push(tasks[1].id);
          } else {
            dependencies.push(prevTaskId);
          }
        }

        tasks.push({
          id: taskId,
          name: sub.name.replace(/_/g, " "),
          category: sub.category,
          description: sub.description,
          targetFiles: taskTargetFiles,
          dependencies,
          priority,
          allocatedModel: assignedModel,
          allocatedEffort: assignedEffort,
          status: "pending",
        });

        prevTaskId = taskId;
        priority -= 15;
      }
    }

    // Check and resolve any file conflicts in parallel tasks
    const { serializedTasks, conflicts } = this.conflictDetector.resolveWaveConflicts(tasks);

    // Build DAG and calculate execution batches (waves)
    const graph = new TaskDependencyGraph(serializedTasks);
    const waves = graph.computeExecutionWaves();

    const executionBatches = waves.map((parallelTasks, index) => ({
      waveIndex: index + 1,
      parallelTasks,
    }));

    return {
      workflowId,
      rootTaskName: analysis.prompt || "Workflow Execution",
      tasks: serializedTasks,
      executionBatches,
      totalEstimatedCostUsd: 0.045 * serializedTasks.length,
      detectedConflicts: conflicts,
    };
  }
}

export const defaultTaskDecomposer = new TaskDecomposer();
