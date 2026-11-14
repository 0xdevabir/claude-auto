import { AtomicTask, DistributionExecutionSummary, DistributionPlan } from "./types.js";

export interface SchedulerHooks {
  onTaskStart?: (task: AtomicTask) => void;
  onTaskComplete?: (task: AtomicTask) => void;
  onTaskFail?: (task: AtomicTask, error: Error) => void;
}

export type TaskRunnerFunction = (task: AtomicTask) => Promise<{
  summary: string;
  modifiedFiles: string[];
}>;

export class TaskScheduler {
  async executePlan(
    plan: DistributionPlan,
    runner: TaskRunnerFunction,
    options: {
      maxParallelTasks?: number | undefined;
      hooks?: SchedulerHooks | undefined;
    } = {},
  ): Promise<DistributionExecutionSummary> {
    const startTime = Date.now();
    const maxConcurrency = Math.max(1, options.maxParallelTasks ?? 3);
    const hooks = options.hooks ?? {};

    const taskMap = new Map<string, AtomicTask>();
    for (const t of plan.tasks) {
      taskMap.set(t.id, t);
    }

    const failedTaskIds = new Set<string>();

    for (const batch of plan.executionBatches) {
      // Check which tasks in this wave have failed prerequisites
      const unblockedTasks: AtomicTask[] = [];
      for (const t of batch.parallelTasks) {
        const hasFailedPrereq = t.dependencies.some((dep) => failedTaskIds.has(dep));
        if (hasFailedPrereq) {
          t.status = "skipped";
          t.result = {
            summary: "Skipped due to upstream task failure.",
            modifiedFiles: [],
          };
          failedTaskIds.add(t.id);
        } else {
          unblockedTasks.push(t);
        }
      }

      // Execute unblocked parallel tasks with concurrency limit
      await this.runPool(unblockedTasks, maxConcurrency, async (task) => {
        task.status = "running";
        hooks.onTaskStart?.(task);
        const taskStart = Date.now();

        try {
          const runRes = await runner(task);
          task.status = "completed";
          task.result = {
            summary: runRes.summary,
            modifiedFiles: runRes.modifiedFiles,
            durationMs: Date.now() - taskStart,
          };
          hooks.onTaskComplete?.(task);
        } catch (err) {
          task.status = "failed";
          const errorMsg = (err as Error).message;
          task.result = {
            summary: `Execution error: ${errorMsg}`,
            modifiedFiles: [],
            error: errorMsg,
            durationMs: Date.now() - taskStart,
          };
          failedTaskIds.add(task.id);
          hooks.onTaskFail?.(task, err as Error);
        }
      });
    }

    // Aggregate summary
    const allTasks = Array.from(taskMap.values());
    const modifiedFiles = Array.from(
      new Set(allTasks.flatMap((t) => t.result?.modifiedFiles ?? [])),
    );

    return {
      workflowId: plan.workflowId,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter((t) => t.status === "completed").length,
      failedTasks: allTasks.filter((t) => t.status === "failed").length,
      skippedTasks: allTasks.filter((t) => t.status === "skipped").length,
      durationMs: Date.now() - startTime,
      modifiedFiles,
      taskSummaries: allTasks.map((t) => ({
        id: t.id,
        name: t.name,
        model: t.allocatedModel,
        status: t.status,
        summary: t.result?.summary ?? "Pending",
        durationMs: t.result?.durationMs,
      })),
    };
  }

  private async runPool<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    const queue = [...items];
    const inFlight: Promise<void>[] = [];

    while (queue.length > 0 || inFlight.length > 0) {
      while (queue.length > 0 && inFlight.length < concurrency) {
        const item = queue.shift()!;
        const p = worker(item).finally(() => {
          const idx = inFlight.indexOf(p);
          if (idx >= 0) inFlight.splice(idx, 1);
        });
        inFlight.push(p);
      }

      if (inFlight.length > 0) {
        await Promise.race(inFlight);
      }
    }
  }
}

export const defaultTaskScheduler = new TaskScheduler();
