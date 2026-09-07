import { promises as fs } from "node:fs";
import path from "node:path";
import { ConfigurationError } from "../errors/errors.js";
import { getConfigDir } from "../platform/paths.js";
import { DEFAULT_CONFIG, type ClaudeAutoConfig } from "./defaults.js";
import { parseConfigFile, validateConfig } from "./schema.js";

export interface CliConfigOverrides {
  fallbackResetSeconds?: number;
  resetBufferSeconds?: number;
  maxAutoResumes?: number;
  continuationPrompt?: string;
  countdown?: boolean;
  verbose?: boolean;
  configPath?: string;
}

export async function loadConfig(
  overrides: CliConfigOverrides = {},
): Promise<{ config: ClaudeAutoConfig; configPath: string | null }> {
  const configPath = overrides.configPath ?? path.join(getConfigDir(), "config.json");

  let filePartial: Partial<ClaudeAutoConfig> = {};
  let usedPath: string | null = null;

  try {
    const raw = await fs.readFile(configPath, "utf8");
    usedPath = configPath;
    filePartial = parseConfigFile(JSON.parse(raw) as unknown);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (overrides.configPath && code === "ENOENT") {
      throw new ConfigurationError(`Config file not found: ${overrides.configPath}`);
    }
    if (code !== "ENOENT") {
      if (err instanceof ConfigurationError) throw err;
      if (err instanceof SyntaxError) {
        throw new ConfigurationError(`Config file is not valid JSON: ${configPath}`);
      }
      if (!(err instanceof Error && code === "ENOENT")) {
        // ignore missing default config
        if (code !== "ENOENT") {
          throw new ConfigurationError(
            `Unable to read config: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  const fromCli: Partial<ClaudeAutoConfig> = {};
  if (overrides.fallbackResetSeconds !== undefined) {
    fromCli.fallbackResetSeconds = overrides.fallbackResetSeconds;
  }
  if (overrides.resetBufferSeconds !== undefined) {
    fromCli.resetBufferSeconds = overrides.resetBufferSeconds;
  }
  if (overrides.maxAutoResumes !== undefined) {
    fromCli.maxAutoResumes = overrides.maxAutoResumes;
  }
  if (overrides.continuationPrompt !== undefined) {
    fromCli.continuationPrompt = overrides.continuationPrompt;
  }
  if (overrides.countdown !== undefined) {
    fromCli.countdown = overrides.countdown;
  }
  if (overrides.verbose !== undefined) {
    fromCli.verbose = overrides.verbose;
  }

  const config = validateConfig({ ...filePartial, ...fromCli }, DEFAULT_CONFIG);
  return { config, configPath: usedPath };
}
