# Claude Auto

Independent community wrapper around the **Claude Code** CLI.

When Claude Code stops because of a usage or rate limit, Claude Auto waits for the reset window (plus a safety buffer) and resumes the **same Claude Code session** so the task can continue.

```text
Claude Code
    │
    ▼
working
    │
    ▼
usage limit
    │
    ▼
Claude Auto detects limit
    │
    ▼
wait for reset
    │
    ▼
resume SAME session
    │
    ▼
continue task
```

## Features

- Same-session resume via verified Claude Code flags (`--session-id`, `--resume`)
- Interactive mode and print/prompt mode
- Limit detection + reset time parsing
- Countdown wait UI (optional)
- Configurable fallback wait, buffer, max resumes, continuation prompt
- Recovery after interrupted waits (`--resume`)
- Doctor diagnostics (`--doctor`)
- Mock mode for local testing (`--mock`)
- Cross-platform: macOS, Linux, Windows
- Local-first: no telemetry, no accounts, no remote control plane

## How it works

1. Claude Auto generates a UUID and starts Claude Code with `--session-id <uuid>`.
2. In print mode, stdout/stderr are observed for usage/rate-limit messages (wording aligned with [Claude Code errors docs](https://code.claude.com/docs/en/errors)).
3. On a retryable limit, state is saved, Claude Auto waits until `resetAt + resetBufferSeconds`, then runs `claude --resume <uuid>` (with `-p` + continuation prompt in print mode).
4. It never silently starts an unrelated new session after a limit.

## Requirements

- Node.js 20+
- Claude Code CLI installed and available as `claude` on `PATH`

Verified during development against **Claude Code 2.1.263**.

## Installation

```bash
npm install -g claude-auto
```

Or:

```bash
npx claude-auto --doctor
```

## Quick Start

```bash
claude-auto
claude-auto "Build the authentication system"
claude-auto --prompt "Build the authentication system"
claude-auto --doctor
claude-auto --mock
```

## Interactive Mode

```bash
claude-auto
```

Behaves like `claude` for day-to-day interactive use (stdin/stdout/stderr inherited).  
**Limitation:** if Claude Code stays open on an in-TUI limit dialog without exiting, the wrapper cannot scrape the GUI; prefer print mode for unattended automation. Claude Code ≥ 2.1.234 also has a native “Continue automatically at usage limit” setting.

## Prompt Mode

```bash
claude-auto --prompt "Build the entire authentication system"
```

Uses Claude Code `-p/--print`, detects limits from process output, waits, resumes the same session, and sends the continuation prompt.

## Automatic Resume

Default max automatic resumes: **20** (`--max-resumes` / `maxAutoResumes`).

## Configuration

Config file (optional):

- macOS/Linux: `~/.config/claude-auto/config.json`
- Windows: `%APPDATA%\claude-auto\config.json`

```json
{
  "fallbackResetSeconds": 1800,
  "resetBufferSeconds": 5,
  "maxAutoResumes": 20,
  "continuationPrompt": "Continue from where you stopped. Do not repeat completed work.",
  "countdown": true,
  "verbose": false,
  "autoResume": true
}
```

CLI flags override the file.

## Recovery

If Claude Auto dies while waiting:

```bash
claude-auto --resume
claude-auto --resume --yes
```

## Doctor

```bash
claude-auto --doctor
```

## Mock Mode

```bash
claude-auto --mock
```

Simulates start → limit → wait → resume → complete without calling Claude Code.

## CLI Reference

```text
Usage:
  claude-auto [prompt]
  claude-auto --resume
  claude-auto --doctor
  claude-auto --mock

Options:
  --prompt <text>
  --resume
  --max-resumes <number>
  --fallback-reset <seconds>
  --reset-buffer <seconds>
  --continuation-prompt <text>
  --no-countdown
  --verbose
  --config <path>
  --yes
  --doctor
  --mock
  --version
  --help
```

Pass-through: arguments after `--` are forwarded to Claude Code.

## Supported Platforms

| Platform | Status                                      |
| -------- | ------------------------------------------- |
| macOS    | Supported (developed on Apple Silicon)      |
| Linux    | Supported (CI)                              |
| Windows  | Supported (CI; process tree via `taskkill`) |

## Security & Privacy

Claude Auto is a local CLI wrapper. It does not need a server, account, or telemetry. It talks to Claude only through the locally installed Claude Code CLI. See [SECURITY.md](./SECURITY.md) and [docs/SECURITY.md](./docs/SECURITY.md).

## Troubleshooting

See [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [docs/TECHNICAL-DESIGN.md](./docs/TECHNICAL-DESIGN.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).

## Disclaimer

Claude Auto is an independent community-developed wrapper around the Claude Code CLI.

It is not affiliated with, sponsored by, or endorsed by Anthropic.

Claude Auto depends on the behavior and capabilities of the installed Claude Code CLI. Claude Code changes may require updates to Claude Auto.
