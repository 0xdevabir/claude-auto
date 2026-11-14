import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BudgetLimitsConfig } from "../config/defaults.js";
import { ModelId } from "../registry/models.js";
import { calculateCostEstimate } from "../registry/pricing.js";

export interface TokenRecord {
  workflowId: string;
  taskId?: string | undefined;
  timestamp: string;
  modelId: ModelId;
  isEstimated: boolean; // TRUE = estimated, FALSE = measured from Claude transcript
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  routingOverheadMs: number;
}

export interface BudgetStatus {
  withinBudget: boolean;
  workflowCostUsd: number;
  maxWorkflowLimitUsd: number;
  monthlyTotalUsd: number;
  monthlyLimitUsd: number;
  warningMessage?: string | undefined;
}

export interface CostComparison {
  routedCostUsd: number;
  unroutedOpusCostUsd: number;
  dollarsSaved: number;
  percentageSaved: number;
}

export interface UsageSummaryReport {
  totalWorkflows: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCount: number;
  measuredCount: number;
  costComparison: CostComparison;
  averageRoutingOverheadMs: number;
  recommendations: string[];
}

export class CostTracker {
  private statsFile: string;

  constructor(customPath?: string) {
    const base = process.env.CLAUDE_AUTO_DIR ?? path.join(os.homedir(), ".claude-auto");
    this.statsFile = customPath ?? path.join(base, "usage-stats.json");
  }

  async recordUsage(record: Omit<TokenRecord, "timestamp" | "costUsd">): Promise<TokenRecord> {
    const costRes = calculateCostEstimate(record.modelId, {
      estimatedInputTokens: record.inputTokens,
      estimatedOutputTokens: record.outputTokens,
      estimatedCacheReadTokens: record.cacheReadTokens,
    });

    const fullRecord: TokenRecord = {
      ...record,
      timestamp: new Date().toISOString(),
      costUsd: costRes.totalCostUsd,
    };

    const records = await this.readRecords();
    records.push(fullRecord);
    await this.writeRecords(records);

    return fullRecord;
  }

  async checkBudget(
    estimatedWorkflowCostUsd: number,
    limits?: BudgetLimitsConfig | undefined,
  ): Promise<BudgetStatus> {
    const defaultLimits: BudgetLimitsConfig = {
      maxCostPerWorkflowUsd: 2.00,
      monthlyLimitUsd: 50.00,
      warnThresholdPercent: 80,
    };
    const activeLimits = limits ?? defaultLimits;

    const records = await this.readRecords();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const monthlyTotal = records
      .filter((r) => r.timestamp.startsWith(currentMonthPrefix))
      .reduce((sum, r) => sum + r.costUsd, 0);

    const projectedMonthly = monthlyTotal + estimatedWorkflowCostUsd;
    let withinBudget = true;
    let warningMessage: string | undefined;

    if (estimatedWorkflowCostUsd > activeLimits.maxCostPerWorkflowUsd) {
      withinBudget = false;
      warningMessage = `Workflow estimated cost ($${estimatedWorkflowCostUsd.toFixed(3)}) exceeds max per-workflow budget ($${activeLimits.maxCostPerWorkflowUsd.toFixed(2)}).`;
    } else if (projectedMonthly > activeLimits.monthlyLimitUsd) {
      withinBudget = false;
      warningMessage = `Projected monthly spend ($${projectedMonthly.toFixed(2)}) exceeds monthly limit ($${activeLimits.monthlyLimitUsd.toFixed(2)}).`;
    } else if (
      projectedMonthly >=
      (activeLimits.monthlyLimitUsd * activeLimits.warnThresholdPercent) / 100
    ) {
      warningMessage = `Notice: Spend has reached ${Math.round((projectedMonthly / activeLimits.monthlyLimitUsd) * 100)}% of monthly budget ($${activeLimits.monthlyLimitUsd.toFixed(2)}).`;
    }

    return {
      withinBudget,
      workflowCostUsd: estimatedWorkflowCostUsd,
      maxWorkflowLimitUsd: activeLimits.maxCostPerWorkflowUsd,
      monthlyTotalUsd: Number(monthlyTotal.toFixed(4)),
      monthlyLimitUsd: activeLimits.monthlyLimitUsd,
      warningMessage,
    };
  }

  async getUsageSummary(): Promise<UsageSummaryReport> {
    const records = await this.readRecords();

    let totalCost = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let estimatedCount = 0;
    let measuredCount = 0;
    let totalOverheadMs = 0;

    for (const r of records) {
      totalCost += r.costUsd;
      totalInput += r.inputTokens;
      totalOutput += r.outputTokens;
      totalOverheadMs += r.routingOverheadMs;
      if (r.isEstimated) estimatedCount++;
      else measuredCount++;
    }

    // Calculate baseline cost if everything were executed on unrouted flagship Opus
    const unroutedOpusEstimate = calculateCostEstimate("opus", {
      estimatedInputTokens: totalInput,
      estimatedOutputTokens: totalOutput,
    });

    const unroutedOpusCost = unroutedOpusEstimate.totalCostUsd;
    const dollarsSaved = Math.max(0, Number((unroutedOpusCost - totalCost).toFixed(4)));
    const percentageSaved = unroutedOpusCost > 0
      ? Math.round((dollarsSaved / unroutedOpusCost) * 100)
      : 0;

    const recommendations: string[] = [];
    if (percentageSaved > 40) {
      recommendations.push(
        `Your model routing has saved $${dollarsSaved.toFixed(2)} (${percentageSaved}%) compared to unrouted flagship Opus execution.`,
      );
    }
    if (totalCost > 20) {
      recommendations.push(
        "Consider switching to 'economy' profile for test generation and documentation to further reduce token spend.",
      );
    } else {
      recommendations.push("Token efficiency is optimal for current workflow distribution.");
    }

    return {
      totalWorkflows: records.length,
      totalCostUsd: Number(totalCost.toFixed(4)),
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      estimatedCount,
      measuredCount,
      costComparison: {
        routedCostUsd: Number(totalCost.toFixed(4)),
        unroutedOpusCostUsd: Number(unroutedOpusCost.toFixed(4)),
        dollarsSaved,
        percentageSaved,
      },
      averageRoutingOverheadMs: records.length > 0 ? Math.round(totalOverheadMs / records.length) : 0,
      recommendations,
    };
  }

  private async readRecords(): Promise<TokenRecord[]> {
    try {
      const raw = await fs.readFile(this.statsFile, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as TokenRecord[];
    } catch {
      // file doesn't exist yet
    }
    return [];
  }

  private async writeRecords(records: TokenRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.statsFile), { recursive: true });
    await fs.writeFile(this.statsFile, JSON.stringify(records, null, 2), "utf8");
  }
}

export const defaultCostTracker = new CostTracker();
