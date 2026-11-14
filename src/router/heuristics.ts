import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TaskCategory, TaskComplexity } from "./types.js";

export interface HeuristicAnalysisInput {
  prompt?: string | undefined;
  targetPaths?: string[] | undefined;
  workingDir?: string | undefined;
}

export interface HeuristicAnalysisResult {
  category: TaskCategory;
  complexity: TaskComplexity;
  complexityScore: number;
  confidence: number;
  fileCount: number;
  totalLines: number;
  gitDiffLines: number;
  detectedKeywords: string[];
}

const CATEGORY_KEYWORDS: Record<TaskCategory, RegExp[]> = {
  documentation: [/\b(doc|docs|jsdoc|typedoc|readme|comment|document)\b/i],
  test_generation: [/\b(test|tests|spec|unit\s*test|integration\s*test|vitest|jest)\b/i],
  explanation: [/\b(explain|walkthrough|how\s+does|overview|understand|describe)\b/i],
  refactoring: [/\b(refactor|clean\s*up|extract|modularize|reorganize|rename)\b/i],
  debugging: [/\b(debug|fix|bug|issue|error|stack\s*trace|crash|failing)\b/i],
  planning: [/\b(plan|architecture|roadmap|design|rfc|spec)\b/i],
  architecture: [/\b(architecture|system\s*design|scaffold|microservice)\b/i],
  review: [/\b(review|audit|lint|security\s*check|pr\s*review|diff\s*check)\b/i],
  security_audit: [/\b(cve|vulnerability|exploit|penetration|xss|csrf|sanitize|secret\s*leak)\b/i],
  execution: [/\b(build|create|implement|add|generate|scaffold)\b/i],
};

const HIGH_COMPLEXITY_KEYWORDS = [
  /\b(concurrency|deadlock|race\s*condition|memory\s*leak|security|cryptography|ast|parser|compiler|migration)\b/i,
  /\b(distributed|consensus|protocol|websocket|database\s*engine)\b/i,
];

export async function analyzeHeuristics(
  input: HeuristicAnalysisInput,
): Promise<HeuristicAnalysisResult> {
  const cwd = input.workingDir ?? process.cwd();
  const prompt = input.prompt ?? "";
  const targetPaths = input.targetPaths ?? [];

  let fileCount = targetPaths.length;
  let totalLines = 0;

  for (const p of targetPaths) {
    const full = path.isAbsolute(p) ? p : path.join(cwd, p);
    try {
      const stat = await fs.stat(full);
      if (stat.isFile()) {
        const content = await fs.readFile(full, "utf8");
        totalLines += content.split("\n").length;
      }
    } catch {
      // Ignore missing or inaccessible paths in heuristic estimation
    }
  }

  let gitDiffLines = 0;
  try {
    const res = spawnSync("git", ["diff", "--numstat"], {
      cwd,
      encoding: "utf8",
      timeout: 2000,
    });
    if (res.status === 0 && res.stdout) {
      const lines = res.stdout.trim().split("\n");
      for (const line of lines) {
        const parts = line.split("\t");
        const added = parseInt(parts[0] ?? "0", 10) || 0;
        const deleted = parseInt(parts[1] ?? "0", 10) || 0;
        gitDiffLines += added + deleted;
      }
    }
  } catch {
    // Non-git directories are gracefully tolerated
  }

  const detectedKeywords: string[] = [];
  let detectedCategory: TaskCategory = "execution";
  let highestCategoryMatches = 0;

  for (const [cat, regexes] of Object.entries(CATEGORY_KEYWORDS) as [TaskCategory, RegExp[]][]) {
    let matches = 0;
    for (const rx of regexes) {
      if (rx.test(prompt)) {
        matches++;
        detectedKeywords.push(cat);
      }
    }
    if (matches > highestCategoryMatches) {
      highestCategoryMatches = matches;
      detectedCategory = cat;
    }
  }

  let hasHighComplexityKeyword = false;
  for (const rx of HIGH_COMPLEXITY_KEYWORDS) {
    if (rx.test(prompt)) {
      hasHighComplexityKeyword = true;
      detectedKeywords.push("high-complexity-domain");
      break;
    }
  }

  const locFactor = fileCount > 0 ? Math.min(1.0, (totalLines + gitDiffLines) / 500) : 0.5;
  const fileFactor = fileCount > 0 ? Math.min(1.0, fileCount / 10) : 0.5;
  const keywordWeight = hasHighComplexityKeyword ? 1.0 : 0.2;

  const complexityScore = Number(
    (0.35 * locFactor + 0.25 * fileFactor + 0.4 * keywordWeight).toFixed(3),
  );

  let complexity: TaskComplexity = "medium";
  if (hasHighComplexityKeyword || complexityScore >= 0.65) {
    complexity = "high";
  } else if (complexityScore <= 0.32) {
    complexity = "low";
  }

  const confidence = highestCategoryMatches > 0 ? 0.9 : 0.72;

  return {
    category: detectedCategory,
    complexity,
    complexityScore,
    confidence,
    fileCount,
    totalLines,
    gitDiffLines,
    detectedKeywords,
  };
}
