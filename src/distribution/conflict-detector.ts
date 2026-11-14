import { AtomicTask, FileConflict } from "./types.js";

export class ConflictDetector {
  /**
   * Scans a set of concurrent tasks for overlapping target files.
   * If conflicts exist, creates conflict records and adjusts dependencies
   * to serialize the conflicting tasks in priority order.
   */
  resolveWaveConflicts(tasks: AtomicTask[]): {
    serializedTasks: AtomicTask[];
    conflicts: FileConflict[];
  } {
    const conflicts: FileConflict[] = [];
    const modifiedTasks = tasks.map((t) => ({ ...t, dependencies: [...t.dependencies] }));

    for (let i = 0; i < modifiedTasks.length; i++) {
      for (let j = i + 1; j < modifiedTasks.length; j++) {
        const taskA = modifiedTasks[i]!;
        const taskB = modifiedTasks[j]!;

        const sharedFiles = taskA.targetFiles.filter((f) => taskB.targetFiles.includes(f));

        if (sharedFiles.length > 0) {
          // Determine execution order: higher priority runs first
          const [first, second] = taskA.priority >= taskB.priority ? [taskA, taskB] : [taskB, taskA];

          if (!second.dependencies.includes(first.id)) {
            second.dependencies.push(first.id);
          }

          conflicts.push({
            taskA: first.id,
            taskB: second.id,
            conflictingFiles: sharedFiles,
            resolution: "serialized",
          });
        }
      }
    }

    return {
      serializedTasks: modifiedTasks,
      conflicts,
    };
  }
}

export const defaultConflictDetector = new ConflictDetector();
