import type { PatchPilotsConfig } from "./config.js";

export interface FileContent {
  path: string;
  content: string;
  language: string;
}

export interface AgentContext {
  files: FileContent[];
  previousResults?: AgentResult;
  config: PatchPilotsConfig;
  memoryContext?: string;
}

export interface AgentResult {
  agentName: string;
  success: boolean;
  data: unknown;
  rawResponse: string;
  tokensUsed: { input: number; output: number };
  /** Model used for this call (set when routing overrides the default) */
  model?: string;
  /** Multiple models used across batches (set when routing splits across tiers) */
  modelsUsed?: string[];
}
