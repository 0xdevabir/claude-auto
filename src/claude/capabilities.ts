export interface ClaudeCapabilities {
  version: string;
  supportsInteractive: boolean;
  supportsSessionResume: boolean;
  supportsSessionId: boolean;
  supportsPromptMode: boolean;
  supportsContinue: boolean;
  supportsStructuredOutput: boolean;
  helpText: string;
  verified: boolean;
}

export function parseClaudeVersion(raw: string): string {
  const match = /(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.]+)?)/.exec(raw);
  return match?.[1] ?? raw.trim();
}

export function parseCapabilitiesFromHelp(
  versionRaw: string,
  helpText: string,
): ClaudeCapabilities {
  const version = parseClaudeVersion(versionRaw);
  const help = helpText;

  const supportsSessionResume = /--resume\b/.test(help);
  const supportsSessionId = /--session-id\b/.test(help);
  const supportsPromptMode = /--print\b|-p,/.test(help) || /\b-p\b/.test(help);
  const supportsContinue = /--continue\b/.test(help);
  const supportsStructuredOutput = /stream-json|output-format/.test(help);
  const supportsInteractive = true;

  const verified = supportsSessionResume && supportsSessionId && supportsPromptMode;

  return {
    version,
    supportsInteractive,
    supportsSessionResume,
    supportsSessionId,
    supportsPromptMode,
    supportsContinue,
    supportsStructuredOutput,
    helpText: help,
    verified,
  };
}
