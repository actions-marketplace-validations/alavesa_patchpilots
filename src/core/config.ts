import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { DEFAULT_CONFIG, type PatchPilotsConfig } from "../types/index.js";

const customAgentSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
});

const configSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  maxFileSize: z.number().positive().optional(),
  maxFiles: z.number().positive().optional(),
  customAgents: z.array(customAgentSchema).optional(),
});

function findConfigFile(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    const configPath = resolve(dir, ".patchpilots.json");
    if (existsSync(configPath)) return configPath;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadGlobalConfig(): Partial<PatchPilotsConfig> {
  const globalPath = resolve(homedir(), ".patchpilots.json");
  if (!existsSync(globalPath)) return {};
  try {
    return configSchema.parse(JSON.parse(readFileSync(globalPath, "utf-8")));
  } catch {
    return {};
  }
}

function loadFileConfig(startDir: string): Partial<PatchPilotsConfig> {
  const configPath = findConfigFile(startDir);
  if (!configPath) return {};

  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8"));
    return configSchema.parse(raw);
  } catch {
    return {};
  }
}

export interface CLIOptions {
  model?: string;
  config?: string;
}

export function loadConfig(targetPath: string, cliOptions: CLIOptions = {}): PatchPilotsConfig {
  const globalConfig = loadGlobalConfig();
  const fileConfig = cliOptions.config
    ? configSchema.parse(JSON.parse(readFileSync(resolve(cliOptions.config), "utf-8")))
    : loadFileConfig(targetPath);

  const apiKey =
    fileConfig.apiKey ??
    globalConfig.apiKey ??
    process.env.ANTHROPIC_API_KEY ??
    "";

  if (!apiKey) {
    throw new Error(
      "Missing API key. Set ANTHROPIC_API_KEY environment variable or add apiKey to .patchpilots.json"
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...globalConfig,
    ...fileConfig,
    ...(cliOptions.model ? { model: cliOptions.model } : {}),
    apiKey,
  };
}
