#!/usr/bin/env node

/**
 * Converts PatchPilots AuditResult JSON into a GitHub markdown comment.
 * Zero dependencies — runs on any Node.js 18+.
 *
 * Usage: node format-comment.js /path/to/result.json
 */

const fs = require("fs");
const path = require("path");

const MAX_FINDINGS = 50;
const MAX_PATCHES = 30;

const SEVERITY_EMOJI = {
  critical: ":red_circle:",
  high: ":orange_circle:",
  warning: ":yellow_circle:",
  medium: ":yellow_circle:",
  info: ":blue_circle:",
  low: ":blue_circle:",
};

function severityEmoji(severity) {
  return SEVERITY_EMOJI[severity] || ":white_circle:";
}

function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function truncate(text, max = 120) {
  if (!text) return "";
  const clean = text.replace(/\n/g, " ");
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

// --- Sections ---

function formatHeader(result) {
  const lines = [];
  lines.push("<!-- patchpilots-report -->");
  lines.push("# PatchPilots Audit Report");
  lines.push("");
  lines.push(
    `**Risk Score:** ${result.riskScore?.toUpperCase() || "N/A"} | ` +
      `**Findings:** ${result.totalFindings || 0} | ` +
      `**Patches:** ${result.totalPatches || 0}`
  );
  lines.push("");
  return lines.join("\n");
}

function formatPlan(plan) {
  if (!plan || !plan.tasks || plan.tasks.length === 0) return "";
  const lines = [];
  lines.push("## :brain: Plan");
  lines.push("");
  if (plan.goal) {
    lines.push(`> ${plan.goal}`);
    lines.push("");
  }
  for (const task of plan.tasks) {
    const complexity =
      task.estimatedComplexity === "complex"
        ? ":red_circle:"
        : task.estimatedComplexity === "moderate"
        ? ":yellow_circle:"
        : ":green_circle:";
    lines.push(
      `${task.id}. ${complexity} **${task.title}** \\[${task.priority}\\]`
    );
    if (task.description) lines.push(`   ${truncate(task.description, 200)}`);
  }
  lines.push("");
  return lines.join("\n");
}

function formatReview(review) {
  if (!review || !review.findings || review.findings.length === 0) {
    return "## :mag: Code Review\n\n:white_check_mark: No issues found.\n\n";
  }

  const lines = [];
  lines.push(`## :mag: Code Review (${review.findings.length} findings)`);
  lines.push("");
  lines.push("| Severity | File | Finding | Suggestion |");
  lines.push("|----------|------|---------|------------|");

  const shown = review.findings.slice(0, MAX_FINDINGS);
  for (const f of shown) {
    const loc = f.line ? `\`${f.file}:${f.line}\`` : `\`${f.file}\``;
    lines.push(
      `| ${severityEmoji(f.severity)} ${f.severity} | ${loc} | ${escapeMarkdown(f.title)} | ${escapeMarkdown(truncate(f.suggestion || f.description, 100))} |`
    );
  }

  if (review.findings.length > MAX_FINDINGS) {
    lines.push("");
    lines.push(
      `*... and ${review.findings.length - MAX_FINDINGS} more findings*`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function formatSecurity(security) {
  if (!security || !security.findings || security.findings.length === 0) {
    return "## :lock: Security Audit\n\n:white_check_mark: No security issues found.\n\n";
  }

  const lines = [];
  lines.push(
    `## :lock: Security Audit (${security.findings.length} findings)`
  );
  lines.push("");
  lines.push("| Severity | File | Category | Finding | Remediation |");
  lines.push("|----------|------|----------|---------|-------------|");

  const shown = security.findings.slice(0, MAX_FINDINGS);
  for (const f of shown) {
    const loc = f.line ? `\`${f.file}:${f.line}\`` : `\`${f.file}\``;
    const cat = f.cwe ? `${f.category} (${f.cwe})` : f.category;
    lines.push(
      `| ${severityEmoji(f.severity)} ${f.severity} | ${loc} | ${escapeMarkdown(cat)} | ${escapeMarkdown(f.title)} | ${escapeMarkdown(truncate(f.remediation, 100))} |`
    );
  }

  if (security.findings.length > MAX_FINDINGS) {
    lines.push("");
    lines.push(
      `*... and ${security.findings.length - MAX_FINDINGS} more findings*`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function formatPatches(coder) {
  if (
    !coder ||
    !coder.improvedFiles ||
    coder.improvedFiles.length === 0
  ) {
    return "";
  }

  const lines = [];
  let totalPatches = 0;
  for (const f of coder.improvedFiles) totalPatches += f.patches.length;

  lines.push(`## :sparkles: Suggested Improvements (${totalPatches} patches)`);
  lines.push("");

  let patchCount = 0;
  for (const file of coder.improvedFiles) {
    if (patchCount >= MAX_PATCHES) {
      lines.push(
        `*... and more patches across remaining files*`
      );
      break;
    }

    lines.push(
      `<details>\n<summary><strong>${file.path}</strong> (${file.patches.length} patches)</summary>\n`
    );

    for (const patch of file.patches) {
      if (patchCount >= MAX_PATCHES) break;
      lines.push(`**${escapeMarkdown(patch.description)}**`);
      lines.push("```diff");
      for (const line of patch.find.split("\n")) {
        lines.push(`- ${line}`);
      }
      for (const line of patch.replace.split("\n")) {
        lines.push(`+ ${line}`);
      }
      lines.push("```");
      lines.push("");
      patchCount++;
    }

    lines.push("</details>\n");
  }

  lines.push("");
  return lines.join("\n");
}

function formatTests(tests) {
  if (!tests || !tests.testFiles || tests.testFiles.length === 0) return "";
  const totalTests = tests.testFiles.reduce((s, f) => s + f.testCount, 0);
  return `## :test_tube: Tests\n\n${totalTests} tests generated across ${tests.testFiles.length} file(s).\n\n`;
}

function formatDocs(docs) {
  if (!docs || !docs.docs || docs.docs.length === 0) return "";
  return `## :memo: Documentation\n\n${docs.docs.length} file(s) documented.\n\n`;
}

function formatFooter(result) {
  const lines = [];
  lines.push("---");
  lines.push(
    `<sub>Generated by <a href="https://github.com/alavesa/patchpilots">PatchPilots</a> ` +
      `| ${result.totalFindings || 0} findings | ${result.totalPatches || 0} patches | risk: ${result.riskScore || "none"}</sub>`
  );
  return lines.join("\n");
}

// --- Main ---

function formatComment(result) {
  return [
    formatHeader(result),
    formatPlan(result.plan),
    formatReview(result.review),
    formatSecurity(result.security),
    formatPatches(result.coder),
    formatTests(result.tests),
    formatDocs(result.docs),
    formatFooter(result),
  ].join("");
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node format-comment.js <result.json>");
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(filePath), "utf-8");
const result = JSON.parse(raw);
process.stdout.write(formatComment(result));
