import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CostTracker } from "../../src/cost/tracker.js";

describe("Cost Engine & Token Tracker", () => {
  it("records usage distinguishing estimated from measured records", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-cost-"));
    const tracker = new CostTracker(path.join(tmpDir, "stats.json"));

    await tracker.recordUsage({
      workflowId: "wf-1",
      modelId: "haiku",
      isEstimated: true,
      inputTokens: 5000,
      outputTokens: 1000,
      cacheReadTokens: 0,
      routingOverheadMs: 15,
    });

    await tracker.recordUsage({
      workflowId: "wf-2",
      modelId: "sonnet",
      isEstimated: false,
      inputTokens: 15000,
      outputTokens: 3000,
      cacheReadTokens: 500,
      routingOverheadMs: 12,
    });

    const summary = await tracker.getUsageSummary();

    expect(summary.totalWorkflows).toBe(2);
    expect(summary.estimatedCount).toBe(1);
    expect(summary.measuredCount).toBe(1);
    expect(summary.totalInputTokens).toBe(20000);
    expect(summary.totalOutputTokens).toBe(4000);
    expect(summary.costComparison.dollarsSaved).toBeGreaterThan(0);
    expect(summary.costComparison.percentageSaved).toBeGreaterThan(30);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("triggers budget warnings when approaching limits", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-budget-"));
    const tracker = new CostTracker(path.join(tmpDir, "stats.json"));

    const status1 = await tracker.checkBudget(0.50, {
      maxCostPerWorkflowUsd: 1.00,
      monthlyLimitUsd: 10.00,
      warnThresholdPercent: 80,
    });

    expect(status1.withinBudget).toBe(true);
    expect(status1.warningMessage).toBeUndefined();

    const statusOverLimit = await tracker.checkBudget(1.50, {
      maxCostPerWorkflowUsd: 1.00,
      monthlyLimitUsd: 10.00,
      warnThresholdPercent: 80,
    });

    expect(statusOverLimit.withinBudget).toBe(false);
    expect(statusOverLimit.warningMessage).toContain("exceeds max per-workflow budget");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
