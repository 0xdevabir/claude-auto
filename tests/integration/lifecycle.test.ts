import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import type {
  ClaudeAdapter,
  ResumeOptions,
  StartOptions,
} from "../../src/claude/adapter.js";
import type { ClaudeCapabilities } from "../../src/claude/capabilities.js";
import type { ClaudeProcessHandle } from "../../src/process/manager.js";
import { runApp } from "../../src/app.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";
import { SignalHub } from "../../src/process/signals.js";
import { StateManager } from "../../src/session/manager.js";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

class FakeProcess extends EventEmitter implements ClaudeProcessHandle {
  process = null as unknown as ClaudeProcessHandle["process"];
  private chunks: string[];
  private code: number;
  pid = 4242;

  constructor(output: string, code = 0) {
    super();
    this.chunks = [output];
    this.code = code;
  }

  get output(): string {
    return this.chunks.join("");
  }

  onOutput(listener: (chunk: string) => void): void {
    this.on("output", listener);
  }

  wait(): Promise<number> {
    return Promise.resolve(this.code);
  }

  async kill(): Promise<void> {
    // no-op
  }
}

function mockAdapter(sequence: Array<{ output: string; code?: number }>): ClaudeAdapter {
  let i = 0;
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const caps: ClaudeCapabilities = {
    version: "2.1.263",
    supportsInteractive: true,
    supportsSessionResume: true,
    supportsSessionId: true,
    supportsPromptMode: true,
    supportsContinue: true,
    supportsStructuredOutput: true,
    helpText: "--resume --session-id -p",
    verified: true,
  };

  return {
    async detectCapabilities() {
      return caps;
    },
    getSessionId() {
      return sessionId;
    },
    async getBinaryPath() {
      return "/mock/claude";
    },
    async start(_options: StartOptions) {
      const step = sequence[i++] ?? { output: "", code: 0 };
      return {
        sessionId,
        process: new FakeProcess(step.output, step.code ?? 0),
      };
    },
    async resume(_id: string, _options: ResumeOptions) {
      const step = sequence[i++] ?? { output: "done", code: 0 };
      return new FakeProcess(step.output, step.code ?? 0);
    },
  };
}

describe("integration mock lifecycle", () => {
  it("start → limit → wait → resume → complete", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-int-"));
    const statePath = path.join(dir, "state.json");
    // Isolate lock/state via env override of config dir is hard; use StateManager path
    // and a unique lock by patching — acquireLock uses getLockPath. Set XDG_CONFIG_HOME.
    const prev = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = dir;

    const adapter = mockAdapter([
      {
        output: "You've hit your session limit · resets in 0 seconds",
        code: 1,
      },
      { output: "Task complete", code: 0 },
    ]);

    const signals = new SignalHub();
    const code = await runApp({
      adapter,
      config: {
        ...DEFAULT_CONFIG,
        resetBufferSeconds: 0,
        fallbackResetSeconds: 0,
        countdown: false,
        verbose: false,
      },
      mode: "print",
      prompt: "Build auth",
      signals,
      stateManager: new StateManager(statePath),
      cwd: dir,
    });

    expect(code).toBe(0);
    const state = JSON.parse(await fs.readFile(statePath, "utf8")) as {
      status: string;
      resumeCount: number;
      sessionId: string;
    };
    expect(state.status).toBe("completed");
    expect(state.resumeCount).toBeGreaterThanOrEqual(1);
    expect(state.sessionId).toBe("11111111-1111-4111-8111-111111111111");

    if (prev === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = prev;
    await fs.rm(dir, { recursive: true, force: true });
  }, 15000);
});
