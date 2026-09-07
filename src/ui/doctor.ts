import os from "node:os";
import { promises as fs } from "node:fs";
import { PACKAGE_VERSION, PRODUCT_NAME } from "../version.js";
import type { ClaudeAdapter } from "../claude/adapter.js";
import { getConfigDir, getStatePath } from "../platform/paths.js";
import type { ClaudeAutoConfig } from "../config/defaults.js";

export interface DoctorDeps {
  adapter: ClaudeAdapter;
  config: ClaudeAutoConfig;
  nodeVersion?: string;
  npmVersion?: string | null;
}

type Row = { label: string; ok: boolean | null; detail: string };

export async function runDoctor(deps: DoctorDeps): Promise<number> {
  const rows: Row[] = [];

  rows.push({
    label: "Operating system",
    ok: true,
    detail: `${process.platform} (${os.release()})`,
  });
  rows.push({
    label: "Architecture",
    ok: true,
    detail: os.arch(),
  });

  const node = deps.nodeVersion ?? process.versions.node;
  const nodeMajor = Number(node.split(".")[0] ?? 0);
  rows.push({
    label: "Node.js",
    ok: nodeMajor >= 20,
    detail: nodeMajor >= 20 ? `v${node}` : `v${node} (need >= 20)`,
  });

  rows.push({
    label: "npm",
    ok: deps.npmVersion ? true : null,
    detail: deps.npmVersion ?? "not checked",
  });

  let capsOk: boolean | null = null;
  let versionDetail = "unavailable";
  let sessionDetail = "Unable to verify session resume support";
  let resumeDetail = "Unable to verify session resume support";
  let interactiveDetail = "assumed (default Claude Code mode)";
  let promptDetail = "Unable to verify";

  try {
    const bin = await deps.adapter.getBinaryPath();
    rows.push({
      label: "Claude Code installed",
      ok: true,
      detail: bin,
    });
    const caps = await deps.adapter.detectCapabilities();
    versionDetail = caps.version;
    rows.push({
      label: "Claude Code version",
      ok: true,
      detail: caps.version,
    });
    capsOk = caps.verified;
    sessionDetail = caps.supportsSessionId
      ? "--session-id present in --help"
      : "⚠ --session-id not found in --help";
    resumeDetail = caps.supportsSessionResume
      ? "--resume present in --help"
      : "⚠ --resume not found in --help";
    interactiveDetail = caps.supportsInteractive
      ? "default interactive mode"
      : "not detected";
    promptDetail = caps.supportsPromptMode
      ? "-p/--print present in --help"
      : "⚠ -p/--print not found in --help";
  } catch (err) {
    rows.push({
      label: "Claude Code installed",
      ok: false,
      detail:
        err instanceof Error ? (err.message.split("\n")[0] ?? "missing") : "missing",
    });
    rows.push({
      label: "Claude Code version",
      ok: false,
      detail: versionDetail,
    });
  }

  rows.push({
    label: "Session support",
    ok: capsOk,
    detail: sessionDetail,
  });
  rows.push({
    label: "Resume support",
    ok: capsOk,
    detail: resumeDetail,
  });
  rows.push({
    label: "Interactive support",
    ok: true,
    detail: interactiveDetail,
  });
  rows.push({
    label: "Prompt/print support",
    ok: capsOk,
    detail: promptDetail,
  });

  rows.push({
    label: "Configuration",
    ok: true,
    detail: `fallback=${deps.config.fallbackResetSeconds}s buffer=${deps.config.resetBufferSeconds}s maxResumes=${deps.config.maxAutoResumes}`,
  });

  const stateDir = getConfigDir();
  let stateOk = true;
  let stateDetail = stateDir;
  try {
    await fs.mkdir(stateDir, { recursive: true });
    await fs.access(stateDir);
    stateDetail = `${stateDir} (writable); state=${getStatePath()}`;
  } catch {
    stateOk = false;
    stateDetail = `${stateDir} (not writable)`;
  }
  rows.push({
    label: "State directory",
    ok: stateOk,
    detail: stateDetail,
  });

  console.log(`${PRODUCT_NAME} Doctor`);
  console.log("──────────────────────────────");
  console.log(`claude-auto ${PACKAGE_VERSION}`);
  console.log("");

  let exit = 0;
  for (const row of rows) {
    const mark = row.ok === true ? "✓" : row.ok === false ? "✗" : "⚠";
    if (row.ok === false) exit = 1;
    console.log(`${pad(row.label, 22)} ${mark}  ${row.detail}`);
  }

  console.log("");
  if (exit !== 0) {
    console.log("Suggestions:");
    console.log("- Install Claude Code and ensure `claude` is on PATH");
    console.log("- Upgrade Claude Code if --resume / --session-id are missing");
    console.log("- Fix permissions on the state directory");
    console.log("- Use Node.js 20 or newer");
  } else if (capsOk === null) {
    console.log("⚠ Unable to verify session resume support");
  }

  return exit;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}
