import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SETTING_KEY = "autoContinueAtUsageLimit" as const;

export function getClaudeSettingsPath(): string {
  const base = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  return path.join(base, "settings.json");
}

export function getUserCommandsDir(): string {
  const base = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
  return path.join(base, "commands");
}

export function getPluginRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/ide → ../../claude-plugin (dev/build layout)
  return path.resolve(here, "..", "..", "claude-plugin");
}

async function readSettings(): Promise<Record<string, unknown>> {
  const settingsPath = getClaudeSettingsPath();
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  return {};
}

async function writeSettings(settings: Record<string, unknown>): Promise<void> {
  const settingsPath = getClaudeSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const tmp = `${settingsPath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  await fs.rename(tmp, settingsPath);
}

export async function enableIdeAutoContinue(): Promise<{
  path: string;
  enabled: boolean;
}> {
  const settings = await readSettings();
  settings[SETTING_KEY] = true;
  await writeSettings(settings);
  return { path: getClaudeSettingsPath(), enabled: true };
}

export async function disableIdeAutoContinue(): Promise<{
  path: string;
  enabled: boolean;
}> {
  const settings = await readSettings();
  settings[SETTING_KEY] = false;
  await writeSettings(settings);
  return { path: getClaudeSettingsPath(), enabled: false };
}

export async function getIdeAutoContinueStatus(): Promise<{
  path: string;
  enabled: boolean | null;
  raw: unknown;
}> {
  const settings = await readSettings();
  const raw = settings[SETTING_KEY];
  const enabled = typeof raw === "boolean" ? raw : null;
  return { path: getClaudeSettingsPath(), enabled, raw };
}

/** Install user-level `/claude-auto` command (no plugin namespace). */
export async function installUserSlashCommand(): Promise<string> {
  const pluginRoot = getPluginRoot();
  const source = path.join(pluginRoot, "commands", "claude-auto.md");
  const destDir = getUserCommandsDir();
  const dest = path.join(destDir, "claude-auto.md");
  await fs.mkdir(destDir, { recursive: true });
  const body = await fs.readFile(source, "utf8");
  await fs.writeFile(dest, body, "utf8");
  return dest;
}

export async function uninstallUserSlashCommand(): Promise<boolean> {
  const dest = path.join(getUserCommandsDir(), "claude-auto.md");
  try {
    await fs.unlink(dest);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}
