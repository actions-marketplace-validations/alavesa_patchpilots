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

export interface FilePatch {
  find: string;
  replace: string;
  description: string;
}

export interface ImprovedFile {
  path: string;
  patches: FilePatch[];
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

export type SecurityCategory =
  | "injection"
  | "auth"
  | "xss"
  | "csrf"
  | "secrets"
  | "crypto"
  | "input-validation"
  | "access-control"
  | "data-exposure"
  | "misconfiguration";

export interface SecurityFinding {
  file: string;
  line?: number;
  severity: "critical" | "high" | "medium" | "low";
  category: SecurityCategory;
  cwe?: string;
  title: string;
  description: string;
  impact: string;
  remediation: string;
}

export interface SecurityResult {
  findings: SecurityFinding[];
  riskScore: "critical" | "high" | "medium" | "low" | "none";
  summary: string;
}

export type DesignerCategory = "accessibility" | "consistency" | "tokens" | "markup";

export interface DesignerFinding {
  file: string;
  line?: number;
  severity: "critical" | "high" | "medium" | "low";
  category: DesignerCategory;
  wcagRef?: string;
  title: string;
  description: string;
  remediation: string;
}

export interface DesignerResult {
  findings: DesignerFinding[];
  designHealthScore: "critical" | "high" | "medium" | "low" | "none";
  summary: string;
}

export interface AuditResult {
  plan?: PlanResult;
  review: ReviewResult;
  security: SecurityResult;
  designer?: DesignerResult;
  coder: CoderResult;
  tests?: TestResult;
  docs?: DocsResult;
  totalFindings: number;
  totalPatches: number;
  riskScore: string;
  summary: string;
}
