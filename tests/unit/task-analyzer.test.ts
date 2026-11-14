import { describe, expect, it } from "vitest";
import { defaultTaskAnalyzer, DeterministicTaskAnalyzer } from "../../src/analyzer/task-analyzer.js";

describe("Deterministic Task Analyzer", () => {
  const analyzer = new DeterministicTaskAnalyzer();

  it("identifies security-sensitive tasks with high risk flags", async () => {
    const res = await analyzer.analyze({
      prompt: "Refactor user authentication service, rotate JWT secrets and update password hashing",
    });

    expect(res.security.isSecuritySensitive).toBe(true);
    expect(res.security.flags).toContain("auth_credentials");
    expect(res.security.flags).toContain("cryptography");
    expect(res.security.riskLevel).toBe("high");
  });

  it("detects destructive command risks", async () => {
    const res = await analyzer.analyze({
      prompt: "Clean up cache directory using rm -rf and drop table in database",
    });

    expect(res.security.isSecuritySensitive).toBe(true);
    expect(res.security.flags).toContain("destructive_commands");
  });

  it("identifies architectural changes when touching dependencies and cross-module boundaries", async () => {
    const res = await analyzer.analyze({
      prompt: "Update package.json and redesign schema.prisma migrations across modules",
      targetPaths: ["src/auth/service.ts", "src/db/repo.ts", "package.json"],
    });

    expect(res.architecture.isArchitecturalChange).toBe(true);
    expect(res.architecture.triggers.length).toBeGreaterThan(0);
    expect(res.complexity).toBe("high");
  });

  it("detects project tech stack from package.json", async () => {
    const res = await analyzer.analyze({
      prompt: "Write unit tests",
    });

    expect(res.techStack.primaryLanguage).toBe("TypeScript");
    expect(res.techStack.testRunners).toContain("Vitest");
  });

  it("estimates decomposition is worthwhile for complex multi-file tasks", async () => {
    const res = await analyzer.analyze({
      prompt: "Architect distributed consensus mechanism and rewrite database engine",
      targetPaths: ["src/raft.ts", "src/storage.ts", "src/network.ts"],
    });

    expect(res.decomposition.shouldDecompose).toBe(true);
    expect(res.decomposition.recommendedSubtasks.length).toBeGreaterThanOrEqual(3);
  });

  it("prefers monolithic execution for simple, localized tasks", async () => {
    const res = await analyzer.analyze({
      prompt: "Fix typo in comment",
      targetPaths: ["README.md"],
    });

    expect(res.decomposition.shouldDecompose).toBe(false);
  });
});
