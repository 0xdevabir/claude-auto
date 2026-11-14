import { AtomicTask } from "./types.js";

export class TaskDependencyGraph {
  private tasks = new Map<string, AtomicTask>();
  private adjacency = new Map<string, Set<string>>(); // taskId -> set of taskIds that depend on it
  private reverseAdjacency = new Map<string, Set<string>>(); // taskId -> set of taskIds it depends on

  constructor(tasks: AtomicTask[]) {
    for (const t of tasks) {
      this.tasks.set(t.id, t);
      this.adjacency.set(t.id, new Set());
      this.reverseAdjacency.set(t.id, new Set());
    }

    for (const t of tasks) {
      for (const depId of t.dependencies) {
        if (!this.tasks.has(depId)) {
          throw new Error(`Task "${t.id}" depends on non-existent task "${depId}".`);
        }
        this.adjacency.get(depId)!.add(t.id);
        this.reverseAdjacency.get(t.id)!.add(depId);
      }
    }

    this.detectCycles();
  }

  getTask(id: string): AtomicTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): AtomicTask[] {
    return Array.from(this.tasks.values());
  }

  getDependents(id: string): string[] {
    return Array.from(this.adjacency.get(id) ?? []);
  }

  getPrerequisites(id: string): string[] {
    return Array.from(this.reverseAdjacency.get(id) ?? []);
  }

  detectCycles(): void {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): void => {
      visited.add(node);
      recStack.add(node);

      for (const neighbor of this.adjacency.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          throw new Error(`Circular dependency detected in task graph involving "${node}" and "${neighbor}".`);
        }
      }

      recStack.delete(node);
    };

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }
  }

  /**
   * Partitions the tasks into sequential execution waves.
   * Tasks within the same wave have all prerequisites satisfied and can run in parallel
   * (subject to file conflict resolution and max concurrency limits).
   */
  computeExecutionWaves(): AtomicTask[][] {
    const inDegree = new Map<string, number>();
    for (const [id, prereqs] of this.reverseAdjacency.entries()) {
      inDegree.set(id, prereqs.size);
    }

    const waves: AtomicTask[][] = [];
    const completed = new Set<string>();
    const totalCount = this.tasks.size;

    while (completed.size < totalCount) {
      // Find all tasks with 0 unfulfilled dependencies
      const readyTasks: AtomicTask[] = [];
      for (const [id, deg] of inDegree.entries()) {
        if (deg === 0 && !completed.has(id)) {
          const task = this.tasks.get(id)!;
          readyTasks.push(task);
        }
      }

      if (readyTasks.length === 0) {
        throw new Error("Unable to resolve topological execution waves (deadlock detected).");
      }

      // Sort ready tasks by priority (descending)
      readyTasks.sort((a, b) => b.priority - a.priority);

      waves.push(readyTasks);

      // Decrement in-degree for dependents of this wave's tasks
      for (const t of readyTasks) {
        completed.add(t.id);
        for (const dep of this.adjacency.get(t.id) ?? []) {
          const currentDeg = inDegree.get(dep)!;
          inDegree.set(dep, currentDeg - 1);
        }
      }
    }

    return waves;
  }
}
