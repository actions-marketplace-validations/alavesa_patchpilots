import type { Command } from "commander";
import { loadConfig } from "../../core/config.js";
import { Orchestrator } from "../../core/orchestrator.js";
import { setVerbose } from "../../utils/logger.js";
import { log } from "../../utils/logger.js";
import { playBanner } from "../../utils/banner.js";

export function registerPlanCommand(program: Command): void {
  program
    .command("plan <path>")
    .description("Analyze codebase and create an implementation plan")
    .option("-m, --model <model>", "Claude model to use")
    .option("-c, --config <path>", "Path to config file")
    .option("-t, --task <description>", "Specific task to plan for")
    .option("--json", "Output raw JSON", false)
    .option("--verbose", "Show token usage and timing", false)
    .action(async (targetPath: string, opts) => {
      try {
        if (!opts.json) await playBanner();
        if (opts.verbose) setVerbose(true);

        const config = loadConfig(targetPath, {
          model: opts.model,
          config: opts.config,
        });

        const orchestrator = new Orchestrator(config);
        await orchestrator.plan(targetPath, {
          json: opts.json,
          verbose: opts.verbose,
          task: opts.task,
        });
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
