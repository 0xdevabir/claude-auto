import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { EffortLevel, ModelId } from "../registry/models.js";

export interface SubagentDefinition {
  name: string;
  description: string;
  model: ModelId;
  effort: EffortLevel;
  tools: string[];
  systemPrompt: string;
}

export function getClaudeUserConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
}

export function getUserCommandsDir(): string {
  return path.join(getClaudeUserConfigDir(), "commands");
}

export function getUserAgentsDir(): string {
  return path.join(getClaudeUserConfigDir(), "agents");
}

export function getProjectAgentsDir(projectRoot = process.cwd()): string {
  return path.join(projectRoot, ".claude", "agents");
}

export function getProjectCommandsDir(projectRoot = process.cwd()): string {
  return path.join(projectRoot, ".claude", "commands");
}

export const CORE_SUBAGENT_TEMPLATES: SubagentDefinition[] = [
  {
    name: "claude-auto-planner",
    description: "Claude Auto architectural planner for complex task breakdowns.",
    model: "opus",
    effort: "high",
    tools: ["Read", "Grep", "Glob"],
    systemPrompt: `You are Claude Auto's architectural planning agent.
Your mission is to produce rigorous, modular execution roadmaps.
Inspect the workspace using Read/Grep/Glob. Never write or modify files directly.
Output markdown task specifications with strict dependency ordering.`,
  },
  {
    name: "claude-auto-executor",
    description: "Claude Auto core code implementation and execution agent.",
    model: "sonnet",
    effort: "medium",
    tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
    systemPrompt: `You are Claude Auto's implementation agent.
Write clean, robust, type-safe code adhering strictly to the repository's conventions.
Always run local tests to verify your changes before completing turns.`,
  },
  {
    name: "claude-auto-reviewer",
    description: "Claude Auto static code review and security inspection agent.",
    model: "sonnet",
    effort: "high",
    tools: ["Read", "Grep", "Glob"],
    systemPrompt: `You are Claude Auto's read-only code review agent.
Analyze the target code diff for bugs, regressions, security flaws, and performance anti-patterns.
You are strictly read-only. Never attempt to edit or write files.`,
  },
  {
    name: "claude-auto-debugger",
    description: "Claude Auto root-cause diagnostic and error resolution agent.",
    model: "sonnet",
    effort: "high",
    tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
    systemPrompt: `You are Claude Auto's debugging agent.
Reproduce the issue, isolate the failure mechanism, and apply minimal verified patches.`,
  },
  {
    name: "claude-auto-tester",
    description: "Claude Auto unit and integration test generation agent.",
    model: "haiku",
    effort: "low",
    tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
    systemPrompt: `You are Claude Auto's test engineering agent.
Generate clean, thorough, edge-case resilient unit tests mirroring existing repository patterns.
Run the test runner to ensure every newly authored test passes.`,
  },
  {
    name: "claude-auto-doc",
    description: "Claude Auto documentation and API specification generator.",
    model: "haiku",
    effort: "low",
    tools: ["Read", "Write", "Edit", "Grep", "Glob"],
    systemPrompt: `You are Claude Auto's documentation specialist.
Generate clear, accurate JSDoc/TSDoc comments, README sections, and markdown references.`,
  },
];

export function renderSubagentMarkdown(def: SubagentDefinition): string {
  const toolsFormatted = JSON.stringify(def.tools);
  return `---
name: ${def.name}
description: ${def.description}
model: ${def.model}
effort: ${def.effort}
tools: ${toolsFormatted}
---

${def.systemPrompt.trim()}
`;
}

export function renderUserSlashCommandMarkdown(): string {
  return `---
description: Launch Claude Auto interactive dashboard or trigger intelligent model orchestration
allowed-tools: Bash, Read
---

# /claude-auto

Launch the Claude Auto interactive terminal dashboard and intelligent model router.

## Run now:

\`\`\`bash
claude-auto
\`\`\`

If \`claude-auto\` is not installed globally:

\`\`\`bash
npx claude-auto
\`\`\`

Or run a targeted workflow:

\`\`\`bash
claude-auto plan "$ARGUMENTS"
claude-auto review
claude-auto debug "$ARGUMENTS"
\`\`\`
`;
}

export async function installClaudeAutoIntegration(options: {
  scope: "global" | "project";
  projectRoot?: string;
}): Promise<{
  slashCommandPath: string;
  agentPaths: string[];
}> {
  const isGlobal = options.scope === "global";
  const cmdDir = isGlobal ? getUserCommandsDir() : getProjectCommandsDir(options.projectRoot);
  const agentDir = isGlobal ? getUserAgentsDir() : getProjectAgentsDir(options.projectRoot);

  await fs.mkdir(cmdDir, { recursive: true });
  await fs.mkdir(agentDir, { recursive: true });

  // 1. Install un-namespaced /claude-auto command
  const slashCommandPath = path.join(cmdDir, "claude-auto.md");
  await fs.writeFile(slashCommandPath, renderUserSlashCommandMarkdown(), "utf8");

  // 2. Install all core subagents
  const agentPaths: string[] = [];
  for (const tpl of CORE_SUBAGENT_TEMPLATES) {
    const dest = path.join(agentDir, `${tpl.name}.md`);
    await fs.writeFile(dest, renderSubagentMarkdown(tpl), "utf8");
    agentPaths.push(dest);
  }

  return { slashCommandPath, agentPaths };
}
