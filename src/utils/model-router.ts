import type { FileContent } from "../types/index.js";
import { log } from "./logger.js";

export type ModelTier = "fast" | "standard" | "deep";

export interface ModelRoutingConfig {
  enabled: boolean;
  /** Model for simple/small files (default: claude-haiku-4-5) */
  fast: string;
  /** Model for most code (default: claude-sonnet-4-6) */
  standard: string;
  /** Model for complex/critical files (default: claude-opus-4-6) */
  deep: string;
  /** Files under this many lines → fast tier (default: 50) */
  fastMaxLines: number;
  /** Files over this many lines → deep tier (default: 500) */
  deepMinLines: number;
  /** Path patterns that always route to fast tier */
  fastPatterns: string[];
  /** Path patterns that always route to deep tier */
  deepPatterns: string[];
}

export const DEFAULT_ROUTING: ModelRoutingConfig = {
  enabled: false,
  fast: "claude-haiku-4-5",
  standard: "claude-sonnet-4-6",
  deep: "claude-opus-4-6",
  fastMaxLines: 50,
  deepMinLines: 500,
  fastPatterns: [
    "types", "constants", "config", "index",
    ".d.ts", ".enum", ".interface",
  ],
  deepPatterns: [
    "auth", "crypto", "security", "middleware",
    "payment", "billing", "session", "token",
    "database", "migration", "schema",
  ],
};

/**
 * Classify a single file into a model tier based on size and path patterns.
 * Pattern matching takes priority over line count.
 */
export function classifyFile(file: FileContent, config: ModelRoutingConfig): ModelTier {
  const pathLower = file.path.toLowerCase();

  // Pattern-based routing takes priority
  if (config.deepPatterns.some(p => pathLower.includes(p))) return "deep";
  if (config.fastPatterns.some(p => pathLower.includes(p))) return "fast";

  // Line-count-based routing
  const lineCount = file.content.split("\n").length;
  if (lineCount <= config.fastMaxLines) return "fast";
  if (lineCount >= config.deepMinLines) return "deep";

  return "standard";
}

/**
 * Group files by model tier. Returns a Map with only non-empty tiers.
 */
export function routeFiles(
  files: FileContent[],
  config: ModelRoutingConfig,
): Map<ModelTier, FileContent[]> {
  const groups = new Map<ModelTier, FileContent[]>();

  for (const file of files) {
    const tier = classifyFile(file, config);
    const list = groups.get(tier) ?? [];
    list.push(file);
    groups.set(tier, list);
  }

  return groups;
}

/**
 * Resolve a model tier to an actual model ID.
 */
export function tierToModel(tier: ModelTier, config: ModelRoutingConfig): string {
  switch (tier) {
    case "fast": return config.fast;
    case "standard": return config.standard;
    case "deep": return config.deep;
  }
}

/**
 * Log routing summary for verbose output.
 */
export function logRoutingSummary(groups: Map<ModelTier, FileContent[]>, config: ModelRoutingConfig): void {
  for (const [tier, files] of groups) {
    const model = tierToModel(tier, config);
    log.info(`  ${tier} tier (${model}): ${files.length} file(s)`);
  }
}