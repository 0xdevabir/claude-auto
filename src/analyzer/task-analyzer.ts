import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TaskCategory, TaskComplexity } from "../router/types.js";

export type { TaskCategory, TaskComplexity };

export interface SecurityInspectionResult {
  isSecuritySensitive: boolean;
  flags: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface ArchitecturalInspectionResult {
  isArchitecturalChange: boolean;
  triggers: string[];
  affectedSubsystems: string[];
}

export interface RepositoryMetadata {
  isGitRepo: boolean;
  currentBranch?: string | undefined;
  isDirty: boolean;
  uncommittedFilesCount: number;
  insertions: number;
  deletions: number;
  headCommitHash?: string | undefined;
}

export interface ProjectTechnologyDetection {
  primaryLanguage: string;
  frameworks: string[];
  testRunners: string[];
  databasesOrOrMs: string[];
  tools: string[];
}

export interface TaskDecompositionRecommendation {
  shouldDecompose: boolean;
  rationale: string;
  recommendedSubtasks: Array<{
    name: string;
    category: TaskCategory;
    description: string;
  }>;
}

export interface ComprehensiveTaskAnalysis {
  prompt: string;
  category: TaskCategory;
  complexity: TaskComplexity;
  complexityScore: number;
  confidence: number;
  security: SecurityInspectionResult;
  architecture: ArchitecturalInspectionResult;
  repo: RepositoryMetadata;
  techStack: ProjectTechnologyDetection;
  decomposition: TaskDecompositionRecommendation;
  targetFiles: string[];
  totalLinesInspected: number;
}

const CATEGORY_MATCHERS: Record<TaskCategory, RegExp[]> = {
  architecture: [/\b(architecture|rfc|system\s*design|blueprint|scaffold|microservice)\b/i],
  refactoring: [/\b(refactor|extract|modularize|clean\s*up|decouple|reorganize)\b/i],
  debugging: [/\b(fix|bug|debug|error|exception|crash|stack\s*trace|failing|resolve\s*issue)\b/i],
  test_generation: [/\b(test|tests|spec|unit\s*test|integration\s*test|e2e|coverage)\b/i],
  documentation: [/\b(doc|docs|jsdoc|readme|typedoc|comment|api\s*spec)\b/i],
  review: [/\b(review|audit|lint|code\s*review|pr\s*check|diff\s*inspection)\b/i],
  security_audit: [/\b(cve|vulnerability|exploit|penetration|xss|csrf|sanitize|secret\s*leak)\b/i],
  explanation: [/\b(explain|walkthrough|how\s+does|overview|understand|describe)\b/i],
  planning: [/\b(plan|planning|roadmap|milestone)\b/i],
  execution: [/\b(build|create|implement|add|code|generate)\b/i],
};

const SECURITY_PATTERNS = [
  { flag: "auth_credentials", regex: /\b(password|jwt|token|secret|credential|oauth|session|api[_-]?key)\b/i, risk: "high" as const },
  { flag: "destructive_commands", regex: /\b(rm\s+-rf|chmod|eval\(|exec\(|spawn\(|drop\s+table|deleteMany)\b/i, risk: "high" as const },
  { flag: "cryptography", regex: /\b(crypto|cipher|aes|rsa|hash(?:ing)?|salt|sha256|ssl|tls)\b/i, risk: "medium" as const },
  { flag: "network_boundary", regex: /\b(fetch\(|axios|http|websocket|curl|proxy|firewall)\b/i, risk: "low" as const },
];

const ARCHITECTURE_PATTERNS = [
  { trigger: "dependency_manifest", regex: /\b(package\.json|cargo\.toml|go\.mod|requirements\.txt)\b/i },
  { trigger: "database_schema", regex: /\b(schema\.prisma|migrations?|models?|entity|entities)\b/i },
  { trigger: "system_config", regex: /\b(docker|docker-compose|k8s|kubernetes|tsconfig|\.env)\b/i },
  { trigger: "api_contracts", regex: /\b(openapi|graphql|proto|routes?|controller)\b/i },
];

export class DeterministicTaskAnalyzer {
  async analyze(input: {
    prompt?: string | undefined;
    targetPaths?: string[] | undefined;
    workingDir?: string | undefined;
  }): Promise<ComprehensiveTaskAnalysis> {
    const cwd = input.workingDir ?? process.cwd();
    const prompt = input.prompt ?? "";
    const targetPaths = input.targetPaths ?? [];

    // 1. Repo metadata inspection
    const repo = this.inspectRepository(cwd);

    // 2. Tech stack identification
    const techStack = await this.identifyTechnologies(cwd);

    // 3. File size & LOC inspection
    let totalLines = 0;
    const existingFiles: string[] = [];
    for (const p of targetPaths) {
      const full = path.isAbsolute(p) ? p : path.join(cwd, p);
      try {
        const stat = await fs.stat(full);
        if (stat.isFile()) {
          const content = await fs.readFile(full, "utf8");
          totalLines += content.split("\n").length;
          existingFiles.push(p);
        }
      } catch {
        // tolerate planned / not-yet-created paths
      }
    }

    // 4. Category Identification
    const category = this.identifyCategory(prompt, targetPaths);

    // 5. Security Inspection
    const security = this.inspectSecurity(prompt, targetPaths);

    // 6. Architectural Inspection
    const architecture = this.inspectArchitecture(prompt, targetPaths);

    // 7. Complexity Estimation
    const fileCount = Math.max(targetPaths.length, existingFiles.length);
    const { complexity, complexityScore } = this.estimateComplexity({
      prompt,
      fileCount,
      totalLines,
      gitDiffLines: repo.insertions + repo.deletions,
      isSecuritySensitive: security.isSecuritySensitive,
      isArchitectural: architecture.isArchitecturalChange,
    });

    // 8. Task Decomposition Estimation
    const decomposition = this.evaluateDecomposition({
      category,
      complexityScore,
      fileCount,
      prompt,
      architecture,
    });

    return {
      prompt,
      category,
      complexity,
      complexityScore,
      confidence: 0.91,
      security,
      architecture,
      repo,
      techStack,
      decomposition,
      targetFiles: targetPaths,
      totalLinesInspected: totalLines,
    };
  }

  private inspectRepository(cwd: string): RepositoryMetadata {
    try {
      const branchRes = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd,
        encoding: "utf8",
        timeout: 1500,
      });
      if (branchRes.status !== 0) {
        return { isGitRepo: false, isDirty: false, uncommittedFilesCount: 0, insertions: 0, deletions: 0 };
      }
      const branch = branchRes.stdout?.trim();

      const statusRes = spawnSync("git", ["status", "--porcelain"], {
        cwd,
        encoding: "utf8",
        timeout: 1500,
      });
      const statusLines = (statusRes.stdout || "").trim().split("\n").filter(Boolean);

      const diffRes = spawnSync("git", ["diff", "--numstat"], {
        cwd,
        encoding: "utf8",
        timeout: 1500,
      });
      let insertions = 0;
      let deletions = 0;
      if (diffRes.status === 0 && diffRes.stdout) {
        for (const line of diffRes.stdout.trim().split("\n")) {
          const parts = line.split("\t");
          insertions += parseInt(parts[0] ?? "0", 10) || 0;
          deletions += parseInt(parts[1] ?? "0", 10) || 0;
        }
      }

      const hashRes = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
        cwd,
        encoding: "utf8",
        timeout: 1500,
      });
      const headCommitHash = hashRes.status === 0 ? hashRes.stdout?.trim() : undefined;

      return {
        isGitRepo: true,
        currentBranch: branch,
        isDirty: statusLines.length > 0,
        uncommittedFilesCount: statusLines.length,
        insertions,
        deletions,
        headCommitHash,
      };
    } catch {
      return { isGitRepo: false, isDirty: false, uncommittedFilesCount: 0, insertions: 0, deletions: 0 };
    }
  }

  private async identifyTechnologies(cwd: string): Promise<ProjectTechnologyDetection> {
    const pkgPath = path.join(cwd, "package.json");
    const tech: ProjectTechnologyDetection = {
      primaryLanguage: "TypeScript",
      frameworks: [],
      testRunners: [],
      databasesOrOrMs: [],
      tools: [],
    };

    try {
      const raw = await fs.readFile(pkgPath, "utf8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      const allDeps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      };

      const depNames = Object.keys(allDeps);

      // Frameworks
      if (depNames.includes("next")) tech.frameworks.push("Next.js");
      if (depNames.includes("react")) tech.frameworks.push("React");
      if (depNames.includes("vue")) tech.frameworks.push("Vue");
      if (depNames.includes("express")) tech.frameworks.push("Express");
      if (depNames.includes("fastify")) tech.frameworks.push("Fastify");
      if (depNames.includes("@nestjs/core")) tech.frameworks.push("NestJS");

      // Test runners
      if (depNames.includes("vitest")) tech.testRunners.push("Vitest");
      if (depNames.includes("jest")) tech.testRunners.push("Jest");
      if (depNames.includes("mocha")) tech.testRunners.push("Mocha");
      if (depNames.includes("playwright")) tech.testRunners.push("Playwright");

      // DB / ORMs
      if (depNames.includes("@prisma/client") || depNames.includes("prisma")) tech.databasesOrOrMs.push("Prisma");
      if (depNames.includes("drizzle-orm")) tech.databasesOrOrMs.push("Drizzle");
      if (depNames.includes("typeorm")) tech.databasesOrOrMs.push("TypeORM");
      if (depNames.includes("pg")) tech.databasesOrOrMs.push("PostgreSQL");
      if (depNames.includes("better-sqlite3")) tech.databasesOrOrMs.push("SQLite");

      // Tools
      if (depNames.includes("typescript")) tech.tools.push("TypeScript");
      if (depNames.includes("eslint")) tech.tools.push("ESLint");
      if (depNames.includes("prettier")) tech.tools.push("Prettier");
      if (depNames.includes("tailwindcss")) tech.tools.push("TailwindCSS");
    } catch {
      // package.json not found or not json
    }

    return tech;
  }

  private identifyCategory(prompt: string, paths: string[]): TaskCategory {
    const combined = `${prompt} ${paths.join(" ")}`;
    let bestCat: TaskCategory = "execution";
    let highestCount = 0;

    for (const [cat, regexes] of Object.entries(CATEGORY_MATCHERS) as [TaskCategory, RegExp[]][]) {
      let matches = 0;
      for (const rx of regexes) {
        if (rx.test(combined)) matches++;
      }
      if (matches > highestCount) {
        highestCount = matches;
        bestCat = cat;
      }
    }

    return bestCat;
  }

  private inspectSecurity(prompt: string, files: string[]): SecurityInspectionResult {
    const combined = `${prompt} ${files.join(" ")}`;
    const flags: string[] = [];
    let highestRisk: "low" | "medium" | "high" = "low";

    for (const item of SECURITY_PATTERNS) {
      if (item.regex.test(combined)) {
        flags.push(item.flag);
        if (item.risk === "high") highestRisk = "high";
        else if (item.risk === "medium" && highestRisk !== "high") highestRisk = "medium";
      }
    }

    return {
      isSecuritySensitive: flags.length > 0,
      flags,
      riskLevel: flags.length > 0 ? highestRisk : "low",
    };
  }

  private inspectArchitecture(prompt: string, files: string[]): ArchitecturalInspectionResult {
    const combined = `${prompt} ${files.join(" ")}`;
    const triggers: string[] = [];
    const affectedSubsystems: string[] = [];

    for (const item of ARCHITECTURE_PATTERNS) {
      if (item.regex.test(combined)) {
        triggers.push(item.trigger);
      }
    }

    // Inspect if files cross multiple subdirectories
    const dirs = new Set<string>();
    for (const f of files) {
      const topDir = f.split(path.sep)[0];
      if (topDir && topDir !== ".") dirs.add(topDir);
    }

    if (dirs.size >= 2) {
      triggers.push(`cross_subsystem_boundaries (${Array.from(dirs).join(", ")})`);
      affectedSubsystems.push(...dirs);
    }

    return {
      isArchitecturalChange: triggers.length > 0,
      triggers,
      affectedSubsystems,
    };
  }

  private estimateComplexity(params: {
    prompt: string;
    fileCount: number;
    totalLines: number;
    gitDiffLines: number;
    isSecuritySensitive: boolean;
    isArchitectural: boolean;
  }): { complexity: TaskComplexity; complexityScore: number } {
    const locScore = Math.min(1.0, (params.totalLines + params.gitDiffLines) / 600);
    const fileScore = Math.min(1.0, params.fileCount / 8);
    const secWeight = params.isSecuritySensitive ? 0.35 : 0.0;
    const archWeight = params.isArchitectural ? 0.70 : 0.0;

    let score = Number(
      (0.3 * locScore + 0.25 * fileScore + 0.35 * archWeight + 0.1 * secWeight).toFixed(3),
    );

    // If architectural change involves multiple files, floor at high complexity
    if (params.isArchitectural && params.fileCount >= 2) {
      score = Math.max(score, 0.68);
    }

    // If keywords indicate intense concurrency/cryptography, boost floor
    if (/\b(concurrency|race\s*condition|deadlock|consensus|raft|paxos|compiler|ast|vm)\b/i.test(params.prompt)) {
      score = Math.max(score, 0.72);
    }

    let complexity: TaskComplexity = "medium";
    if (score >= 0.60) {
      complexity = "high";
    } else if (score <= 0.28) {
      complexity = "low";
    }

    return { complexity, complexityScore: score };
  }

  private evaluateDecomposition(params: {
    category: TaskCategory;
    complexityScore: number;
    fileCount: number;
    prompt: string;
    architecture: ArchitecturalInspectionResult;
  }): TaskDecompositionRecommendation {
    // Decomposition is worthwhile when complexity is medium-high or task spans multiple disciplines
    const shouldDecompose =
      params.complexityScore >= 0.45 ||
      params.fileCount >= 3 ||
      params.architecture.isArchitecturalChange;

    if (!shouldDecompose) {
      return {
        shouldDecompose: false,
        rationale: "Task has localized scope and low complexity. Monolithic execution is more token-efficient.",
        recommendedSubtasks: [],
      };
    }

    const subtasks = [
      {
        name: "architecture_and_types",
        category: "architecture" as TaskCategory,
        description: "Scaffold interfaces, types and dependency contracts.",
      },
      {
        name: "core_implementation",
        category: "execution" as TaskCategory,
        description: "Implement primary business logic and domain functions.",
      },
      {
        name: "unit_and_integration_tests",
        category: "test_generation" as TaskCategory,
        description: "Develop test suite verifying core contracts and edge cases.",
      },
    ];

    if (params.architecture.isArchitecturalChange) {
      subtasks.push({
        name: "documentation_and_migration",
        category: "documentation" as TaskCategory,
        description: "Document architecture changes and update guides.",
      });
    }

    return {
      shouldDecompose: true,
      rationale: `Task exhibits complexity score ${params.complexityScore} with architectural/multi-file impact. Decomposing into ${subtasks.length} subtasks isolates context and enables parallel verification.`,
      recommendedSubtasks: subtasks,
    };
  }
}

export const defaultTaskAnalyzer = new DeterministicTaskAnalyzer();
