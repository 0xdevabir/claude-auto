import { EffortLevel, ModelId } from "../registry/models.js";
import { TaskCategory } from "../router/types.js";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface AtomicTask {
  id: string;
  name: string;
  category: TaskCategory;
  description: string;
  targetFiles: string[];
  dependencies: string[]; // ids of tasks that must complete before this runs
  priority: number;       // higher = scheduled first when ready
  allocatedModel: ModelId;
  allocatedEffort?: EffortLevel | undefined;
  status: TaskStatus;
  result?: {
    summary: string;
    modifiedFiles: string[];
    error?: string | undefined;
    durationMs?: number | undefined;
  } | undefined;
}

export interface FileConflict {
  taskA: string;
  taskB: string;
  conflictingFiles: string[];
  resolution: "serialized" | "isolated" | "rejected";
}

export interface ExecutionScheduleBatch {
  waveIndex: number;
  parallelTasks: AtomicTask[];
}

export interface DistributionPlan {
  workflowId: string;
  rootTaskName: string;
  tasks: AtomicTask[];
  executionBatches: ExecutionScheduleBatch[];
  totalEstimatedCostUsd: number;
  detectedConflicts: FileConflict[];
}

export interface DistributionExecutionSummary {
  workflowId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  durationMs: number;
  modifiedFiles: string[];
  taskSummaries: Array<{
    id: string;
    name: string;
    model: ModelId;
    status: TaskStatus;
    summary: string;
    durationMs?: number | undefined;
  }>;
}
