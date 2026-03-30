export interface CustomAgentConfig {
  name: string;
  description: string;
  prompt: string;
}

export interface PatchPilotsConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  include: string[];
  exclude: string[];
  maxFileSize: number;
  maxFiles: number;
  batchSize: number;
  customAgents?: CustomAgentConfig[];
}

export const DEFAULT_CONFIG: Omit<PatchPilotsConfig, "apiKey"> = {
  model: "claude-sonnet-4-6",
  maxTokens: 8192,
  temperature: 0.3,
  include: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.py", "**/*.go", "**/*.rs", "**/*.java"],
  exclude: ["node_modules/**", "dist/**", ".git/**", "*.min.js", "*.bundle.js"],
  maxFileSize: 100_000,
  maxFiles: 20,
  batchSize: 5,
};
