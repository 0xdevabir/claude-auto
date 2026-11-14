import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VerificationEngine } from "../../src/verification/verifier.js";

describe("Verification Engine", () => {
  const verifier = new VerificationEngine();

  it("fails verification when expected files are missing", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-verif-"));

    const res = await verifier.verify({
      workingDir: tmpDir,
      skipTests: true,
      skipTypecheck: true,
      expectedFiles: ["src/missing-file.ts"],
    });

    expect(res.overallSuccess).toBe(false);
    expect(res.missingExpectedFiles).toContain("src/missing-file.ts");
    expect(res.summary).toContain("Verification FAILED");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("passes verification when all expected files exist and checks are green", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-verif-pass-"));
    const testFile = path.join(tmpDir, "output.txt");
    await fs.writeFile(testFile, "hello", "utf8");

    const res = await verifier.verify({
      workingDir: tmpDir,
      skipTests: true,
      skipTypecheck: true,
      expectedFiles: [testFile],
    });

    expect(res.overallSuccess).toBe(true);
    expect(res.missingExpectedFiles.length).toBe(0);
    expect(res.summary).toContain("Verification PASSED");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
