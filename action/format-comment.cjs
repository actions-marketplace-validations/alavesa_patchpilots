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
  critical: "\uD83D\uDD34",
  high: "\uD83D\uDFE0",
  warning: "\uD83D\uDFE1",
  medium: "\uD83D\uDFE1",
  info: "\uD83D\uDD35",
  low: "\uD83D\uDD35",
};

function severityEmoji(severity) {
  return SEVERITY_EMOJI[severity] || "\u26AA";
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
  lines.push("## \uD83E\uDDE0 Plan");
  lines.push("");
  if (plan.goal) {
    lines.push(`> ${plan.goal}`);
    lines.push("");
  }
  for (const task of plan.tasks) {
    const complexity =
      task.estimatedComplexity === "complex"
        ? "\uD83D\uDD34"
        : task.estimatedComplexity === "moderate"
        ? "\uD83D\uDFE1"
        : "\uD83D\uDFE2";
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
    return "## \uD83D\uDD0D Code Review\n\n\u2705 No issues found.\n\n";
  }

  const lines = [];
  lines.push(`## \uD83D\uDD0D Code Review (${review.findings.length} findings)`);
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

function formatFindingsTable(section, title, emptyMsg, getCategoryLabel) {
  if (!section || !section.findings || section.findings.length === 0) {
    return `## ${title}\n\n\u2705 ${emptyMsg}\n\n`;
  }

  const lines = [];
  lines.push(`## ${title} (${section.findings.length} findings)`);
  lines.push("");
  lines.push("| Severity | File | Category | Finding | Remediation |");
  lines.push("|----------|------|----------|---------|-------------|");

  const shown = section.findings.slice(0, MAX_FINDINGS);
  for (const f of shown) {
    const loc = f.line ? `\`${f.file}:${f.line}\`` : `\`${f.file}\``;
    const cat = getCategoryLabel(f);
    lines.push(
      `| ${severityEmoji(f.severity)} ${f.severity} | ${loc} | ${escapeMarkdown(cat)} | ${escapeMarkdown(f.title)} | ${escapeMarkdown(truncate(f.remediation, 100))} |`
    );
  }

  if (section.findings.length > MAX_FINDINGS) {
    lines.push("");
    lines.push(
      `*... and ${section.findings.length - MAX_FINDINGS} more findings*`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function formatSecurity(security) {
  return formatFindingsTable(
    security,
    "\uD83D\uDD12 Security Audit",
    "No security issues found.",
    (f) => f.cwe ? `${f.category} (${f.cwe})` : f.category
  );
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

  lines.push(`## \u2728 Suggested Improvements (${totalPatches} patches)`);
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

function formatDesigner(designer) {
  return formatFindingsTable(
    designer,
    "\uD83C\uDFA8 Design & Accessibility",
    "No design or accessibility issues found.",
    (f) => f.wcagRef ? `${f.category} (${f.wcagRef})` : f.category
  );
}

function formatTests(tests) {
  if (!tests || !tests.testFiles || tests.testFiles.length === 0) return "";
  const totalTests = tests.testFiles.reduce((s, f) => s + f.testCount, 0);
  return `## \uD83E\uDDEA Tests\n\n${totalTests} tests generated across ${tests.testFiles.length} file(s).\n\n`;
}

function formatDocs(docs) {
  if (!docs || !docs.docs || docs.docs.length === 0) return "";
  return `## \uD83D\uDCDD Documentation\n\n${docs.docs.length} file(s) documented.\n\n`;
}

function formatFooter(result) {
  const lines = [];
  lines.push("---");
  lines.push(
    `<sub>Generated by <a href="https://github.com/alavesa/patchpilots">PatchPilots</a> ` +
      `| ${result.totalFindings || 0} findings | ${result.totalPatches || 0} patches | risk: ${result.riskScore || "none"}</sub>`
  );
  lines.push("");
  lines.push(
    `<sub>Add <a href="https://github.com/alavesa/patchpilots"><img src="https://img.shields.io/badge/reviewed%20by-PatchPilots%20🎯-blueviolet" alt="Reviewed by PatchPilots" /></a> to your README</sub>`
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
    formatDesigner(result.designer),
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
