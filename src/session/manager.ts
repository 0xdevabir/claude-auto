import { promises as fs } from "node:fs";
import path from "node:path";
import { getStatePath } from "../platform/paths.js";
import { emptyState, type PersistedState } from "./state.js";

export class StateManager {
  constructor(private readonly statePath = getStatePath()) {}

  get path(): string {
    return this.statePath;
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
  }

  async read(): Promise<PersistedState | null> {
    try {
      const raw = await fs.readFile(this.statePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return normalizeState(parsed);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      if (err instanceof SyntaxError || err instanceof StateCorruptError) {
        await this.quarantineCorrupt(err);
        throw err instanceof StateCorruptError
          ? err
          : new StateCorruptError(this.statePath, "JSON parse failed");
      }
      throw err;
    }
  }

  async write(state: PersistedState): Promise<void> {
    await this.ensureDir();
    const tmp = `${this.statePath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.statePath);
  }

  async clear(): Promise<void> {
    await this.write(emptyState());
  }

  private async quarantineCorrupt(err: unknown): Promise<void> {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = `${this.statePath}.corrupt.${stamp}.json`;
    try {
      await fs.rename(this.statePath, dest);
    } catch {
      // ignore
    }
    void err;
  }
}

export class StateCorruptError extends Error {
  constructor(
    readonly statePath: string,
    detail: string,
  ) {
    super(
      [
        "Claude Auto state file is corrupted.",
        "",
        `Path: ${statePath}`,
        `Detail: ${detail}`,
        "",
        "The corrupted file was preserved with a .corrupt.* suffix when possible.",
        "No new session was started automatically.",
      ].join("\n"),
    );
    this.name = "StateCorruptError";
  }
}

function normalizeState(raw: unknown): PersistedState {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new StateCorruptError("state.json", "root must be an object");
  }
  const o = raw as Record<string, unknown>;
  const base = emptyState();
  return {
    sessionId: typeof o.sessionId === "string" ? o.sessionId : null,
    startedAt: typeof o.startedAt === "string" ? o.startedAt : null,
    resumeCount:
      typeof o.resumeCount === "number" && Number.isFinite(o.resumeCount)
        ? o.resumeCount
        : 0,
    status:
      typeof o.status === "string" ? (o.status as PersistedState["status"]) : base.status,
    resetAt: typeof o.resetAt === "string" ? o.resetAt : null,
    mode:
      o.mode === "interactive" ||
      o.mode === "print" ||
      o.mode === "mock" ||
      o.mode === null
        ? o.mode
        : null,
    lastError: typeof o.lastError === "string" ? o.lastError : null,
    cwd: typeof o.cwd === "string" ? o.cwd : null,
    prompt: typeof o.prompt === "string" ? o.prompt : null,
  };
}
