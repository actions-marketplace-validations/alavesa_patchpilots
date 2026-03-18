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
