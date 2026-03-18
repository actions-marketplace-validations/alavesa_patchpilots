import chalk from "chalk";

let verboseMode = false;

export function setVerbose(enabled: boolean): void {
  verboseMode = enabled;
}

export const log = {
  info(message: string): void {
    console.log(chalk.blue("ℹ"), message);
  },
  success(message: string): void {
    console.log(chalk.green("✓"), message);
  },
  warn(message: string): void {
    console.log(chalk.yellow("⚠"), message);
  },
  error(message: string): void {
    console.error(chalk.red("✗"), message);
  },
  verbose(message: string): void {
    if (verboseMode) {
      console.log(chalk.gray("→"), chalk.gray(message));
    }
  },
  step(message: string): void {
    console.log(chalk.cyan("●"), message);
  },
};
