import { writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { LLMClient } from "./llm-client.js";
import { ReviewerAgent } from "../agents/reviewer.js";
import { CoderAgent } from "../agents/coder.js";
import { TesterAgent } from "../agents/tester.js";
import { PlannerAgent } from "../agents/planner.js";
import { DocsAgent } from "../agents/docs.js";
import { collectFiles } from "../utils/files.js";
import { formatReviewResult, formatCoderResult, formatTestResult, formatPlanResult, formatDocsResult, formatJson } from "../utils/formatter.js";
import { log } from "../utils/logger.js";
import type { PatchPilotsConfig } from "../types/index.js";
import type { ReviewResult, CoderResult, TestResult, PlanResult, DocsResult } from "../types/review.js";

export interface OrchestratorOptions {
  json?: boolean;
  verbose?: boolean;
  write?: boolean;
  backup?: boolean;
  severity?: string;
  framework?: string;
  task?: string;
}

export class Orchestrator {
  private llmClient: LLMClient;
  private config: PatchPilotsConfig;

  constructor(config: PatchPilotsConfig) {
    this.config = config;
    this.llmClient = new LLMClient(config.apiKey, config.model);
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

    if (options.verbose) {
      console.error(""); // newline after dots
      log.verbose(`Tokens used: ${coderResultRaw.tokensUsed.input} in / ${coderResultRaw.tokensUsed.output} out`);
    }

    if (options.json) {
      console.log(formatJson({ review: reviewResult, improvements: coderResult }));
    } else {
      console.log(formatCoderResult(coderResult));
    }

    // Write files if requested
    if (options.write && coderResult.improvedFiles.length > 0) {
      for (const file of coderResult.improvedFiles) {
        const absPath = resolve(file.path);
        if (options.backup) {
          copyFileSync(absPath, absPath + ".bak");
          log.verbose(`Backed up ${file.path} → ${file.path}.bak`);
        }
        writeFileSync(absPath, file.improved, "utf-8");
        log.success(`Updated ${file.path}`);
      }
    } else if (!options.write && coderResult.improvedFiles.length > 0) {
      log.info("Dry run — use --write to apply changes to disk.");
    }

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

    if (options.verbose) {
      console.error("");
      log.verbose(`Tokens used: ${result.tokensUsed.input} in / ${result.tokensUsed.output} out`);
    }

    if (options.json) {
      console.log(formatJson(planResult));
    } else {
      console.log(formatPlanResult(planResult));
    }

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

    return docsResult;
  }
}
