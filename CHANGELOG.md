# Changelog

## 1.0.1

Initial public release.

- Wrap the installed Claude Code CLI with same-session resume after usage/rate limits
- Verified against Claude Code CLI flags: `--session-id`, `--resume`, `-p/--print`
- Interactive mode, print/prompt mode, recovery (`--resume`), doctor, and mock mode
- Cross-platform state/lock under `~/.config/claude-auto` or `%APPDATA%\claude-auto`
- Configurable fallback reset, safety buffer, max resumes, and continuation prompt
