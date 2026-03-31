import type { Command } from "commander";
import { loadConfig } from "../../core/config.js";
import { Orchestrator } from "../../core/orchestrator.js";
import { setVerbose } from "../../utils/logger.js";
import { log } from "../../utils/logger.js";
import { playBanner } from "../../utils/banner.js";

export function registerCustomCommand(program: Command): void {
  program
    .command("custom <agent-name> <path>")
    .description("Run a custom agent defined in .patchpilots.json")
    .option("-m, --model <model>", "Claude model to use")
    .option("-c, --config <path>", "Path to config file")
    .option("--severity <level>", "Minimum severity: critical | warning | info", "info")
    .option("--json", "Output raw JSON", false)
    .option("--verbose", "Show token usage and timing", false)
    .option("--routing", "Smart model routing (Haiku/Sonnet/Opus by complexity)", false)
    .action(async (agentName: string, targetPath: string, opts) => {
      try {
        if (!opts.json) await playBanner();
        if (opts.verbose) setVerbose(true);

        const config = loadConfig(targetPath, {
          model: opts.model,
          config: opts.config,
          routing: opts.routing,
        });

        // List available agents if "list" is passed
        if (agentName === "list") {
          const orchestrator = new Orchestrator(config);
          const agents = orchestrator.listCustomAgents();
          if (agents.length === 0) {
            log.warn("No custom agents defined. Add them to .patchpilots.json under \"customAgents\".");
          } else {
            log.info("Available custom agents:");
            for (const a of agents) console.log(`  🔧 ${a}`);
          }
          return;
        }

        const orchestrator = new Orchestrator(config);
        await orchestrator.runCustomAgent(agentName, targetPath, {
          json: opts.json,
          verbose: opts.verbose,
          severity: opts.severity,
        });
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
