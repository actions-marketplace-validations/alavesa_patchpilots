import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { z } from "zod";
import { DEFAULT_CONFIG, type PatchPilotsConfig } from "../types/index.js";

const configSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  maxFileSize: z.number().positive().optional(),
  maxFiles: z.number().positive().optional(),
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
  const fileConfig = cliOptions.config
    ? configSchema.parse(JSON.parse(readFileSync(resolve(cliOptions.config), "utf-8")))
    : loadFileConfig(targetPath);

  const apiKey =
    fileConfig.apiKey ??
    process.env.ANTHROPIC_API_KEY ??
    "";

  if (!apiKey) {
    throw new Error(
      "Missing API key. Set ANTHROPIC_API_KEY environment variable or add apiKey to .patchpilots.json"
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...(cliOptions.model ? { model: cliOptions.model } : {}),
    apiKey,
  };
}
