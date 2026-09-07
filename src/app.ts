import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ClaudeAdapter } from "./claude/adapter.js";
import type { ClaudeAutoConfig } from "./config/defaults.js";
import {
  MaxResumesError,
  SessionResumeError,
  UserCancelledError,
  formatErrorBanner,
} from "./errors/errors.js";
import { detectLimit } from "./limit/detector.js";
import { isRetryableLimit } from "./limit/types.js";
import { globalSignals, type SignalHub } from "./process/signals.js";
import type { ClaudeProcessHandle } from "./process/manager.js";
import { RetryManager } from "./retry/manager.js";
import { acquireLock, type LockHandle } from "./session/lock.js";
import { StateManager, StateCorruptError } from "./session/manager.js";
import { emptyState, type PersistedState } from "./session/state.js";
import { waitWithCountdown } from "./ui/countdown.js";
import { Logger } from "./ui/logger.js";
import { isValidSessionId } from "./claude/session.js";

export type AppMode = "interactive" | "print";

export interface AppOptions {
  adapter: ClaudeAdapter;
  config: ClaudeAutoConfig;
  mode: AppMode;
  prompt?: string;
  extraArgs?: string[];
  recover?: boolean;
  yes?: boolean;
  signals?: SignalHub;
  stateManager?: StateManager;
  cwd?: string;
}

