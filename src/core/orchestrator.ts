import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { LLMClient } from "./llm-client.js";
import { ReviewerAgent } from "../agents/reviewer.js";
import { CoderAgent } from "../agents/coder.js";
import { TesterAgent } from "../agents/tester.js";
import { PlannerAgent } from "../agents/planner.js";
import { DocsAgent } from "../agents/docs.js";
import { SecurityAgent } from "../agents/security.js";
import { collectFiles } from "../utils/files.js";
import { formatReviewResult, formatCoderResult, formatTestResult, formatPlanResult, formatDocsResult, formatSecurityResult, formatJson } from "../utils/formatter.js";
import { log } from "../utils/logger.js";
import { CostTracker } from "../utils/cost.js";
import type { PatchPilotsConfig } from "../types/index.js";
import type { ReviewResult, CoderResult, TestResult, PlanResult, DocsResult, SecurityResult, AuditResult } from "../types/review.js";

export interface OrchestratorOptions {
  json?: boolean;
  verbose?: boolean;
  write?: boolean;
  backup?: boolean;
  severity?: string;
  framework?: string;
  task?: string;
  skip?: string[];
}

export class Orchestrator {
  private llmClient: LLMClient;
  private config: PatchPilotsConfig;
  private costTracker: CostTracker;

  constructor(config: PatchPilotsConfig) {
    this.config = config;
    this.llmClient = new LLMClient(config.apiKey, config.model);
    this.costTracker = new CostTracker(config.model);
  }

  private printCost(json?: boolean): void {
    if (!json) {
      console.log(this.costTracker.formatSummary());
    }
  }

  private createStreamCallback(verbose: boolean) {
    let thinkingStarted = false;
    return (token: string) => {
      if (verbose) {
        if (!thinkingStarted) {
          log.verbose("Agent is thinking...");
          thinkingStarted = true;
        }
        process.stderr.write(".");
      }
    };
  }

  async review(targetPath: string, options: OrchestratorOptions = {}): Promise<ReviewResult> {
    log.step("Collecting files...");
    const files = await collectFiles(targetPath, this.config);

    if (files.length === 0) {
      log.warn("No matching files found.");
      return { findings: [], summary: "No files to review." };
    }

    log.info(`Found ${files.length} file(s) to review`);
    if (options.verbose) {
      for (const f of files) log.verbose(`  ${f.path}`);
    }

    log.step("🔍 Reviewer agent analyzing code...");
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const reviewer = new ReviewerAgent(this.llmClient);
    const result = await reviewer.execute({ files, config: this.config }, onToken);
    const reviewResult = result.data as ReviewResult;
    this.costTracker.track("Reviewer", result.tokensUsed);

    if (options.verbose) {
      console.error(""); // newline after dots
      log.verbose(`Tokens used: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);
    }

    // Filter by severity if specified
    if (options.severity) {
      const levels: Record<string, number> = { critical: 3, warning: 2, info: 1 };
      const minLevel = levels[options.severity] ?? 1;
      reviewResult.findings = reviewResult.findings.filter(
        (f) => (levels[f.severity] ?? 1) >= minLevel
      );
    }

    if (options.json) {
      console.log(formatJson(reviewResult));
    } else {
      console.log(formatReviewResult(reviewResult));
    }

    this.printCost(options.json);
    return reviewResult;
  }

  async improve(targetPath: string, options: OrchestratorOptions = {}): Promise<{
    review: ReviewResult;
    coder: CoderResult;
  }> {
    // Step 1: Review
    const reviewResult = await this.review(targetPath, { ...options, json: false });

    if (reviewResult.findings.length === 0) {
      log.success("No issues found — nothing to improve!");
      return { review: reviewResult, coder: { improvedFiles: [], summary: "No changes needed." } };
    }

    // Step 2: Improve
    log.step("✨ Coder agent improving code...");
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const files = await collectFiles(targetPath, this.config);
    const coder = new CoderAgent(this.llmClient);
    const coderResultRaw = await coder.execute(
      {
        files,
        config: this.config,
        previousResults: {
          agentName: "Reviewer",
          success: true,
          data: reviewResult,
          rawResponse: "",
          tokensUsed: { input: 0, output: 0 },
        },
      },
      onToken,
    );
    const coderResult = coderResultRaw.data as CoderResult;
    this.costTracker.track("Coder", coderResultRaw.tokensUsed);

    if (options.verbose) {
      console.error(""); // newline after dots
      log.verbose(`Tokens used: ${coderResultRaw.tokensUsed.input} in / ${coderResultRaw.tokensUsed.output} out`);
    }

    if (options.json) {
      console.log(formatJson({ review: reviewResult, improvements: coderResult }));
    } else {
      console.log(formatCoderResult(coderResult));
    }

    // Apply patches if requested
    if (options.write && coderResult.improvedFiles.length > 0) {
      for (const file of coderResult.improvedFiles) {
        const absPath = resolve(file.path);
        if (options.backup) {
          copyFileSync(absPath, absPath + ".bak");
          log.verbose(`Backed up ${file.path} → ${file.path}.bak`);
        }
        let content = readFileSync(absPath, "utf-8");
        let applied = 0;
        for (const patch of file.patches) {
          if (content.includes(patch.find)) {
            content = content.replace(patch.find, patch.replace);
            applied++;
          } else {
            log.warn(`Patch skipped (no match): ${patch.description}`);
          }
        }
        if (applied > 0) {
          writeFileSync(absPath, content, "utf-8");
          log.success(`Updated ${file.path} (${applied}/${file.patches.length} patches applied)`);
        }
      }
    } else if (!options.write && coderResult.improvedFiles.length > 0) {
      log.info("Dry run — use --write to apply changes to disk.");
    }

    this.printCost(options.json);
    return { review: reviewResult, coder: coderResult };
  }

  async generateTests(targetPath: string, options: OrchestratorOptions = {}): Promise<TestResult> {
    log.step("Collecting files...");
    const files = await collectFiles(targetPath, this.config);

    if (files.length === 0) {
      log.warn("No matching files found.");
      return { testFiles: [], summary: "No files to test." };
    }

    log.info(`Found ${files.length} file(s) to generate tests for`);
    if (options.verbose) {
      for (const f of files) log.verbose(`  ${f.path}`);
    }

    log.step("🧪 Tester agent generating tests...");
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const tester = new TesterAgent(this.llmClient, options.framework ?? "vitest");
    const result = await tester.execute({ files, config: this.config }, onToken);
    const testResult = result.data as TestResult;
    this.costTracker.track("Tester", result.tokensUsed);

    if (options.verbose) {
      console.error("");
      log.verbose(`Tokens used: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);
    }

    if (options.json) {
      console.log(formatJson(testResult));
    } else {
      console.log(formatTestResult(testResult));
    }

    // Write test files if requested
    if (options.write && testResult.testFiles.length > 0) {
      for (const file of testResult.testFiles) {
        const absPath = resolve(file.path);
        writeFileSync(absPath, file.content, "utf-8");
        log.success(`Created ${file.path}`);
      }
    } else if (!options.write && testResult.testFiles.length > 0) {
      log.info("Dry run — use --write to write test files to disk.");
    }

    this.printCost(options.json);
    return testResult;
  }

