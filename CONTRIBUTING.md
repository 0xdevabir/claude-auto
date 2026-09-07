# Contributing

Thanks for contributing to Claude Auto.

## Requirements

- Node.js 20+
- npm 10+
- Claude Code CLI installed locally for manual integration checks (`claude` on PATH)

## Setup

```bash
npm install
npm run build
```

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

## Mock mode

Use mock mode for end-to-end wrapper testing without calling Claude Code:

```bash
npm run build
node dist/cli.js --mock
```

## Pull requests

1. Keep changes focused.
2. Do not invent Claude Code flags — verify with `claude --help` on a real install.
3. Add or update unit tests for parsers, detectors, and config.
4. Update docs when behavior or limitations change.
5. Never commit secrets, `.env` files, or local state.

## Issues

Include OS, Node version, Claude Code version (`claude --version`), and the exact command you ran.
