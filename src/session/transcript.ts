import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { isWindows } from "../platform/paths.js";

/** Claude Code encodes project paths as `cwd` with `/` → `-`. */
export function encodeProjectDir(cwd: string): string {
  const normalized = path.resolve(cwd);
  if (isWindows()) {
    // e.g. C:\Users\foo → C--Users-foo (observed Claude-style)
    return normalized.replace(/^[A-Za-z]:/, (m) => m[0] + "-").replace(/[\\/]+/g, "-");
  }
  return normalized.replace(/\//g, "-");
}

export function getClaudeProjectsRoot(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function sessionTranscriptPath(cwd: string, sessionId: string): string {
  return path.join(
    getClaudeProjectsRoot(),
    encodeProjectDir(cwd),
    `${sessionId}.jsonl`,
  );
}

/** Find transcript by session id across projects (Claude may relocate). */
export async function findSessionTranscript(
  sessionId: string,
  preferredCwd?: string,
): Promise<string | null> {
  if (preferredCwd) {
    const preferred = sessionTranscriptPath(preferredCwd, sessionId);
    try {
      await fs.access(preferred);
      return preferred;
    } catch {
      // continue search
    }
  }

  const root = getClaudeProjectsRoot();
  let projects: string[];
  try {
    projects = await fs.readdir(root);
  } catch {
    return null;
  }

  for (const project of projects) {
    const candidate = path.join(root, project, `${sessionId}.jsonl`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // next
    }
  }
  return null;
}
