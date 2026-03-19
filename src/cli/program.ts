import { Command } from "commander";
import { registerReviewCommand } from "./commands/review.js";
import { registerImproveCommand } from "./commands/improve.js";
import { registerTestCommand } from "./commands/test.js";
import { registerPlanCommand } from "./commands/plan.js";
import { registerDocsCommand } from "./commands/docs.js";
import { registerSecurityCommand } from "./commands/security.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("patchpilots")
    .description("🎯 A team of AI agents that reviews and improves your code")
    .version("0.1.1");

  registerReviewCommand(program);
  registerImproveCommand(program);
  registerTestCommand(program);
  registerPlanCommand(program);
  registerDocsCommand(program);
  registerSecurityCommand(program);

  return program;
}
