# Technical Design

## Process architecture

Claude Auto is a Node.js parent process that:

1. Resolves configuration and acquires a cross-platform state lock.
2. Locates the Claude Code executable on `PATH` (never auto-installs).
3. Generates a UUID v4 session id (or loads one from recovery state).
4. Spawns Claude Code as a child with argv built by the adapter.
5. Observes child output (prompt/print mode) or inherits the TTY (interactive).
6. On limit detection: stops the child if needed, persists state, waits, resumes.

## Session handling

- **Start:** `claude --session-id <uuid> …`
- **Resume:** `claude --resume <uuid> …` (never `--fork-session`)
- **Prompt/autonomous:** add `-p` / `--print` and the prompt/continuation text
- **Interactive:** no `-p`; stdin/stdout/stderr inherited

Session id is persisted in `state.json`. If resume fails (`Failed to resume the conversation` / not found), Claude Auto reports `SESSION_ERROR` and **does not** start a new session.

Note (official docs): `claude -p` sessions are omitted from the interactive picker and from `claude --continue`, but remain resumable via `claude --resume <id>`.

## Process lifecycle

| Phase   | Behavior                                    |
| ------- | ------------------------------------------- |
| Spawn   | `child_process.spawn` with `shell: false`   |
| Running | Forward exit code unless limit → wait path  |
| Limit   | Capture reset, increment resume count, wait |
| Resume  | New child with `--resume <id>`              |
| Exit    | Release lock; clear or mark state           |

## Signal handling

- `SIGINT` / `SIGTERM` / Windows `CTRL_C_EVENT` equivalents: cancel waiters, terminate child process tree, exit `130` (or `1` if already cleaning up).
- Ctrl+C during countdown is **cancel**, never resume.

## Stdout / stderr / stdin

- **Interactive:** `stdio: 'inherit'` — Claude Auto stays mostly invisible; limit detection after exit may also scan accumulated tee buffers when pipes are used.
- **Prompt / mock:** pipe stdout+stderr through the limit detector while still writing through to the terminal.
- Colors preserved when writing bytes through; respect `NO_COLOR`.

## Windows vs Unix process handling

- Unix: `SIGTERM` then `SIGKILL` to child; attempt process-group kill when started with `detached` only if safe.
- Windows: terminate via `taskkill /pid <pid> /t /f` when graceful kill fails; path handling via `path.win32` / `APPDATA`.
- Executable resolution uses `PATHEXT` awareness on Windows (`.cmd`, `.exe`).

## Configuration

Load order (later wins):

1. Built-in defaults
2. Config file (`--config` or platform config dir `config.json`)
3. CLI flags

Validated fields: `fallbackResetSeconds`, `resetBufferSeconds`, `maxAutoResumes`, `continuationPrompt`, `countdown`, `verbose`, `autoResume`, backoff settings.

## State persistence

Directory:

- macOS/Linux: `~/.config/claude-auto/`
- Windows: `%APPDATA%\claude-auto\`

Files:

- `state.json` — sessionId, status, resumeCount, resetAt, startedAt, mode
- `lock` — exclusive lock (file lock via `fs.open` + `wx` / pid check)
- Corrupted `state.json` → rename to `state.corrupt.<timestamp>.json`, explain, do not silently destroy

Never store API keys, tokens, conversation contents.

## Retry logic

1. Prefer server-provided reset time from detector/parser.
2. Else `fallbackResetSeconds` (default 1800) — labeled as fallback, not exact.
3. Always wait `resetAt + resetBufferSeconds`.
4. If still limited after resume: apply configurable exponential backoff (`30, 60, 120, 240…`) capped; never ignore a newer explicit reset time.
5. Stop at `maxAutoResumes`.

## Limit detection

Typed result with confidence. Patterns derived from [Claude Code errors docs](https://code.claude.com/docs/en/errors):

- Usage: `You've hit your session/weekly/Opus limit`, `resets <time>`
- Rate / 429: `Request rejected (429)`, temporary limiting
- Auth / network / permission / session-not-found classified separately (false-positive suite)

## Reset parsing

Supports seconds/minutes/hours, combined durations, `resets 3:45pm`, `resets Mon 12:00am`, `Retry after N seconds`, ISO timestamps. Prefer absolute timestamps when present.

## Logging

`--verbose` timestamps operational events; redacts home-directory secrets-looking tokens heuristically; never logs env auth vars.

## Testing strategy

- Unit: detector, parser, config, state, retry, command builder, capabilities
- Integration: mock lifecycle start→limit→wait→resume→complete
- Error: auth, network, max resumes, cancel, corrupt state
- CI matrix: Ubuntu, Windows, macOS × Node LTS

## npm packaging

- `bin.claude-auto` → `dist/cli.js` with shebang
- `files`: `dist`, `README`, `LICENSE`, docs subset as needed
- Engines: Node `>=20`
- No bundled credentials; `npm pack` audited in CI

## CI/CD

GitHub Actions: `npm ci`, typecheck, lint, test, build, `npm pack --dry-run` on three OSes.
