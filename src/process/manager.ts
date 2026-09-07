import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { ProcessError } from "../errors/errors.js";
import { isWindows } from "../platform/paths.js";
import { terminateProcessTree } from "../platform/process.js";

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  inheritStdio?: boolean;
  detachedGroup?: boolean;
}

export interface ClaudeProcessHandle {
  readonly pid: number | undefined;
  readonly process: ChildProcess;
  readonly output: string;
  wait(): Promise<number>;
  kill(): Promise<void>;
  onOutput(listener: (chunk: string) => void): void;
}

class ManagedProcess extends EventEmitter implements ClaudeProcessHandle {
  readonly process: ChildProcess;
  private chunks: string[] = [];
  private exitCode: number | null = null;
  private exitPromise: Promise<number>;

  constructor(child: ChildProcess) {
    super();
    this.process = child;

    const collect = (buf: Buffer | string) => {
      const text = typeof buf === "string" ? buf : buf.toString("utf8");
      this.chunks.push(text);
      this.emit("output", text);
    };

    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);

    this.exitPromise = new Promise<number>((resolve, reject) => {
      child.on("error", (err) => {
        reject(new ProcessError(err.message));
      });
      child.on("close", (code, signal) => {
        if (code !== null) {
          this.exitCode = code;
          resolve(code);
          return;
        }
        this.exitCode = signal ? 1 : 0;
        resolve(this.exitCode);
      });
    });
  }

  get pid(): number | undefined {
    return this.process.pid;
  }

  get output(): string {
    return this.chunks.join("");
  }

  onOutput(listener: (chunk: string) => void): void {
    this.on("output", listener);
  }

  wait(): Promise<number> {
    return this.exitPromise;
  }

  async kill(): Promise<void> {
    if (this.exitCode !== null) return;
    const pid = this.process.pid;
    if (pid) {
      await terminateProcessTree(pid);
    }
    try {
      this.process.kill();
    } catch {
      // ignore
    }
  }
}

export async function spawnClaudeProcess(
  options: SpawnOptions,
): Promise<ClaudeProcessHandle> {
  const inherit = options.inheritStdio === true;
  const useGroup = options.detachedGroup === true && !isWindows();

  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: inherit ? "inherit" : ["inherit", "pipe", "pipe"],
    windowsHide: false,
    detached: useGroup,
    shell: false,
  });

  if (inherit) {
    // Still wrap for wait/kill; no output capture when inheriting.
    const handle = new ManagedProcess(child);
    return handle;
  }

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");

  // Mirror to parent terminal
  child.stdout?.on("data", (chunk: string) => {
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk: string) => {
    process.stderr.write(chunk);
  });

  return new ManagedProcess(child);
}
