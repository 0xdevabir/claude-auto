# Changelog

## 1.1.0

- Add `claude-auto ide install|enable|disable|status` for VS Code / Cursor / Claude Code
- Install `/claude-auto` user slash command and enable `autoContinueAtUsageLimit`
- Ship Claude Code plugin under `claude-plugin/`


## 1.0.1

Initial public release.

- Wrap the installed Claude Code CLI with same-session resume after usage/rate limits
- Verified against Claude Code CLI flags: `--session-id`, `--resume`, `-p/--print`
- Interactive mode, print/prompt mode, recovery (`--resume`), doctor, and mock mode
- Cross-platform state/lock under `~/.config/claude-auto` or `%APPDATA%\claude-auto`
- Configurable fallback reset, safety buffer, max resumes, and continuation prompt
