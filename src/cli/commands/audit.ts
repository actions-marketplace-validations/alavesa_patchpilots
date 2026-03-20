import type { Command } from "commander";
import { loadConfig } from "../../core/config.js";
import { Orchestrator } from "../../core/orchestrator.js";
import { setVerbose } from "../../utils/logger.js";
import { log } from "../../utils/logger.js";
import { playBanner } from "../../utils/banner.js";

export function registerAuditCommand(program: Command): void {
  program
    .command("audit <path>")
    .description("Run all agents: plan → review → security → improve → test → docs")
    .option("-m, --model <model>", "Claude model to use")
    .option("-c, --config <path>", "Path to config file")
    .option("--write", "Apply patches and write tests/docs to disk", false)
    .option("--backup", "Create .bak files before patching", false)
    .option("--skip <agents>", "Skip agents (comma-separated: plan,test,docs)", "")
    .option("--severity <level>", "Minimum severity for review findings", "info")
    .option("--framework <name>", "Test framework to use", "vitest")
    .option("--json", "Output raw JSON", false)
    .option("--verbose", "Show per-agent token usage", false)
    .action(async (targetPath: string, opts) => {
      try {
        if (!opts.json) await playBanner();
        if (opts.verbose) setVerbose(true);

        const config = loadConfig(targetPath, {
          model: opts.model,
          config: opts.config,
        });

        const skip = opts.skip ? opts.skip.split(",").map((s: string) => s.trim()) : [];

        const orchestrator = new Orchestrator(config);
        await orchestrator.audit(targetPath, {
          json: opts.json,
          verbose: opts.verbose,
          write: opts.write,
          backup: opts.backup,
          severity: opts.severity,
          framework: opts.framework,
          skip,
        });
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
