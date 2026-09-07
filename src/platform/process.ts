import { spawn } from "node:child_process";
import { isWindows } from "./paths.js";

export async function terminateProcessTree(pid: number): Promise<void> {
  if (!Number.isFinite(pid) || pid <= 0) return;

  if (isWindows()) {
    await new Promise<void>((resolve) => {
      const child = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
      child.on("exit", () => resolve());
      child.on("error", () => resolve());
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
  }

  await sleep(200);

  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
