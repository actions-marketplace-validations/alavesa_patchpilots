import { writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { LLMClient } from "./llm-client.js";
import { ReviewerAgent } from "../agents/reviewer.js";
import { CoderAgent } from "../agents/coder.js";
import { collectFiles } from "../utils/files.js";
import { formatReviewResult, formatCoderResult, formatJson } from "../utils/formatter.js";
import { log } from "../utils/logger.js";
import type { PatchPilotsConfig } from "../types/index.js";
import type { ReviewResult, CoderResult } from "../types/review.js";

export interface OrchestratorOptions {
  json?: boolean;
  verbose?: boolean;
  write?: boolean;
  backup?: boolean;
  severity?: string;
}

export class Orchestrator {
  private llmClient: LLMClient;
  private config: PatchPilotsConfig;

  constructor(config: PatchPilotsConfig) {
    this.config = config;
    this.llmClient = new LLMClient(config.apiKey, config.model);
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
    const reviewer = new ReviewerAgent(this.llmClient);
    const result = await reviewer.execute({ files, config: this.config });
    const reviewResult = result.data as ReviewResult;

    if (options.verbose) {
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
    const files = await collectFiles(targetPath, this.config);
    const coder = new CoderAgent(this.llmClient);
    const coderResultRaw = await coder.execute({
      files,
      config: this.config,
      previousResults: {
        agentName: "Reviewer",
        success: true,
        data: reviewResult,
        rawResponse: "",
        tokensUsed: { input: 0, output: 0 },
      },
    });
    const coderResult = coderResultRaw.data as CoderResult;

    if (options.verbose) {
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
}
