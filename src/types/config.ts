export interface PatchPilotsConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  include: string[];
  exclude: string[];
  maxFileSize: number;
  maxFiles: number;
}

export const DEFAULT_CONFIG: Omit<PatchPilotsConfig, "apiKey"> = {
  model: "claude-sonnet-4-6",
  maxTokens: 16000,
  temperature: 0.3,
  include: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.py", "**/*.go", "**/*.rs", "**/*.java"],
  exclude: ["node_modules/**", "dist/**", ".git/**", "*.min.js", "*.bundle.js"],
  maxFileSize: 100_000,
  maxFiles: 20,
};
