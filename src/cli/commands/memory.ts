import type { Command } from "commander";
import { loadMemory, formatMemoryStatus } from "../../utils/memory.js";
import { log } from "../../utils/logger.js";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

export function registerMemoryCommand(program: Command): void {
  program
    .command("memory <path>")
    .description("Show or clear project memory from previous runs")
    .option("--clear", "Clear all project memory", false)
    .option("--json", "Output raw JSON", false)
    .action(async (targetPath: string, opts) => {
      try {
        if (opts.clear) {
          const memPath = resolve(targetPath, ".patchpilots-memory.json");
          writeFileSync(memPath, JSON.stringify({
            projectPath: resolve(targetPath),
            lastRun: new Date().toISOString(),
            totalRuns: 0,
            findings: [],
          }, null, 2));
          log.success("Project memory cleared.");
          return;
        }

        const memory = loadMemory(targetPath);

        if (memory.totalRuns === 0) {
          log.info("No project memory yet. Run a review or security audit first.");
          return;
        }

        if (opts.json) {
          console.log(JSON.stringify(memory, null, 2));
        } else {
          console.log(formatMemoryStatus(memory));
        }
      } catch (error) {
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
