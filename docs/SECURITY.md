# Security notes (docs)

Claude Auto is a **local** process wrapper around the Claude Code CLI.

## Guarantees we aim for

- No telemetry by default
- No account system
- No credential collection or storage
- No automatic `--dangerously-skip-permissions`
- No GUI / keyboard automation
- No silent new-session substitution after a limit

## Threat notes

- Child process argv is built from structured options; user passthrough after `--` is forwarded as discrete argv entries via `spawn` with `shell: false`.
- State files store session UUID and status only.
- Verbose logs attempt basic redaction of token-like strings; do not put secrets in prompts you are unwilling to have on your machine.

See also root `SECURITY.md` for vulnerability reporting.
