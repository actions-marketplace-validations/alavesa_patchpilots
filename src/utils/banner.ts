import chalk from "chalk";

const FRAMES = [
  // Frame 1: Just you
  `
                         ${chalk.cyan("○")}
                        ${chalk.cyan("/|\\")}
                        ${chalk.cyan("/ \\")}
                    ${chalk.gray("just me...")}
  `,

  // Frame 2: Starting to split
  `
                      ${chalk.cyan("○")}   ${chalk.cyan("○")}
                     ${chalk.cyan("/|\\")} ${chalk.cyan("/|\\")}
                     ${chalk.cyan("/ \\")} ${chalk.cyan("/ \\")}
                   ${chalk.gray("wait... there's two")}
  `,

  // Frame 3: More clones appearing
  `
                 ${chalk.cyan("○")}   ${chalk.cyan("○")}   ${chalk.cyan("○")}
                ${chalk.cyan("/|\\")} ${chalk.cyan("/|\\")} ${chalk.cyan("/|\\")}
                ${chalk.cyan("/ \\")} ${chalk.cyan("/ \\")} ${chalk.cyan("/ \\")}
                 ${chalk.gray("we're multiplying!")}
  `,

  // Frame 4: Full crew assembled with roles
  `
     ${chalk.yellow("○")}      ${chalk.magenta("○")}      ${chalk.green("○")}      ${chalk.blue("○")}      ${chalk.red("○")}      ${chalk.white("○")}    ${chalk.hex("#FF69B4")("○")}      ${chalk.cyan("○")}
    ${chalk.yellow("/|\\")}    ${chalk.magenta("/|\\")}    ${chalk.green("/|\\")}    ${chalk.blue("/|\\")}    ${chalk.red("/|\\")}    ${chalk.white("/|\\")}   ${chalk.hex("#FF69B4")("/|\\")}    ${chalk.cyan("/|\\")}
    ${chalk.yellow("/ \\")}    ${chalk.magenta("/ \\")}    ${chalk.green("/ \\")}    ${chalk.blue("/ \\")}    ${chalk.red("/ \\")}    ${chalk.white("/ \\")}   ${chalk.hex("#FF69B4")("/ \\")}    ${chalk.cyan("/ \\")}
     ${chalk.yellow("🧠")}      ${chalk.magenta("🔍")}      ${chalk.green("✨")}      ${chalk.blue("🧪")}      ${chalk.red("📝")}      ${chalk.white("🔒")}     ${chalk.hex("#FF69B4")("🎨")}      ${chalk.cyan("🎯")}
  ${chalk.yellow("Planner")} ${chalk.magenta("Reviewer")}  ${chalk.green("Coder")}   ${chalk.blue("Tester")}   ${chalk.red("Docs")}  ${chalk.white("Security")} ${chalk.hex("#FF69B4")("Designer")} ${chalk.cyan("Orchestrator")}
  `,

  // Frame 5: Final banner
  `
${chalk.bold.cyan(`
    ____        __       __    ____  _ __      __
   / __ \\____ _/ /______/ /_  / __ \\(_) /___  / /______
  / /_/ / __ \`/ __/ ___/ __ \\/ /_/ / / / __ \\/ __/ ___/
 / ____/ /_/ / /_/ /__/ / / / ____/ / / /_/ / /_(__  )
/_/    \\__,_/\\__/\\___/_/ /_/_/   /_/_/\\____/\\__/____/
`)}
     ${chalk.yellow("○")}      ${chalk.magenta("○")}      ${chalk.green("○")}      ${chalk.blue("○")}      ${chalk.red("○")}      ${chalk.white("○")}    ${chalk.hex("#FF69B4")("○")}      ${chalk.cyan("○")}
    ${chalk.yellow("/|\\")}    ${chalk.magenta("/|\\")}    ${chalk.green("/|\\")}    ${chalk.blue("/|\\")}    ${chalk.red("/|\\")}    ${chalk.white("/|\\")}   ${chalk.hex("#FF69B4")("/|\\")}    ${chalk.cyan("/|\\")}
    ${chalk.yellow("/ \\")}    ${chalk.magenta("/ \\")}    ${chalk.green("/ \\")}    ${chalk.blue("/ \\")}    ${chalk.red("/ \\")}    ${chalk.white("/ \\")}   ${chalk.hex("#FF69B4")("/ \\")}    ${chalk.cyan("/ \\")}

    ${chalk.gray("Your code crew is ready.")} ${chalk.bold("One dev. Eight agents. Zero bugs.")}
  `,
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function playBanner(): Promise<void> {
  for (let i = 0; i < FRAMES.length; i++) {
    // Clear previous frame (except first)
    if (i > 0) {
      const prevLines = FRAMES[i - 1].split("\n").length;
      process.stdout.write(`\x1b[${prevLines}A\x1b[0J`);
    }

    console.log(FRAMES[i]);
    await sleep(i === FRAMES.length - 1 ? 0 : 800);
  }
}

export function printBannerStatic(): void {
  console.log(FRAMES[FRAMES.length - 1]);
}
