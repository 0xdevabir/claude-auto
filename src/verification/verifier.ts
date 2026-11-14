import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface VerificationOptions {
  workingDir?: string | undefined;
  skipTests?: boolean | undefined;
  skipTypecheck?: boolean | undefined;
  expectedFiles?: string[] | undefined;
}

export interface VerificationReport {
  overallSuccess: boolean;
  typecheck: {
    status: "passed" | "failed" | "skipped";
    output?: string | undefined;
  };
  tests: {
    status: "passed" | "failed" | "skipped";
    output?: string | undefined;
  };
  git: {
    hasChanges: boolean;
    diffSummary: string;
    changedFilesCount: number;
  };
  missingExpectedFiles: string[];
  summary: string;
}

export class VerificationEngine {
  async verify(options: VerificationOptions = {}): Promise<VerificationReport> {
    const cwd = options.workingDir ?? process.cwd();
    let overallSuccess = true;
    const failureReasons: string[] = [];

    // 1. Check TypeScript compilation
    let typecheckStatus: "passed" | "failed" | "skipped" = "skipped";
    let typecheckOutput: string | undefined;

    const hasTsConfig = await fs.stat(path.join(cwd, "tsconfig.json")).then(() => true).catch(() => false);

    if (hasTsConfig && !options.skipTypecheck) {
      const tsRes = spawnSync("npx", ["tsc", "--noEmit"], {
        cwd,
        encoding: "utf8",
        timeout: 25000,
      });

      if (tsRes.status === 0) {
        typecheckStatus = "passed";
      } else {
        typecheckStatus = "failed";
        typecheckOutput = (tsRes.stdout + "\n" + tsRes.stderr).trim();
        overallSuccess = false;
        failureReasons.push("TypeScript typecheck failed");
      }
    }

    // 2. Run Test Suite
    let testsStatus: "passed" | "failed" | "skipped" = "skipped";
    let testsOutput: string | undefined;

    if (!options.skipTests) {
      const hasPkg = await fs.stat(path.join(cwd, "package.json")).then(() => true).catch(() => false);
      if (hasPkg) {
        const testRes = spawnSync("npm", ["test"], {
          cwd,
          encoding: "utf8",
          timeout: 45000,
        });

        if (testRes.status === 0) {
          testsStatus = "passed";
        } else {
          testsStatus = "failed";
          testsOutput = (testRes.stdout + "\n" + testRes.stderr).trim();
          overallSuccess = false;
          failureReasons.push("Test suite assertions failed");
        }
      }
    }

    // 3. Inspect Git Diff
    let hasChanges = false;
    let diffSummary = "";
    let changedFilesCount = 0;

    try {
      const diffRes = spawnSync("git", ["diff", "--stat"], {
        cwd,
        encoding: "utf8",
        timeout: 3000,
      });
      if (diffRes.status === 0 && diffRes.stdout.trim()) {
        hasChanges = true;
        diffSummary = diffRes.stdout.trim();
        const statRes = spawnSync("git", ["status", "--porcelain"], {
          cwd,
          encoding: "utf8",
          timeout: 3000,
        });
        changedFilesCount = (statRes.stdout || "").trim().split("\n").filter(Boolean).length;
      }
    } catch {
      diffSummary = "Not a git repository or git unavailable.";
    }

    // 4. Verify expected target files exist
    const missingExpectedFiles: string[] = [];
    if (options.expectedFiles && options.expectedFiles.length > 0) {
      for (const file of options.expectedFiles) {
        const full = path.isAbsolute(file) ? file : path.join(cwd, file);
        const exists = await fs.stat(full).then(() => true).catch(() => false);
        if (!exists) {
          missingExpectedFiles.push(file);
        }
      }

      if (missingExpectedFiles.length > 0) {
        overallSuccess = false;
        failureReasons.push(`Missing expected files: ${missingExpectedFiles.join(", ")}`);
      }
    }

    // 5. Construct Summary
    let summary: string;
    if (overallSuccess) {
      summary = `Verification PASSED. TypeScript: ${typecheckStatus}, Tests: ${testsStatus}, Modified files: ${changedFilesCount}.`;
    } else {
      summary = `Verification FAILED. Issues detected: ${failureReasons.join("; ")}.`;
    }

    return {
      overallSuccess,
      typecheck: {
        status: typecheckStatus,
        output: typecheckOutput,
      },
      tests: {
        status: testsStatus,
        output: testsOutput,
      },
      git: {
        hasChanges,
        diffSummary,
        changedFilesCount,
      },
      missingExpectedFiles,
      summary,
    };
  }
}

export const defaultVerificationEngine = new VerificationEngine();
