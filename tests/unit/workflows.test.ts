import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AutoDebugWorkflow } from "../../src/workflows/debug.js";
import { SmartPlanWorkflow } from "../../src/workflows/plan.js";
import { CodeReviewWorkflow } from "../../src/workflows/review.js";

describe("Developer Workflows", () => {
  it("executes Smart Plan in dry-run mode without writing files", async () => {
    const wf = new SmartPlanWorkflow();
    const res = await wf.run({
      prompt: "Design scalable pub-sub bus",
      dryRun: true,
    });

    expect(res.success).toBe(true);
    expect(res.workflowName).toBe("Smart Plan");
    expect(res.routing.phases.execution.model).toBeDefined();
  });

  it("writes plan file in normal execution mode", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-test-"));
    const wf = new SmartPlanWorkflow();

    const res = await wf.run({
      prompt: "Implement caching layer",
      workingDir: tmpDir,
    });

    expect(res.success).toBe(true);
    expect(res.generatedArtifacts).toBeDefined();
    expect(res.generatedArtifacts?.length).toBeGreaterThan(0);

    const planPath = res.generatedArtifacts![0]!;
    const exists = await fs.stat(planPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("executes Code Review with diff summary", async () => {
    const wf = new CodeReviewWorkflow();
    const res = await wf.run({
      prompt: "Review uncommitted changes",
    });

    expect(res.success).toBe(true);
    expect(res.summary).toContain("Code Review");
  });

  it("executes Auto Debug workflow", async () => {
    const wf = new AutoDebugWorkflow();
    const res = await wf.run({
      prompt: "TypeError: Cannot read property of undefined in auth.ts:42",
    });

    expect(res.success).toBe(true);
    expect(res.summary).toContain("Auto Debug");
  });
});
