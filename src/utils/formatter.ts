import chalk from "chalk";
import type { ReviewResult, ReviewFinding, CoderResult, TestResult, Severity } from "../types/index.js";

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

  for (const file of result.improvedFiles) {
    lines.push(chalk.bold(`  📝 ${file.path}`));
    for (const change of file.changes) {
      lines.push(`    ${chalk.green("→")} ${change}`);
    }
    lines.push("");

    // Simple diff display
    const origLines = file.original.split("\n");
    const newLines = file.improved.split("\n");

    lines.push(chalk.gray("    --- original"));
    lines.push(chalk.gray("    +++ improved"));

    // Show changed lines (simplified)
    const maxLines = Math.max(origLines.length, newLines.length);
    let diffShown = 0;
    for (let i = 0; i < maxLines && diffShown < 30; i++) {
      if (origLines[i] !== newLines[i]) {
        if (origLines[i] !== undefined) {
          lines.push(chalk.red(`    - ${origLines[i]}`));
        }
        if (newLines[i] !== undefined) {
          lines.push(chalk.green(`    + ${newLines[i]}`));
        }
        diffShown++;
      }
    }
    lines.push("");
  }

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

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
