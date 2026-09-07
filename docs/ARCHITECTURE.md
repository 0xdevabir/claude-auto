# Architecture

## 2.1 Problem

Claude Code stops work when a plan usage/rate limit is hit. Users must notice the reset time, wait, then manually resume the **same** session and continue the task. Long unattended runs break at the limit boundary.

Claude Auto wraps the installed Claude Code CLI so that when a usage/rate limit is detected, it waits for the reset window (plus a safety buffer) and resumes the **same session** with an optional continuation prompt.

## 2.2 Goals

- Automatic usage/rate-limit handling without inventing Claude APIs
- Same-session continuation via verified Claude Code flags
- Cross-platform support (macOS, Linux, Windows)
- Safe process lifecycle and signal handling
- Configurable wait/retry/resume behavior
- npm-distributable CLI with transparent UX
- Local-first: no telemetry, no accounts, no remote control plane

## 2.3 Non-goals

- Bypassing Anthropic usage limits or safeguards
- Auto-approving Claude Code permission prompts
- Default use of `--dangerously-skip-permissions`
- Credential extraction or storage
- GUI / keyboard / accessibility automation
- Silent creation of a new unrelated session after a limit
- Claiming Claude Code behaviors that were not verified

## 2.4 Architecture

```text
CLI (cli.ts)
 │
 ▼
Application Controller (app.ts)
 │
 ├── Claude Adapter          — locate binary, build argv, start/resume
 ├── Process Manager          — spawn, pipe/inherit, terminate trees
 ├── Session Manager          — UUID session id, persistence, recovery
 ├── Limit Detector           — classify stdout/stderr / exit text
 ├── Reset Time Parser        — durations, clock times, timestamps
 ├── Retry / Backoff Manager  — buffers, fallbacks, conservative backoff
 ├── State Manager            — ~/.config or %APPDATA% state.json + lock
 ├── Configuration Manager    — defaults → file → CLI overrides
 └── Terminal UI             — countdown, doctor, verbose logs
```

The Claude Adapter is the **only** module that encodes Claude Code CLI flags and version-specific capability parsing. Everything else depends on adapter interfaces.

## 2.5 State machine

```text
IDLE → STARTING → RUNNING → LIMIT_DETECTED → WAITING_FOR_RESET
  → RESET_READY → RESUMING → RUNNING → COMPLETED
```

Error / terminal states:

```text
AUTH_ERROR | NETWORK_ERROR | SESSION_ERROR | UNKNOWN_ERROR
MAX_RESUMES | USER_CANCELLED
```

Transitions into error states never start a replacement session unless the user explicitly starts a new run without `--resume`.

## 2.6 Data flow

```text
User
 ↓
claude-auto
 ↓  (spawn verified argv: --session-id / -p / --resume …)
Claude Code CLI
 ↓
Claude session (UUID known a priori via --session-id)
 ↓
usage/rate limit text in output (or process exit payload)
 ↓
limit detector → reset parser → wait (resetAt + buffer)
 ↓
claude --resume <same-uuid> [-p continuation]
 ↓
continuation of original task
```

## 2.7 Security model

**Can:** spawn the local `claude` executable from PATH; persist non-secret session metadata; parse local process output; forward user-supplied Claude flags when explicitly passed.

**Cannot / must not:** collect credentials; upload project files; send telemetry; store Anthropic tokens; auto-approve permissions; weaken Claude Code security defaults; download remote executables; invent session IDs that invent a new conversation while claiming continuity.

Verified Claude Code surface (installed **2.1.263** on the development machine):

| Capability              | Mechanism                                            |
| ----------------------- | ---------------------------------------------------- |
| Interactive session     | `claude` / `claude [prompt]`                         |
| Print / prompt mode     | `-p` / `--print`                                     |
| Fixed session id        | `--session-id <uuid>`                                |
| Resume same session     | `-r` / `--resume <session-id>`                       |
| Continue latest (cwd)   | `-c` / `--continue` (not used for same-id guarantee) |
| Structured print output | `--output-format text\|json\|stream-json`            |

Claude Auto **pre-assigns** `--session-id` so resumption never depends on “most recent session” heuristics.
