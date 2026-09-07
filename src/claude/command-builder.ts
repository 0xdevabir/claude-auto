export interface CommandBuildOptions {
  sessionId: string;
  mode: "interactive" | "print";
  prompt?: string;
  resume?: boolean;
  extraArgs?: string[];
}

/**
 * Builds argv for the verified Claude Code CLI surface.
 * Only uses flags confirmed via `claude --help` on the target install.
 */
export function buildClaudeArgs(options: CommandBuildOptions): string[] {
  const args: string[] = [];

  if (options.resume) {
    args.push("--resume", options.sessionId);
  } else {
    args.push("--session-id", options.sessionId);
  }

  if (options.mode === "print") {
    args.push("-p");
    if (options.prompt !== undefined && options.prompt.length > 0) {
      args.push(options.prompt);
    }
  } else if (options.prompt !== undefined && options.prompt.length > 0) {
    // Interactive with an initial prompt (positional), verified in help:
    // Usage: claude [options] [command] [prompt]
    args.push(options.prompt);
  }

  if (options.extraArgs?.length) {
    args.push(...options.extraArgs);
  }

  return args;
}
