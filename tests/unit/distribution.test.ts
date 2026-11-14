import { describe, expect, it } from "vitest";
import { ConflictDetector } from "../../src/distribution/conflict-detector.js";
import { TaskScheduler } from "../../src/distribution/scheduler.js";
import { AtomicTask, DistributionPlan } from "../../src/distribution/types.js";

describe("Smart Distribution & Conflict Detection", () => {
  it("detects conflicting target files and serializes parallel tasks", () => {
    const detector = new ConflictDetector();
    const tasks: AtomicTask[] = [
      {
        id: "task-A",
        name: "Feature A",
        category: "execution",
        description: "Modifies auth.ts",
        targetFiles: ["src/auth.ts"],
        dependencies: [],
        priority: 90,
        allocatedModel: "sonnet",
        status: "pending",
      },
      {
        id: "task-B",
        name: "Feature B",
        category: "execution",
        description: "Also modifies auth.ts",
        targetFiles: ["src/auth.ts", "src/user.ts"],
        dependencies: [],
        priority: 70,
        allocatedModel: "sonnet",
        status: "pending",
      },
    ];

    const res = detector.resolveWaveConflicts(tasks);

    expect(res.conflicts.length).toBe(1);
    expect(res.conflicts[0]?.resolution).toBe("serialized");
    expect(res.conflicts[0]?.conflictingFiles).toContain("src/auth.ts");

    // Task B has lower priority, so it must now depend on Task A
    const taskB = res.serializedTasks.find((t) => t.id === "task-B")!;
    expect(taskB.dependencies).toContain("task-A");
  });

  it("handles subtask failures by skipping dependent downstream tasks", async () => {
    const scheduler = new TaskScheduler();
    const tasks: AtomicTask[] = [
      {
        id: "task-root",
        name: "Root",
        category: "execution",
        description: "Failing step",
        targetFiles: [],
        dependencies: [],
        priority: 100,
        allocatedModel: "sonnet",
        status: "pending",
      },
      {
        id: "task-downstream",
        name: "Downstream",
        category: "execution",
        description: "Dependent step",
        targetFiles: [],
        dependencies: ["task-root"],
        priority: 50,
        allocatedModel: "haiku",
        status: "pending",
      },
    ];

    const plan: DistributionPlan = {
      workflowId: "test-wf",
      rootTaskName: "Test Failure",
      tasks,
      executionBatches: [
        { waveIndex: 1, parallelTasks: [tasks[0]!] },
        { waveIndex: 2, parallelTasks: [tasks[1]!] },
      ],
      totalEstimatedCostUsd: 0.05,
      detectedConflicts: [],
    };

    const summary = await scheduler.executePlan(
      plan,
      async (task) => {
        if (task.id === "task-root") {
          throw new Error("Compilation crash");
        }
        return { summary: "Success", modifiedFiles: [] };
      },
      { maxParallelTasks: 2 },
    );

    expect(summary.failedTasks).toBe(1);
    expect(summary.skippedTasks).toBe(1);
    expect(tasks[0]?.status).toBe("failed");
    expect(tasks[1]?.status).toBe("skipped");
  });
});
