import { describe, expect, it } from "vitest";
import { TaskDependencyGraph } from "../../src/distribution/dag.js";
import { AtomicTask } from "../../src/distribution/types.js";

describe("Task DAG & Topological Waves", () => {
  it("detects circular dependencies and throws an error", () => {
    const cyclicTasks: AtomicTask[] = [
      {
        id: "task-A",
        name: "A",
        category: "execution",
        description: "A",
        targetFiles: [],
        dependencies: ["task-B"],
        priority: 10,
        allocatedModel: "sonnet",
        status: "pending",
      },
      {
        id: "task-B",
        name: "B",
        category: "execution",
        description: "B",
        targetFiles: [],
        dependencies: ["task-A"],
        priority: 10,
        allocatedModel: "sonnet",
        status: "pending",
      },
    ];

    expect(() => new TaskDependencyGraph(cyclicTasks)).toThrow(/Circular dependency detected/);
  });

  it("computes ordered execution waves where prerequisites precede dependents", () => {
    const tasks: AtomicTask[] = [
      {
        id: "task-1",
        name: "Types",
        category: "architecture",
        description: "Define types",
        targetFiles: ["src/types.ts"],
        dependencies: [],
        priority: 100,
        allocatedModel: "sonnet",
        status: "pending",
      },
      {
        id: "task-2",
        name: "Backend",
        category: "execution",
        description: "Impl logic",
        targetFiles: ["src/backend.ts"],
        dependencies: ["task-1"],
        priority: 80,
        allocatedModel: "sonnet",
        status: "pending",
      },
      {
        id: "task-3",
        name: "Tests",
        category: "test_generation",
        description: "Write tests",
        targetFiles: ["tests/backend.test.ts"],
        dependencies: ["task-1"],
        priority: 70,
        allocatedModel: "haiku",
        status: "pending",
      },
      {
        id: "task-4",
        name: "Verify",
        category: "review",
        description: "Review everything",
        targetFiles: [],
        dependencies: ["task-2", "task-3"],
        priority: 90,
        allocatedModel: "sonnet",
        status: "pending",
      },
    ];

    const graph = new TaskDependencyGraph(tasks);
    const waves = graph.computeExecutionWaves();

    expect(waves.length).toBe(3);

    // Wave 1: task-1
    expect(waves[0]?.map((t) => t.id)).toEqual(["task-1"]);

    // Wave 2: task-2 and task-3 in parallel!
    const wave2Ids = waves[1]?.map((t) => t.id);
    expect(wave2Ids).toContain("task-2");
    expect(wave2Ids).toContain("task-3");

    // Wave 3: task-4
    expect(waves[2]?.map((t) => t.id)).toEqual(["task-4"]);
  });
});
