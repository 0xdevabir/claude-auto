import { spawn } from "node:child_process";
import { ClaudeVersionUnsupportedError } from "../errors/errors.js";
import type { ClaudeProcessHandle } from "../process/manager.js";
import { spawnClaudeProcess } from "../process/manager.js";
import { parseCapabilitiesFromHelp, type ClaudeCapabilities } from "./capabilities.js";
import { buildClaudeArgs } from "./command-builder.js";
import { locateClaudeBinary } from "./locator.js";
import { createSessionId } from "./session.js";

export interface StartOptions {
  prompt?: string;
  mode: "interactive" | "print";
  sessionId?: string;
  extraArgs?: string[];
  cwd?: string;
  inheritStdio?: boolean;
}

export interface ResumeOptions {
  prompt?: string;
  mode: "interactive" | "print";
  extraArgs?: string[];
  cwd?: string;
  inheritStdio?: boolean;
}

export interface ClaudeAdapter {
  detectCapabilities(): Promise<ClaudeCapabilities>;
  start(options: StartOptions): Promise<{
    process: ClaudeProcessHandle;
    sessionId: string;
  }>;
  getSessionId(): string | null;
  resume(sessionId: string, options: ResumeOptions): Promise<ClaudeProcessHandle>;
  getBinaryPath(): Promise<string>;
}

function runCapture(
  command: string,
  args: string[],
): Promise<{
  stdout: string;
  stderr: string;
  code: number;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => out.push(c));
    child.stderr.on("data", (c: Buffer) => err.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
        code: code ?? 1,
      });
    });
  });
}

export class DefaultClaudeAdapter implements ClaudeAdapter {
  private sessionId: string | null = null;
  private binaryPath: string | null = null;
  private capabilities: ClaudeCapabilities | null = null;

  constructor(private readonly explicitBinary?: string) {}

  async getBinaryPath(): Promise<string> {
    if (!this.binaryPath) {
      this.binaryPath = await locateClaudeBinary(this.explicitBinary);
    }
    return this.binaryPath;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async detectCapabilities(): Promise<ClaudeCapabilities> {
    if (this.capabilities) return this.capabilities;
    const bin = await this.getBinaryPath();
    const versionResult = await runCapture(bin, ["--version"]);
    const helpResult = await runCapture(bin, ["--help"]);
    const versionRaw = (versionResult.stdout || versionResult.stderr).trim();
    const helpText = helpResult.stdout || helpResult.stderr;
    this.capabilities = parseCapabilitiesFromHelp(versionRaw, helpText);
    return this.capabilities;
  }

  async start(options: StartOptions): Promise<{
    process: ClaudeProcessHandle;
    sessionId: string;
  }> {
    const caps = await this.detectCapabilities();
    if (!caps.supportsSessionId || !caps.supportsSessionResume) {
      throw new ClaudeVersionUnsupportedError(caps.version);
    }
    if (options.mode === "print" && !caps.supportsPromptMode) {
      throw new ClaudeVersionUnsupportedError(caps.version);
    }

    const sessionId = options.sessionId ?? createSessionId();
    this.sessionId = sessionId;
    const bin = await this.getBinaryPath();
    const build: Parameters<typeof buildClaudeArgs>[0] = {
      sessionId,
      mode: options.mode,
      resume: false,
    };
    if (options.prompt !== undefined) build.prompt = options.prompt;
    if (options.extraArgs !== undefined) build.extraArgs = options.extraArgs;
    const args = buildClaudeArgs(build);

    const inherit = options.inheritStdio ?? options.mode === "interactive";

    const spawnOpts: Parameters<typeof spawnClaudeProcess>[0] = {
      command: bin,
      args,
      inheritStdio: inherit,
      detachedGroup: !inherit,
    };
    if (options.cwd !== undefined) spawnOpts.cwd = options.cwd;
    const proc = await spawnClaudeProcess(spawnOpts);

    return { process: proc, sessionId };
  }

  async resume(sessionId: string, options: ResumeOptions): Promise<ClaudeProcessHandle> {
    const caps = await this.detectCapabilities();
    if (!caps.supportsSessionResume) {
      throw new ClaudeVersionUnsupportedError(caps.version);
    }

    this.sessionId = sessionId;
    const bin = await this.getBinaryPath();
    const build: Parameters<typeof buildClaudeArgs>[0] = {
      sessionId,
      mode: options.mode,
      resume: true,
    };
    if (options.prompt !== undefined) build.prompt = options.prompt;
    if (options.extraArgs !== undefined) build.extraArgs = options.extraArgs;
    const args = buildClaudeArgs(build);

    const inherit = options.inheritStdio ?? options.mode === "interactive";

    const spawnOpts: Parameters<typeof spawnClaudeProcess>[0] = {
      command: bin,
      args,
      inheritStdio: inherit,
      detachedGroup: !inherit,
    };
    if (options.cwd !== undefined) spawnOpts.cwd = options.cwd;
    return spawnClaudeProcess(spawnOpts);
  }
}
