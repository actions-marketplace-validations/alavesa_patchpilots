import chalk from "chalk";
import type { ReviewResult, ReviewFinding, CoderResult, TestResult, PlanResult, DocsResult, SecurityResult, AuditResult, Severity } from "../types/index.js";

const SEVERITY_COLORS: Record<Severity, (text: string) => string> = {
  critical: chalk.red.bold,
  warning: chalk.yellow,
  info: chalk.blue,
};

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: "🔴",
  warning: "🟡",
  info: "🔵",
};

export function formatReviewResult(result: ReviewResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.underline("Review Results"));
  lines.push("");

  if (result.findings.length === 0) {
    lines.push(chalk.green("  No issues found! Your code looks great."));
    lines.push("");
    return lines.join("\n");
  }

  // Group findings by file
  const byFile = new Map<string, ReviewFinding[]>();
  for (const finding of result.findings) {
    const existing = byFile.get(finding.file) ?? [];
    existing.push(finding);
    byFile.set(finding.file, existing);
  }

  for (const [file, findings] of byFile) {
    lines.push(chalk.bold(`  📄 ${file}`));
    for (const f of findings) {
      const color = SEVERITY_COLORS[f.severity];
      const icon = SEVERITY_ICONS[f.severity];
      const lineRef = f.line ? chalk.gray(`:${f.line}`) : "";
      lines.push(`    ${icon} ${color(f.title)}${lineRef} ${chalk.gray(`[${f.category}]`)}`);
      lines.push(`       ${f.description}`);
      if (f.suggestion) {
        lines.push(`       ${chalk.green("→")} ${f.suggestion}`);
      }
      lines.push("");
    }
  }

  // Summary
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const f of result.findings) counts[f.severity]++;

  lines.push(chalk.bold("  Summary: ") + [
    counts.critical > 0 ? chalk.red(`${counts.critical} critical`) : null,
    counts.warning > 0 ? chalk.yellow(`${counts.warning} warnings`) : null,
    counts.info > 0 ? chalk.blue(`${counts.info} info`) : null,
  ].filter(Boolean).join(", "));

  lines.push(`  ${chalk.gray(result.summary)}`);
  lines.push("");

  return lines.join("\n");
}

export function formatCoderResult(result: CoderResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.underline("Improvements"));
  lines.push("");

  if (result.improvedFiles.length === 0) {
    lines.push(chalk.green("  No changes needed."));
    lines.push("");
    return lines.join("\n");
  }

  let totalPatches = 0;
  for (const file of result.improvedFiles) {
    lines.push(chalk.bold(`  📝 ${file.path}`) + chalk.gray(` (${file.patches.length} patches)`));
    lines.push("");

    for (const patch of file.patches) {
      lines.push(`    ${chalk.green("→")} ${patch.description}`);
      // Show compact diff for the patch
      for (const line of patch.find.split("\n").slice(0, 5)) {
        lines.push(chalk.red(`      - ${line}`));
      }
      if (patch.find.split("\n").length > 5) {
        lines.push(chalk.gray(`      ... (${patch.find.split("\n").length - 5} more lines)`));
      }
      for (const line of patch.replace.split("\n").slice(0, 5)) {
        lines.push(chalk.green(`      + ${line}`));
      }
      if (patch.replace.split("\n").length > 5) {
        lines.push(chalk.gray(`      ... (${patch.replace.split("\n").length - 5} more lines)`));
      }
      lines.push("");
      totalPatches++;
    }
  }

  lines.push(chalk.bold("  Summary: ") + chalk.green(`${totalPatches} patches`) + ` across ${result.improvedFiles.length} file(s)`);
  lines.push(`  ${chalk.gray(result.summary)}`);
  lines.push("");

  return lines.join("\n");
}

export function formatTestResult(result: TestResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.underline("Generated Tests"));
  lines.push("");

  if (result.testFiles.length === 0) {
    lines.push(chalk.yellow("  No tests generated — source files may be type-only."));
    lines.push("");
    return lines.join("\n");
  }

  for (const file of result.testFiles) {
    lines.push(chalk.bold(`  🧪 ${file.path}`) + chalk.gray(` (${file.testCount} tests, from ${file.sourceFile})`));
    lines.push("");
    // Show the test content with syntax highlighting hint
    for (const line of file.content.split("\n")) {
      lines.push(chalk.gray("    ") + line);
    }
    lines.push("");
  }

  const totalTests = result.testFiles.reduce((sum, f) => sum + f.testCount, 0);
  lines.push(chalk.bold("  Summary: ") + chalk.green(`${totalTests} tests`) + ` across ${result.testFiles.length} file(s)`);
  lines.push(`  ${chalk.gray(result.summary)}`);
  lines.push("");

  return lines.join("\n");
}