  async plan(targetPath: string, options: OrchestratorOptions = {}): Promise<PlanResult> {
    log.step("Collecting files...");
    const files = await collectFiles(targetPath, this.config);

    if (files.length === 0) {
      log.warn("No matching files found.");
      return { goal: "", tasks: [], risks: [], summary: "No files to analyze." };
    }

    log.info(`Found ${files.length} file(s) to analyze`);
    if (options.verbose) {
      for (const f of files) log.verbose(`  ${f.path}`);
    }

    log.step("🧠 Planner agent creating plan...");
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const planner = new PlannerAgent(this.llmClient, options.task);
    const result = await planner.execute({ files, config: this.config }, onToken);
    const planResult = result.data as PlanResult;
    this.costTracker.track("Planner", result.tokensUsed);

    if (options.verbose) {
      console.error("");
      log.verbose(`Tokens used: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);
    }

    if (options.json) {
      console.log(formatJson(planResult));
    } else {
      console.log(formatPlanResult(planResult));
    }

    this.printCost(options.json);
    return planResult;
  }

  async generateDocs(targetPath: string, options: OrchestratorOptions = {}): Promise<DocsResult> {
    log.step("Collecting files...");
    const files = await collectFiles(targetPath, this.config);

    if (files.length === 0) {
      log.warn("No matching files found.");
      return { docs: [], summary: "No files to document." };
    }

    log.info(`Found ${files.length} file(s) to document`);
    if (options.verbose) {
      for (const f of files) log.verbose(`  ${f.path}`);
    }

    log.step("📝 Docs agent generating documentation...");
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const docs = new DocsAgent(this.llmClient);
    const result = await docs.execute({ files, config: this.config }, onToken);
    const docsResult = result.data as DocsResult;
    this.costTracker.track("Docs", result.tokensUsed);

    if (options.verbose) {
      console.error("");
      log.verbose(`Tokens used: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);
    }

    if (options.json) {
      console.log(formatJson(docsResult));
    } else {
      console.log(formatDocsResult(docsResult));
    }

    // Write documented files if requested
    if (options.write && docsResult.docs.length > 0) {
      for (const doc of docsResult.docs) {
        const absPath = resolve(doc.file);
        if (options.backup) {
          copyFileSync(absPath, absPath + ".bak");
          log.verbose(`Backed up ${doc.file} → ${doc.file}.bak`);
        }
        writeFileSync(absPath, doc.content, "utf-8");
        log.success(`Updated ${doc.file}`);
      }
    } else if (!options.write && docsResult.docs.length > 0) {
      log.info("Dry run — use --write to write documented files to disk.");
    }

    this.printCost(options.json);
    return docsResult;
  }

