export type Severity = "critical" | "warning" | "info";
export type Category = "bug" | "security" | "performance" | "code-smell" | "style";

export interface ReviewFinding {
  file: string;
  line?: number;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  suggestion?: string;
}

export interface ReviewResult {
  findings: ReviewFinding[];
  summary: string;
}

export interface ImprovedFile {
  path: string;
  original: string;
  improved: string;
  changes: string[];
}

export interface CoderResult {
  improvedFiles: ImprovedFile[];
  summary: string;
}

export interface TestFile {
  path: string;
  sourceFile: string;
  content: string;
  testCount: number;
}

export interface TestResult {
  testFiles: TestFile[];
  summary: string;
}

export interface PlanTask {
  id: number;
  title: string;
  description: string;
  files: string[];
  priority: "high" | "medium" | "low";
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export interface PlanResult {
  goal: string;
  tasks: PlanTask[];
  risks: string[];
  summary: string;
}

export interface DocEntry {
  file: string;
  content: string;
  type: "jsdoc" | "readme" | "inline";
}

export interface DocsResult {
  docs: DocEntry[];
  summary: string;
}
