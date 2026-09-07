# Claude Auto

**Keep Claude Code working through usage limits — same session, automatically.**

When Claude Code hits a usage or rate limit, Claude Auto waits for the reset, then resumes the **exact same session** and continues your task. No new chat. No lost context.

```text
you run a long task
        │
        ▼
   Claude works
        │
        ▼
  usage limit hit
        │
        ▼
 Claude Auto waits
        │
        ▼
 resume SAME session
        │
        ▼
   task continues
```

> Independent community tool. **Not** affiliated with Anthropic.

---

## Install

**Need:** [Node.js 20+](https://nodejs.org/) and [Claude Code](https://code.claude.com/) on your `PATH` (`claude --version` should work).

```bash
npm install -g claude-auto
```

Check everything is ready:

```bash
claude-auto --doctor
```

Or try without installing:

```bash
npx claude-auto --doctor
```

---

## Quick start

### Everyday interactive use

```bash
claude-auto
```

Works like opening `claude` — chat normally. Claude Auto stays out of the way until a limit stops the process.

### Long unattended tasks (recommended)

```bash
claude-auto --prompt "Build the authentication system end to end"
```

Best mode for overnight / AFK work. Claude Auto watches output, waits out limits, resumes the **same** session, and sends a continuation prompt.

Short form:

```bash
claude-auto "Refactor the billing module and add tests"
```

---

## What you’ll see when a limit hits

```text
────────────────────────────────────────
Claude Auto
────────────────────────────────────────

Claude usage limit detected.

Waiting for reset...

Estimated reset:
    23:30:05

Remaining:
    28m 41s

Resumes:
    2 / 20

Press Ctrl+C to stop.
```

When the window opens, it resumes automatically (up to 20 times by default).

Hide the countdown:

```bash
claude-auto --prompt "…" --no-countdown
```

---

## Common commands

| Goal | Command |
| --- | --- |
| Open Claude like usual | `claude-auto` |
| Run a task until done | `claude-auto --prompt "…"` |
| Recover after a crash / closed terminal | `claude-auto --resume` |
| Skip the recover confirmation | `claude-auto --resume --yes` |
| Check your setup | `claude-auto --doctor` |
| Practice the wait/resume flow (no Claude API) | `claude-auto --mock` |
| See all options | `claude-auto --help` |

Pass extra Claude Code flags after `--`:

```bash
claude-auto --prompt "Fix flaky tests" -- --model sonnet
```

---

## Configure (optional)

Create a config file:

| OS | Path |
| --- | --- |
| macOS / Linux | `~/.config/claude-auto/config.json` |
| Windows | `%APPDATA%\claude-auto\config.json` |

```json
{
  "fallbackResetSeconds": 1800,
  "resetBufferSeconds": 5,
  "maxAutoResumes": 20,
  "continuationPrompt": "Continue from where you stopped. Do not repeat completed work. Inspect the project and finish the original task.",
  "countdown": true,
  "verbose": false,
  "autoResume": true
}
```

Or set the same things from the CLI:

```bash
claude-auto --prompt "…" \
  --max-resumes 10 \
  --fallback-reset 1800 \
  --reset-buffer 5 \
  --continuation-prompt "Continue the task from the current state." \
  --verbose
```

CLI flags always win over the config file.

| Setting | Meaning |
| --- | --- |
| `fallbackResetSeconds` | Wait this long if Claude didn’t say when the limit resets (default 30 minutes) |
| `resetBufferSeconds` | Extra seconds after the reset time before retrying (default 5) |
| `maxAutoResumes` | Stop after this many automatic resumes (default 20) |
| `continuationPrompt` | Sent only when resuming print/prompt mode after a limit |

---

## Tips for best results

1. **Prefer `--prompt` for long jobs** — limit detection is most reliable in print mode.
2. **Same session always** — Claude Auto uses `--session-id` / `--resume`. It will not quietly start a new unrelated session and pretend it continued.
3. **Interrupted wait?** Run `claude-auto --resume` — it picks up the saved session and reset time.
4. **Claude Code’s own auto-continue** (v2.1.234+) can also wait inside an interactive session; Claude Auto is especially useful for prompt-mode automation, recovery, and when that setting is off.

---

## Platforms

Works on **macOS**, **Linux**, and **Windows**.

---

## Privacy

Local only. No account, no telemetry, no uploads. Claude Auto only talks to the Claude Code CLI already on your machine.

---

## Troubleshooting

| Problem | What to try |
| --- | --- |
| `Claude Code was not found` | Install Claude Code and ensure `claude` is on your `PATH`, then run `claude-auto --doctor` |
| Session won’t resume | The old session may be gone — Claude Auto will say so instead of inventing a new one |
| Reset time unknown | It uses your `fallbackResetSeconds` and tells you it’s a fallback |
| Another instance lock | Close the other `claude-auto` process, or wait for it to finish |

More detail: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

---

## CLI reference

```text
Usage:
  claude-auto [prompt]
  claude-auto --prompt <text>
  claude-auto --resume
  claude-auto --doctor
  claude-auto --mock

Options:
  --prompt <text>                 Print mode with an initial prompt
  --resume                        Recover a previous wait / session
  --max-resumes <number>          Max automatic resumes (default: 20)
  --fallback-reset <seconds>      Fallback wait if reset time is unknown
  --reset-buffer <seconds>        Extra seconds after reset
  --continuation-prompt <text>    Prompt used only on resume (print mode)
  --no-countdown                  Quiet waiting (no live countdown)
  --verbose                       Operational logs
  --config <path>                 Custom config JSON
  --yes                           Confirm recovery without asking
  --doctor                        Environment check
  --mock                          Local demo lifecycle
  --version
  --help
```

---

## For contributors

```bash
git clone <this-repo>
cd claude-auto
npm install
npm run typecheck && npm run lint && npm test && npm run build
```

- [Contributing](./CONTRIBUTING.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Technical design](./docs/TECHNICAL-DESIGN.md)
- [Security](./SECURITY.md)

---

## License

MIT — see [LICENSE](./LICENSE).

## Disclaimer

Claude Auto is an independent community-developed wrapper around the Claude Code CLI. It is not affiliated with, sponsored by, or endorsed by Anthropic.

Behavior depends on your installed Claude Code version. Claude Code updates may require updates to Claude Auto.