  async securityAudit(targetPath: string, options: OrchestratorOptions = {}): Promise<SecurityResult> {
    log.step("Collecting files...");
    const files = await collectFiles(targetPath, this.config);

    if (files.length === 0) {
      log.warn("No matching files found.");
      return { findings: [], riskScore: "none", summary: "No files to audit." };
    }

    log.info(`Found ${files.length} file(s) to audit`);
    if (options.verbose) {
      for (const f of files) log.verbose(`  ${f.path}`);
    }

    log.step("🔒 Security agent auditing code...");
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const security = new SecurityAgent(this.llmClient);
    const result = await security.execute({ files, config: this.config }, onToken);
    const securityResult = result.data as SecurityResult;
    this.costTracker.track("Security", result.tokensUsed);

    if (options.verbose) {
      console.error("");
      log.verbose(`Tokens used: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);
    }

    // Filter by severity if specified
    if (options.severity) {
      const levels: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const minLevel = levels[options.severity] ?? 1;
      securityResult.findings = securityResult.findings.filter(
        (f) => (levels[f.severity] ?? 1) >= minLevel
      );
    }

    if (options.json) {
      console.log(formatJson(securityResult));
    } else {
      console.log(formatSecurityResult(securityResult));
    }

    this.printCost(options.json);
    return securityResult;
  }

  async audit(targetPath: string, options: OrchestratorOptions = {}): Promise<AuditResult> {
    const skip = new Set(options.skip ?? []);
    const files = await collectFiles(targetPath, this.config);

    if (files.length === 0) {
      log.warn("No matching files found.");
      return {
        review: { findings: [], summary: "" },
        security: { findings: [], riskScore: "none", summary: "" },
        coder: { improvedFiles: [], summary: "" },
        totalFindings: 0, totalPatches: 0, riskScore: "none", summary: "No files to audit.",
      };
    }

    log.info(`Found ${files.length} file(s) to audit`);
    const onToken = this.createStreamCallback(options.verbose ?? false);
    const context = { files, config: this.config };

    // 1. Plan (optional)
    let planResult: PlanResult | undefined;
    if (!skip.has("plan")) {
      log.step("🧠 Planner agent analyzing codebase...");
      const planner = new PlannerAgent(this.llmClient, options.task);
      const r = await planner.execute(context, onToken);
      planResult = r.data as PlanResult;
      this.costTracker.track("Planner", r.tokensUsed);
      if (options.verbose) { console.error(""); log.verbose(`Planner: ${r.tokensUsed.input} in / ${r.tokensUsed.output} out`); }
    }

    // 2. Review
    log.step("🔍 Reviewer agent analyzing code...");
    const reviewer = new ReviewerAgent(this.llmClient);
    const reviewRaw = await reviewer.execute(context, onToken);
    const reviewResult = reviewRaw.data as ReviewResult;
    this.costTracker.track("Reviewer", reviewRaw.tokensUsed);
    if (options.verbose) { console.error(""); log.verbose(`Reviewer: ${reviewRaw.tokensUsed.input} in / ${reviewRaw.tokensUsed.output} out`); }

    // 3. Security
    log.step("🔒 Security agent auditing code...");
    const security = new SecurityAgent(this.llmClient);
    const securityRaw = await security.execute(context, onToken);
    const securityResult = securityRaw.data as SecurityResult;
    this.costTracker.track("Security", securityRaw.tokensUsed);
    if (options.verbose) { console.error(""); log.verbose(`Security: ${securityRaw.tokensUsed.input} in / ${securityRaw.tokensUsed.output} out`); }

    // 4. Coder (fix review + security findings)
    const combinedFindings = [
      ...reviewResult.findings.map(f => `[${f.severity}] ${f.title}: ${f.description}${f.suggestion ? ` → ${f.suggestion}` : ""}`),
      ...securityResult.findings.map(f => `[${f.severity}] ${f.title}: ${f.description} → ${f.remediation}`),
    ];

    let coderResult: CoderResult = { improvedFiles: [], summary: "No findings to fix." };
    if (combinedFindings.length > 0) {
      log.step("✨ Coder agent generating patches...");
      const coder = new CoderAgent(this.llmClient);
      const coderRaw = await coder.execute({
        ...context,
        previousResults: {
          agentName: "Reviewer+Security",
          success: true,
          data: {
            findings: [...reviewResult.findings, ...securityResult.findings.map(f => ({
              file: f.file, line: f.line, severity: f.severity === "high" ? "critical" as const : f.severity === "low" ? "info" as const : f.severity as "critical" | "warning" | "info",
              category: "security" as const, title: f.title, description: f.description, suggestion: f.remediation,
            }))],
            summary: `${reviewResult.summary} ${securityResult.summary}`,
          },
          rawResponse: "",
          tokensUsed: { input: 0, output: 0 },
        },
      }, onToken);
      coderResult = coderRaw.data as CoderResult;
      this.costTracker.track("Coder", coderRaw.tokensUsed);
      if (options.verbose) { console.error(""); log.verbose(`Coder: ${coderRaw.tokensUsed.input} in / ${coderRaw.tokensUsed.output} out`); }
    }

    // 5. Tester (optional)
    let testResult: TestResult | undefined;
    if (!skip.has("test")) {
      log.step("🧪 Tester agent generating tests...");
      const tester = new TesterAgent(this.llmClient, options.framework ?? "vitest");
      const r = await tester.execute(context, onToken);
      testResult = r.data as TestResult;
      this.costTracker.track("Tester", r.tokensUsed);
      if (options.verbose) { console.error(""); log.verbose(`Tester: ${r.tokensUsed.input} in / ${r.tokensUsed.output} out`); }
    }

    // 6. Docs (optional)
    let docsResult: DocsResult | undefined;
    if (!skip.has("docs")) {
      log.step("📝 Docs agent generating documentation...");
      const docs = new DocsAgent(this.llmClient);
      const r = await docs.execute(context, onToken);
      docsResult = r.data as DocsResult;
      this.costTracker.track("Docs", r.tokensUsed);
      if (options.verbose) { console.error(""); log.verbose(`Docs: ${r.tokensUsed.input} in / ${r.tokensUsed.output} out`); }
    }

    // Build audit result
    const totalFindings = reviewResult.findings.length + securityResult.findings.length;
    const totalPatches = coderResult.improvedFiles.reduce((sum, f) => sum + f.patches.length, 0);

    const auditResult: AuditResult = {
      plan: planResult,
      review: reviewResult,
      security: securityResult,
      coder: coderResult,
      tests: testResult,
      docs: docsResult,
      totalFindings,
      totalPatches,
      riskScore: securityResult.riskScore,
      summary: `${totalFindings} findings, ${totalPatches} patches, ${testResult?.testFiles.length ?? 0} test files, ${docsResult?.docs.length ?? 0} docs`,
    };

    if (options.json) {
      console.log(formatJson(auditResult));
    } else {
      // Import and use audit formatter
      const { formatAuditResult } = await import("../utils/formatter.js");
      console.log(formatAuditResult(auditResult));
    }

    // Apply changes if --write
    if (options.write) {
      // Apply patches
      for (const file of coderResult.improvedFiles) {
        const absPath = resolve(file.path);
        if (options.backup) {
          copyFileSync(absPath, absPath + ".bak");
        }
        let content = readFileSync(absPath, "utf-8");
        let applied = 0;
        for (const patch of file.patches) {
          if (content.includes(patch.find)) {
            content = content.replace(patch.find, patch.replace);
            applied++;
          }
        }
        if (applied > 0) {
          writeFileSync(absPath, content, "utf-8");
          log.success(`Patched ${file.path} (${applied}/${file.patches.length})`);
        }
      }
      // Write tests
      if (testResult) {
        for (const file of testResult.testFiles) {
          writeFileSync(resolve(file.path), file.content, "utf-8");
          log.success(`Created ${file.path}`);
        }
      }
      // Write docs
      if (docsResult) {
        for (const doc of docsResult.docs) {
          const absPath = resolve(doc.file);
          if (options.backup) copyFileSync(absPath, absPath + ".bak");
          writeFileSync(absPath, doc.content, "utf-8");
          log.success(`Documented ${doc.file}`);
        }
      }
    } else if (totalPatches > 0 || (testResult?.testFiles.length ?? 0) > 0) {
      log.info("Dry run — use --write to apply all changes to disk.");
    }

    this.printCost(options.json);
    return auditResult;
  }
}