const PRIORITY_COLORS: Record<string, (text: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.blue,
};

const COMPLEXITY_ICONS: Record<string, string> = {
  simple: "🟢",
  moderate: "🟡",
  complex: "🔴",
};

export function formatPlanResult(result: PlanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.underline("Implementation Plan"));
  lines.push("");

  if (result.goal) {
    lines.push(chalk.bold("  Goal: ") + result.goal);
    lines.push("");
  }

  if (result.tasks.length === 0) {
    lines.push(chalk.green("  No tasks identified."));
    lines.push("");
    return lines.join("\n");
  }

  for (const task of result.tasks) {
    const priorityColor = PRIORITY_COLORS[task.priority] ?? chalk.white;
    const complexityIcon = COMPLEXITY_ICONS[task.estimatedComplexity] ?? "⚪";

    lines.push(`  ${chalk.bold(`${task.id}.`)} ${chalk.bold(task.title)} ${complexityIcon} ${priorityColor(`[${task.priority}]`)}`);
    lines.push(`     ${task.description}`);
    if (task.files.length > 0) {
      lines.push(`     ${chalk.gray("Files:")} ${task.files.join(", ")}`);
    }
    lines.push("");
  }

  if (result.risks.length > 0) {
    lines.push(chalk.bold("  Risks:"));
    for (const risk of result.risks) {
      lines.push(`    ${chalk.yellow("⚠")} ${risk}`);
    }
    lines.push("");
  }

  lines.push(`  ${chalk.gray(result.summary)}`);
  lines.push("");

  return lines.join("\n");
}

export function formatDocsResult(result: DocsResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.underline("Generated Documentation"));
  lines.push("");

  if (result.docs.length === 0) {
    lines.push(chalk.yellow("  No documentation generated — files may already be well-documented."));
    lines.push("");
    return lines.join("\n");
  }

  for (const doc of result.docs) {
    lines.push(chalk.bold(`  📝 ${doc.file}`) + chalk.gray(` [${doc.type}]`));
    lines.push("");
    for (const line of doc.content.split("\n")) {
      lines.push(chalk.gray("    ") + line);
    }
    lines.push("");
  }

  lines.push(chalk.bold("  Summary: ") + `${result.docs.length} file(s) documented`);
  lines.push(`  ${chalk.gray(result.summary)}`);
  lines.push("");

  return lines.join("\n");
}

const SEC_SEVERITY_COLORS: Record<string, (text: string) => string> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.blue,
};

const SEC_SEVERITY_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

const RISK_COLORS: Record<string, (text: string) => string> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.blue,
  none: chalk.green,
};

export function formatSecurityResult(result: SecurityResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold.underline("Security Audit"));
  lines.push("");

  if (result.findings.length === 0) {
    lines.push(chalk.green("  No security issues found. Code looks secure."));
    lines.push("");
    return lines.join("\n");
  }

  // Group by file
  const byFile = new Map<string, typeof result.findings>();
  for (const finding of result.findings) {
    const existing = byFile.get(finding.file) ?? [];
    existing.push(finding);
    byFile.set(finding.file, existing);
  }

  for (const [file, findings] of byFile) {
    lines.push(chalk.bold(`  🔒 ${file}`));
    for (const f of findings) {
      const color = SEC_SEVERITY_COLORS[f.severity] ?? chalk.white;
      const icon = SEC_SEVERITY_ICONS[f.severity] ?? "⚪";
      const lineRef = f.line ? chalk.gray(`:${f.line}`) : "";
      const cwe = f.cwe ? chalk.gray(` (${f.cwe})`) : "";
      lines.push(`    ${icon} ${color(f.title)}${lineRef} ${chalk.gray(`[${f.category}]`)}${cwe}`);
      lines.push(`       ${f.description}`);
      lines.push(`       ${chalk.red("Impact:")} ${f.impact}`);
      lines.push(`       ${chalk.green("Fix:")} ${f.remediation}`);
      lines.push("");
    }
  }

  // Counts
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of result.findings) counts[f.severity]++;

  const riskColor = RISK_COLORS[result.riskScore] ?? chalk.white;
  lines.push(chalk.bold("  Risk score: ") + riskColor(result.riskScore.toUpperCase()));
  lines.push(chalk.bold("  Findings: ") + [
    counts.critical > 0 ? chalk.red(`${counts.critical} critical`) : null,
    counts.high > 0 ? chalk.red(`${counts.high} high`) : null,
    counts.medium > 0 ? chalk.yellow(`${counts.medium} medium`) : null,
    counts.low > 0 ? chalk.blue(`${counts.low} low`) : null,
  ].filter(Boolean).join(", "));
  lines.push(`  ${chalk.gray(result.summary)}`);
  lines.push("");

  return lines.join("\n");
}