export async function runApp(options: AppOptions): Promise<number> {
  const signals = options.signals ?? globalSignals;
  signals.attach();
  const logger = new Logger(options.config.verbose);
  const stateManager = options.stateManager ?? new StateManager();
  const retry = new RetryManager(options.config);
  const cwd = options.cwd ?? process.cwd();

  let lock: LockHandle | null = null;
  try {
    lock = await acquireLock();
  } catch (err) {
    logger.error(formatErrorBanner(err));
    return 1;
  }

  let active: ClaudeProcessHandle | null = null;
  const unsub = signals.onCancel(() => {
    void active?.kill();
  });

  try {
    let prior: PersistedState | null = null;
    try {
      prior = await stateManager.read();
    } catch (err) {
      if (err instanceof StateCorruptError) {
        logger.error(err.message);
        return 1;
      }
      throw err;
    }

    if (options.recover) {
      const recoverArgs: Parameters<typeof recoverAndLoop>[0] = {
        prior: prior ?? emptyState(),
        stateManager,
        adapter: options.adapter,
        config: options.config,
        signals,
        logger,
        yes: options.yes === true,
        retry,
        cwd,
        setActive: (h) => {
          active = h;
        },
      };
      if (options.extraArgs !== undefined) recoverArgs.extraArgs = options.extraArgs;
      return await recoverAndLoop(recoverArgs);
    }

    if (
      prior?.status === "waiting" &&
      prior.sessionId &&
      options.mode === "interactive" &&
      !options.prompt
    ) {
      logger.warn(
        "A previous Claude Auto wait state exists. Run `claude-auto --resume` to recover.",
      );
    }

    const startOpts: Parameters<typeof options.adapter.start>[0] = {
      mode: options.mode,
      cwd,
      inheritStdio: options.mode === "interactive",
    };
    if (options.prompt !== undefined) startOpts.prompt = options.prompt;
    if (options.extraArgs !== undefined) startOpts.extraArgs = options.extraArgs;
    const started = await options.adapter.start(startOpts);
    active = started.process;

    const state: PersistedState = {
      ...emptyState(),
      sessionId: started.sessionId,
      startedAt: new Date().toISOString(),
      resumeCount: 0,
      status: "running",
      mode: options.mode,
      cwd,
      prompt: options.prompt ?? null,
      resetAt: null,
      lastError: null,
    };
    await stateManager.write(state);
    logger.verbose(`Starting Claude Code (session ${started.sessionId})`);

    const loopArgs: Parameters<typeof sessionLoop>[0] = {
      handle: started.process,
      state,
      mode: options.mode,
      adapter: options.adapter,
      config: options.config,
      signals,
      logger,
      stateManager,
      retry,
      cwd,
      setActive: (h) => {
        active = h;
      },
    };
    if (options.extraArgs !== undefined) loopArgs.extraArgs = options.extraArgs;
    return await sessionLoop(loopArgs);
  } catch (err) {
    if (err instanceof UserCancelledError) {
      try {
        const cur = (await stateManager.read()) ?? emptyState();
        await stateManager.write({ ...cur, status: "cancelled" });
      } catch {
        // ignore
      }
      logger.info("\nCancelled.");
      return 130;
    }
    logger.error(formatErrorBanner(err));
    try {
      const cur = (await stateManager.read()) ?? emptyState();
      await stateManager.write({
        ...cur,
        status: "error",
        lastError: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // ignore
    }
    return 1;
  } finally {
    unsub();
    await lock.release();
  }
}

async function sessionLoop(args: {
  handle: ClaudeProcessHandle;
  state: PersistedState;
  mode: AppMode;
  adapter: ClaudeAdapter;
  config: ClaudeAutoConfig;
  signals: SignalHub;
  logger: Logger;
  stateManager: StateManager;
  retry: RetryManager;
  extraArgs?: string[];
  cwd: string;
  setActive: (h: ClaudeProcessHandle) => void;
}): Promise<number> {
  let handle = args.handle;
  let state = args.state;

  for (;;) {
    args.signals.throwIfCancelled();
    const code = await handle.wait();
    const output = handle.output;
    args.logger.verbose(`Claude process exited (${code})`);

    const detection = detectLimit(output);
    if (detection.detected && isRetryableLimit(detection.type)) {
      if (!args.config.autoResume) {
        args.logger.warn("Limit detected but autoResume is disabled.");
        return code === 0 ? 1 : code;
      }
      if (state.resumeCount >= args.config.maxAutoResumes) {
        throw new MaxResumesError(args.config.maxAutoResumes);
      }

      const plan = args.retry.planFromDetection(detection);
      state = {
        ...state,
        status: "waiting",
        resetAt: plan.retryAt.toISOString(),
        resumeCount: state.resumeCount + 1,
      };
      await args.stateManager.write(state);

      args.logger.verbose(`Limit detected (${detection.type})`);
      args.logger.verbose(`Session: ${state.sessionId}`);
      args.logger.verbose(`Reset: ${plan.retryAt.toISOString()}`);

      await waitWithCountdown({
        resetAt: plan.retryAt,
        resumeCount: state.resumeCount,
        maxResumes: args.config.maxAutoResumes,
        enabled: args.config.countdown,
        signals: args.signals,
        usedFallback: plan.usedFallback,
        fallbackSeconds: args.config.fallbackResetSeconds,
      });

      args.signals.throwIfCancelled();
      const sessionId = state.sessionId;
      if (!sessionId || !isValidSessionId(sessionId)) {
        throw new SessionResumeError(sessionId ?? "(missing)");
      }

      state = { ...state, status: "resuming" };
      await args.stateManager.write(state);
      args.logger.verbose("Reset window reached");
      args.logger.verbose("Resuming session");

      const continuation =
        args.mode === "print" ? args.config.continuationPrompt : undefined;

      try {
        const resumeOpts: Parameters<typeof args.adapter.resume>[1] = {
          mode: args.mode,
          cwd: args.cwd,
          inheritStdio: args.mode === "interactive",
        };
        if (continuation !== undefined) resumeOpts.prompt = continuation;
        if (args.extraArgs !== undefined) resumeOpts.extraArgs = args.extraArgs;
        handle = await args.adapter.resume(sessionId, resumeOpts);
        args.setActive(handle);
      } catch (err) {
        throw new SessionResumeError(
          sessionId,
          err instanceof Error ? err.message : String(err),
        );
      }

      if (continuation) args.logger.verbose("Continuation sent");
      state = { ...state, status: "running" };
      await args.stateManager.write(state);
      continue;
    }

    if (!detection.detected && detection.type === "session_error") {
      throw new SessionResumeError(state.sessionId ?? "(unknown)", output.slice(0, 400));
    }

    state = {
      ...state,
      status: code === 0 ? "completed" : "error",
      lastError: code === 0 ? null : `exit ${code}`,
      resetAt: null,
    };
    await args.stateManager.write(state);
    return code;
  }
}

async function recoverAndLoop(args: {
  prior: PersistedState;
  stateManager: StateManager;
  adapter: ClaudeAdapter;
  config: ClaudeAutoConfig;
  signals: SignalHub;
  logger: Logger;
  yes: boolean;
  extraArgs?: string[];
  retry: RetryManager;
  cwd: string;
  setActive: (h: ClaudeProcessHandle) => void;
}): Promise<number> {
  const state = args.prior;
  const priorSessionId = state.sessionId;
  if (!priorSessionId) {
    args.logger.error("No previous Claude Auto session found to resume.");
    return 1;
  }
  if (!isValidSessionId(priorSessionId)) {
    throw new SessionResumeError(priorSessionId, "Stored session id is not a UUID.");
  }

  console.error("Previous Claude Auto session detected.");
  console.error("");
  console.error("Session:");
  console.error(priorSessionId);
  console.error("");
  console.error("Status:");
  console.error(state.status);
  console.error("");
  if (state.resetAt) {
    console.error("Estimated reset:");
    console.error(new Date(state.resetAt).toTimeString().slice(0, 8));
    console.error("");
  }

  if (!args.yes) {
    const rl = readline.createInterface({ input, output });
    try {
      const answer = (await rl.question("Resume this session? [Y/n] ")).trim();
      if (answer && !/^y(es)?$/i.test(answer)) {
        args.logger.info("Aborted.");
        return 0;
      }
    } finally {
      rl.close();
    }
  }

  const mode: AppMode =
    state.mode === "print" || state.mode === "interactive" ? state.mode : "interactive";

  if (state.status === "waiting" && state.resetAt) {
    const resetAt = new Date(state.resetAt);
    if (resetAt.getTime() > Date.now()) {
      await waitWithCountdown({
        resetAt,
        resumeCount: state.resumeCount,
        maxResumes: args.config.maxAutoResumes,
        enabled: args.config.countdown,
        signals: args.signals,
      });
    }
  }

  if (state.resumeCount >= args.config.maxAutoResumes) {
    throw new MaxResumesError(args.config.maxAutoResumes);
  }

  const next: PersistedState = {
    ...state,
    status: "resuming",
    mode,
  };
  await args.stateManager.write(next);
  args.logger.verbose(`Resuming session ${priorSessionId}`);

  const continuation = mode === "print" ? args.config.continuationPrompt : undefined;

  let handle: ClaudeProcessHandle;
  const sessionId = priorSessionId;
  try {
    const resumeOpts: Parameters<typeof args.adapter.resume>[1] = {
      mode,
      cwd: state.cwd ?? args.cwd,
      inheritStdio: mode === "interactive",
    };
    if (continuation !== undefined) resumeOpts.prompt = continuation;
    if (args.extraArgs !== undefined) resumeOpts.extraArgs = args.extraArgs;
    handle = await args.adapter.resume(sessionId, resumeOpts);
    args.setActive(handle);
  } catch (err) {
    throw new SessionResumeError(
      sessionId,
      err instanceof Error ? err.message : String(err),
    );
  }

  if (continuation) args.logger.verbose("Continuation sent");

  const running: PersistedState = { ...next, status: "running" };
  await args.stateManager.write(running);

  const loopArgs: Parameters<typeof sessionLoop>[0] = {
    handle,
    state: running,
    mode,
    adapter: args.adapter,
    config: args.config,
    signals: args.signals,
    logger: args.logger,
    stateManager: args.stateManager,
    retry: args.retry,
    cwd: state.cwd ?? args.cwd,
    setActive: args.setActive,
  };
  if (args.extraArgs !== undefined) loopArgs.extraArgs = args.extraArgs;
  return sessionLoop(loopArgs);
}
