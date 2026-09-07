import { sleep } from "../platform/process.js";
import type { ClaudeAutoConfig } from "../config/defaults.js";
import type { SignalHub } from "../process/signals.js";
import { UserCancelledError } from "../errors/errors.js";
import { waitWithCountdown } from "../ui/countdown.js";
import { Logger } from "../ui/logger.js";
import { createSessionId } from "../claude/session.js";

export async function runMockMode(options: {
  config: ClaudeAutoConfig;
  signals: SignalHub;
  logger: Logger;
}): Promise<number> {
  const { config, signals, logger } = options;
  const sessionId = createSessionId();

  logger.banner("Claude Auto — Mock Mode");
  logger.info("This does NOT invoke the real Claude Code service.");
  logger.info(`Session: ${sessionId}`);
  logger.info("");

  logger.verbose("Mock: Claude starts");
  console.log("[mock] Claude starts");
  await tick(config.mockLimitAfterMs, signals);
  console.log("[mock] working...");
  console.log("You've hit your session limit · resets in 5 seconds");

  const resetAt = new Date(Date.now() + config.mockResetAfterMs);
  await waitWithCountdown({
    resetAt,
    resumeCount: 1,
    maxResumes: config.maxAutoResumes,
    enabled: config.countdown,
    signals,
    usedFallback: false,
  });

  signals.throwIfCancelled();
  console.log("[mock] Resuming same session", sessionId);
  console.log("[mock] Continuation sent");
  await tick(config.mockCompleteAfterMs, signals);
  console.log("[mock] Task complete");
  logger.info("");
  logger.info("Mock lifecycle finished successfully.");
  return 0;
}

async function tick(ms: number, signals: SignalHub): Promise<void> {
  const step = 100;
  let left = ms;
  while (left > 0) {
    if (signals.isCancelled) throw new UserCancelledError();
    const slice = Math.min(step, left);
    await sleep(slice);
    left -= slice;
  }
}
