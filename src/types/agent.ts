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
}

export interface AgentResult {
  agentName: string;
  success: boolean;
  data: unknown;
  rawResponse: string;
  tokensUsed: { input: number; output: number };
}
