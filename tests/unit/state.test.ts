import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { StateManager, StateCorruptError } from "../../src/session/manager.js";
import { emptyState } from "../../src/session/state.js";
import { acquireLock } from "../../src/session/lock.js";

describe("StateManager", () => {
  let dir: string;
  let statePath: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-state-"));
    statePath = path.join(dir, "state.json");
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("round-trips state", async () => {
    const mgr = new StateManager(statePath);
    const state = {
      ...emptyState(),
      sessionId: "11111111-1111-4111-8111-111111111111",
      status: "waiting" as const,
      resumeCount: 2,
    };
    await mgr.write(state);
    const read = await mgr.read();
    expect(read?.sessionId).toBe(state.sessionId);
    expect(read?.resumeCount).toBe(2);
  });

  it("quarantines corrupt state", async () => {
    await fs.writeFile(statePath, "{not-json", "utf8");
    const mgr = new StateManager(statePath);
    await expect(mgr.read()).rejects.toBeInstanceOf(StateCorruptError);
    const files = await fs.readdir(dir);
    expect(files.some((f) => f.includes("corrupt"))).toBe(true);
  });
});

describe("lock", () => {
  it("prevents double acquire while held", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-lock-"));
    const lockPath = path.join(dir, "lock");
    const first = await acquireLock(lockPath);
    await expect(acquireLock(lockPath)).rejects.toThrow(/Another Claude Auto/);
    await first.release();
    const second = await acquireLock(lockPath);
    await second.release();
    await fs.rm(dir, { recursive: true, force: true });
  });
});
