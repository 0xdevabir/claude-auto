import { promises as fs } from "node:fs";
import path from "node:path";
import { LockError } from "../errors/errors.js";
import { getLockPath, isWindows } from "../platform/paths.js";
import { sleep } from "../platform/process.js";

export interface LockHandle {
  release(): Promise<void>;
}

async function pidAlive(pid: number): Promise<boolean> {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EPERM") return true;
    return false;
  }
}

export async function acquireLock(lockPath = getLockPath()): Promise<LockHandle> {
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.writeFile(String(process.pid), "utf8");
      return {
        async release() {
          try {
            await handle.close();
          } catch {
            // ignore
          }
          try {
            await fs.unlink(lockPath);
          } catch {
            // ignore
          }
        },
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        throw new LockError(
          `Unable to acquire lock: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      try {
        const raw = await fs.readFile(lockPath, "utf8");
        const pid = Number(raw.trim());
        if (!(await pidAlive(pid))) {
          await fs.unlink(lockPath);
          continue;
        }
        throw new LockError(
          [
            "Another Claude Auto instance appears to be managing this session.",
            "",
            `Lock: ${lockPath}`,
            `PID: ${Number.isFinite(pid) ? pid : "unknown"}`,
            isWindows() ? "" : "",
          ].join("\n"),
        );
      } catch (inner) {
        if (inner instanceof LockError) throw inner;
        await sleep(50);
      }
    }
  }

  throw new LockError("Unable to acquire Claude Auto lock.");
}
