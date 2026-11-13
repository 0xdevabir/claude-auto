import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CORE_SUBAGENT_TEMPLATES,
  installClaudeAutoIntegration,
  renderSubagentMarkdown,
  renderUserSlashCommandMarkdown,
} from "../../src/adapters/subagent.js";

describe("Subagents & Slash Command Adapter", () => {
  it("renders valid subagent markdown with YAML frontmatter", () => {
    const tpl = CORE_SUBAGENT_TEMPLATES[0]!;
    const md = renderSubagentMarkdown(tpl);

    expect(md).toContain(`name: ${tpl.name}`);
    expect(md).toContain(`model: ${tpl.model}`);
    expect(md).toContain(`effort: ${tpl.effort}`);
    expect(md).toContain(`tools: ["Read","Grep","Glob"]`);
  });

  it("renders un-namespaced /claude-auto command markdown", () => {
    const md = renderUserSlashCommandMarkdown();
    expect(md).toContain("# /claude-auto");
    expect(md).toContain("claude-auto");
  });

  it("installs project-scoped integration with subagents and slash command", async () => {
    const tmpProj = await fs.mkdtemp(path.join(os.tmpdir(), "claude-auto-proj-"));

    const result = await installClaudeAutoIntegration({
      scope: "project",
      projectRoot: tmpProj,
    });

    expect(result.slashCommandPath).toContain(path.join(".claude", "commands", "claude-auto.md"));
    expect(result.agentPaths.length).toBe(CORE_SUBAGENT_TEMPLATES.length);

    const cmdExists = await fs.stat(result.slashCommandPath).then(() => true).catch(() => false);
    expect(cmdExists).toBe(true);

    await fs.rm(tmpProj, { recursive: true, force: true });
  });
});