export function formatAuditResult(result: AuditResult): string {
  const lines: string[] = [];
  const divider = chalk.gray("═".repeat(50));
  const thinDivider = chalk.gray("─".repeat(50));

  lines.push("");
  lines.push(divider);
  lines.push(chalk.bold.cyan("  PatchPilots Full Audit Report"));
  lines.push(divider);

  // Plan
  if (result.plan) {
    lines.push("");
    lines.push(chalk.bold("  🧠 Plan"));
    if (result.plan.goal) lines.push(`     ${result.plan.goal}`);
    lines.push(`     ${result.plan.tasks.length} tasks identified`);
  }

  // Review
  lines.push("");
  lines.push(chalk.bold("  🔍 Code Review"));
  if (result.review.findings.length === 0) {
    lines.push(chalk.green("     No issues found"));
  } else {
    const rc: Record<string, number> = { critical: 0, warning: 0, info: 0 };
    for (const f of result.review.findings) rc[f.severity]++;
    lines.push("     " + [
      rc.critical > 0 ? chalk.red(`${rc.critical} critical`) : null,
      rc.warning > 0 ? chalk.yellow(`${rc.warning} warnings`) : null,
      rc.info > 0 ? chalk.blue(`${rc.info} info`) : null,
    ].filter(Boolean).join(", "));
  }

  // Security
  lines.push("");
  lines.push(chalk.bold("  🔒 Security Audit"));
  const riskColor = result.security.riskScore === "none" ? chalk.green
    : result.security.riskScore === "low" ? chalk.blue
    : result.security.riskScore === "medium" ? chalk.yellow
    : chalk.red;
  lines.push(`     Risk score: ${riskColor(result.security.riskScore.toUpperCase())}`);
  if (result.security.findings.length > 0) {
    const sc: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of result.security.findings) sc[f.severity]++;
    lines.push("     " + [
      sc.critical > 0 ? chalk.red(`${sc.critical} critical`) : null,
      sc.high > 0 ? chalk.red(`${sc.high} high`) : null,
      sc.medium > 0 ? chalk.yellow(`${sc.medium} medium`) : null,
      sc.low > 0 ? chalk.blue(`${sc.low} low`) : null,
    ].filter(Boolean).join(", "));
  }

  // Coder
  lines.push("");
  lines.push(chalk.bold("  ✨ Improvements"));
  if (result.totalPatches === 0) {
    lines.push(chalk.green("     No patches needed"));
  } else {
    lines.push(`     ${chalk.green(`${result.totalPatches} patches`)} across ${result.coder.improvedFiles.length} file(s)`);
  }

  // Tests
  if (result.tests) {
    lines.push("");
    lines.push(chalk.bold("  🧪 Tests"));
    const totalTests = result.tests.testFiles.reduce((s, f) => s + f.testCount, 0);
    lines.push(`     ${chalk.green(`${totalTests} tests`)} generated across ${result.tests.testFiles.length} file(s)`);
  }

  // Docs
  if (result.docs) {
    lines.push("");
    lines.push(chalk.bold("  📝 Documentation"));
    lines.push(`     ${result.docs.docs.length} file(s) documented`);
  }

  // Summary
  lines.push("");
  lines.push(thinDivider);
  lines.push(chalk.bold(`  Summary: `) +
    `${result.totalFindings} findings | ${result.totalPatches} patches` +
    (result.tests ? ` | ${result.tests.testFiles.reduce((s, f) => s + f.testCount, 0)} tests` : "") +
    (result.docs ? ` | ${result.docs.docs.length} docs` : "")
  );
  lines.push(divider);
  lines.push("");

  return lines.join("\n");
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
