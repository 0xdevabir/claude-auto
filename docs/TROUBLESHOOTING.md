# Troubleshooting

## Claude Code cannot be found

**Symptom:** `Claude Code was not found.`

**Fix:**

1. Install Claude Code using Anthropic's current instructions.
2. Confirm `claude --version` works in the same shell.
3. Ensure the directory containing `claude` is on `PATH`.
4. Run `claude-auto --doctor`.

## Session cannot be resumed

**Symptom:** `The Claude Code session could not be resumed.` / `Failed to resume the conversation`

**Fix:**

- Confirm the session UUID still exists for that project.
- Resume from a related directory if the project moved (Claude Code searches across projects for an exact ID in recent versions).
- Do **not** expect Claude Auto to invent a replacement session — start a new run intentionally if the old session is gone.

## Claude Code version changed

Run `claude-auto --doctor`. If `--resume` or `--session-id` disappear from `claude --help`, upgrade Claude Code or wait for a Claude Auto adapter update.

## Usage reset cannot be detected / reset time unavailable

Claude Auto falls back to `fallbackResetSeconds` (default 1800) and labels it as a fallback. Tune via config or `--fallback-reset`.

## Interactive limit detection is incomplete

In interactive mode Claude Auto inherits the TTY. If Claude Code stays running on a limit dialog without exiting, the wrapper cannot observe piped text. Prefer print/prompt mode for unattended runs, or rely on Claude Code's own "Continue automatically at usage limit" setting (Claude Code ≥ 2.1.234) for in-process interactive waiting.

## Windows process does not terminate

Claude Auto attempts `taskkill /T /F` for process-tree cleanup. If a child remains, end it from Task Manager and inspect whether antivirus blocked termination.

## Terminal is not interactive

Countdown falls back to quiet waiting. Recovery prompts that need stdin may require `--yes`.

## Lock held by another instance

Another Claude Auto process holds `lock` under the config directory. If the process is dead, delete the stale lock after confirming the PID is gone, or wait for the other instance to exit.

## Corrupted state.json

Claude Auto quarantines the file to `state.corrupt.*.json` and refuses to guess. Inspect the backup, then remove or replace `state.json` deliberately.
