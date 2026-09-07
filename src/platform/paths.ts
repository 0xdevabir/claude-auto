import os from "node:os";
import path from "node:path";

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function getConfigDir(): string {
  if (isWindows()) {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "claude-auto");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.length > 0) {
    return path.join(xdg, "claude-auto");
  }
  return path.join(os.homedir(), ".config", "claude-auto");
}

export function getStatePath(): string {
  return path.join(getConfigDir(), "state.json");
}

export function getLockPath(): string {
  return path.join(getConfigDir(), "lock");
}
