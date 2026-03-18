import type { Command } from "commander";
import { loadConfig } from "../../core/config.js";
import { Orchestrator } from "../../core/orchestrator.js";
import { setVerbose } from "../../utils/logger.js";
import { log } from "../../utils/logger.js";
import { playBanner } from "../../utils/banner.js";

export function registerDocsCommand(program: Command): void {
  program
    .command("docs <path>")
    .description("Generate documentation for source files")
    .option("-m, --model <model>", "Claude model to use")
    .option("-c, --config <path>", "Path to config file")
    .option("--json", "Output raw JSON", false)
    .option("--verbose", "Show token usage and timing", false)
    .option("--write", "Write documented files to disk", false)
    .option("--backup", "Create .bak files before overwriting", false)
    .action(async (targetPath: string, opts) => {
      try {
        if (!opts.json) await playBanner();
        if (opts.verbose) setVerbose(true);

        const config = loadConfig(targetPath, {
          model: opts.model,
          config: opts.config,
        });

        const orchestrator = new Orchestrator(config);
        await orchestrator.generateDocs(targetPath, {
          json: opts.json,
          verbose: opts.verbose,
          write: opts.write,
          backup: opts.backup,
        });
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
