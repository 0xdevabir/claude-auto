# Security Policy

## Supported versions

Security fixes are accepted for the latest published `claude-auto` release on npm.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email the maintainer privately (via the contact listed on the GitHub repository profile / security advisories) with:

- a description of the issue
- steps to reproduce
- impact assessment
- any suggested fix

We will acknowledge receipt as soon as practical and coordinate a fix and disclosure timeline.

## Scope notes

Claude Auto is a local CLI wrapper. It must never:

- collect or upload credentials
- store Anthropic authentication tokens
- bypass Claude Code permission prompts by default
- download or execute remote binaries as part of normal operation
- enable telemetry by default
