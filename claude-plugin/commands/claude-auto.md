---
description: Enable Claude Auto — wait for usage-limit reset and continue the same session
allowed-tools: Bash, Read
---

# /claude-auto

Enable automatic continue-after-usage-limit for this machine (works in Claude Code CLI, VS Code, and Cursor).

## Do this now

Run exactly:

```bash
claude-auto ide enable
claude-auto ide status
```

If `claude-auto` is not on PATH, run via npx:

```bash
npx claude-auto ide enable
npx claude-auto ide status
```

## Then tell the user

1. **Enabled:** Claude Code setting `autoContinueAtUsageLimit` is now on.
2. When they hit a session/usage limit, Claude Code will **wait for reset and continue the same conversation** (no new session).
3. Status-bar **“auto mode”** (Shift+Tab) is unrelated — that is permissions, not usage limits.
4. For terminal-wrapped long jobs they can still run: `claude-auto --prompt "…"`.
5. To turn off later: `/claude-auto:off` or `claude-auto ide disable`.

Do not invent other settings. Do not start a new session.
