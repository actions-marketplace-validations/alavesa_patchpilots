import chalk from "chalk";

let verboseMode = false;

export function setVerbose(enabled: boolean): void {
  verboseMode = enabled;
}

// All output goes to stderr intentionally so stdout remains clean for machine-readable output (--json flag).
export const log = {
  info(message: string): void {
    console.error(chalk.blue("ℹ"), message);
  },
  success(message: string): void {
    console.error(chalk.green("✓"), message);
  },
  warn(message: string): void {
    console.error(chalk.yellow("⚠"), message);
  },
  error(message: string): void {
    console.error(chalk.red("✗"), message);
  },
  verbose(message: string): void {
    if (verboseMode) {
      console.error(chalk.gray("→"), chalk.gray(message));
    }
  },
  step(message: string): void {
    console.error(chalk.cyan("●"), message);
  },
};
