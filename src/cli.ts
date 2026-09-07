#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { runApp } from "./app.js";
import { DefaultClaudeAdapter } from "./claude/adapter.js";
import { loadConfig } from "./config/manager.js";
import { ConfigurationError, formatErrorBanner } from "./errors/errors.js";
import { runMockMode } from "./mock/runner.js";
import { globalSignals } from "./process/signals.js";
import { runDoctor } from "./ui/doctor.js";
import { Logger } from "./ui/logger.js";
import { CLI_NAME, PACKAGE_VERSION, PRODUCT_NAME } from "./version.js";

function printHelp(): void {
  console.log(`${PRODUCT_NAME} — automatic same-session resume for Claude Code

Usage:
  ${CLI_NAME} [prompt]
  ${CLI_NAME} --prompt <text>
  ${CLI_NAME} --resume
  ${CLI_NAME} --doctor
  ${CLI_NAME} --mock

Options:
  --prompt <text>                 Run Claude Code in print mode with a prompt
  --resume                        Recover a previous Claude Auto wait/session
  --max-resumes <number>          Maximum automatic resumes (default: 20)
  --fallback-reset <seconds>      Fallback wait when reset time is unknown
  --reset-buffer <seconds>        Extra seconds after reset before resume
  --continuation-prompt <text>    Prompt sent only when resuming print mode
  --no-countdown                  Disable in-place countdown UI
  --verbose                       Verbose operational logs
  --config <path>                 Path to config JSON
  --yes                           Confirm recovery without prompting
  --doctor                        Environment and capability checks
  --mock                          Simulate limit → wait → resume locally
  --version                       Print version
  --help                          Show help

Any arguments after \`--\` are forwarded to Claude Code unchanged.

Disclaimer:
  Independent community wrapper. Not affiliated with Anthropic.
`);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseNumber(name: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ConfigurationError(`Invalid ${name}: expected a non-negative number.`);
  }
  return n;
}

async function main(argv: string[]): Promise<number> {
  let values: ReturnType<typeof parseArgs>["values"];
  let positionals: string[];
  let tokens: ReturnType<typeof parseArgs>["tokens"];

  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: false,
      tokens: true,
      options: {
        prompt: { type: "string" },
        resume: { type: "boolean", default: false },
        "max-resumes": { type: "string" },
        "fallback-reset": { type: "string" },
        "reset-buffer": { type: "string" },
        "continuation-prompt": { type: "string" },
        "no-countdown": { type: "boolean", default: false },
        verbose: { type: "boolean", default: false },
        config: { type: "string" },
        yes: { type: "boolean", default: false },
        doctor: { type: "boolean", default: false },
        mock: { type: "boolean", default: false },
        version: { type: "boolean", short: "V", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
    values = parsed.values;
    positionals = parsed.positionals;
    tokens = parsed.tokens;
  } catch (err) {
    console.error(formatErrorBanner(err));
    return 1;
  }

  if (values.help) {
    printHelp();
    return 0;
  }
  if (values.version) {
    console.log(PACKAGE_VERSION);
    return 0;
  }

  const passthrough: string[] = [];
  let afterDash = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      afterDash = true;
      passthrough.push(...argv.slice(i + 1));
      break;
    }
  }
  void afterDash;
  void tokens;

  // Collect unknown long options to forward? Spec says only after --.
  // Positionals that aren't our prompt go unused.

  try {
    const configOverrides: Parameters<typeof loadConfig>[0] = {};
    const configPath = asString(values.config);
    if (configPath !== undefined) configOverrides.configPath = configPath;
    const fallbackReset = parseNumber(
      "--fallback-reset",
      asString(values["fallback-reset"]),
    );
    if (fallbackReset !== undefined) configOverrides.fallbackResetSeconds = fallbackReset;
    const resetBuffer = parseNumber("--reset-buffer", asString(values["reset-buffer"]));
    if (resetBuffer !== undefined) configOverrides.resetBufferSeconds = resetBuffer;
    const maxResumes = parseNumber("--max-resumes", asString(values["max-resumes"]));
    if (maxResumes !== undefined) configOverrides.maxAutoResumes = maxResumes;
    const continuation = asString(values["continuation-prompt"]);
    if (continuation !== undefined) configOverrides.continuationPrompt = continuation;
    if (values["no-countdown"]) configOverrides.countdown = false;
    if (values.verbose) configOverrides.verbose = true;
    const { config } = await loadConfig(configOverrides);

    const adapter = new DefaultClaudeAdapter();
    globalSignals.attach();

    if (values.doctor) {
      let npmVersion: string | null = null;
      try {
        const r = spawnSync("npm", ["--version"], {
          encoding: "utf8",
          shell: false,
        });
        npmVersion = (r.stdout || "").trim() || null;
      } catch {
        npmVersion = null;
      }
      return runDoctor({ adapter, config, npmVersion });
    }

    if (values.mock) {
      const logger = new Logger(config.verbose);
      return runMockMode({ config, signals: globalSignals, logger });
    }

    if (values.resume) {
      return runApp({
        adapter,
        config,
        mode: "interactive",
        recover: true,
        yes: values.yes === true,
        extraArgs: passthrough,
      });
    }

    const promptFromFlag = asString(values.prompt);
    const promptFromPositional = positionals[0];
    const prompt = promptFromFlag ?? promptFromPositional;
    const mode = prompt !== undefined ? "print" : "interactive";

    const appOpts: Parameters<typeof runApp>[0] = {
      adapter,
      config,
      mode,
      extraArgs: passthrough,
      yes: values.yes === true,
    };
    if (prompt !== undefined) appOpts.prompt = prompt;
    return runApp(appOpts);
  } catch (err) {
    console.error(formatErrorBanner(err));
    return 1;
  }
}

const code = await main(process.argv.slice(2));
process.exitCode = code;
