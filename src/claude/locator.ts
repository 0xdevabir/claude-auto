import { access, constants } from "node:fs/promises";
import path from "node:path";
import { ClaudeNotInstalledError } from "../errors/errors.js";
import { isWindows } from "../platform/paths.js";

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function pathEntries(): string[] {
  const raw = process.env.PATH ?? process.env.Path ?? "";
  return raw.split(path.delimiter).filter(Boolean);
}

function candidateNames(): string[] {
  if (!isWindows()) return ["claude"];
  const pathext = (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";");
  const names = ["claude"];
  for (const ext of pathext) {
    const normalized = ext.startsWith(".") ? ext : `.${ext}`;
    names.push(`claude${normalized.toLowerCase()}`);
    names.push(`claude${normalized}`);
  }
  return [...new Set(names)];
}

export async function locateClaudeBinary(explicit?: string): Promise<string> {
  if (explicit) {
    if (await isExecutable(explicit)) return explicit;
    throw new ClaudeNotInstalledError(`Claude Code executable not found at: ${explicit}`);
  }

  for (const dir of pathEntries()) {
    for (const name of candidateNames()) {
      const full = path.join(dir, name);
      if (await isExecutable(full)) {
        return full;
      }
    }
  }

  throw new ClaudeNotInstalledError(
    [
      "Claude Code was not found.",
      "",
      "Install Claude Code first, then run:",
      "",
      "  claude-auto --doctor",
    ].join("\n"),
  );
}
