import chalk from "chalk";

const AGENTS = [
  { color: chalk.yellow, emoji: "🧠", name: "Planner" },
  { color: chalk.magenta, emoji: "🔍", name: "Reviewer" },
  { color: chalk.green, emoji: "✨", name: "Coder" },
  { color: chalk.blue, emoji: "🧪", name: "Tester" },
  { color: chalk.red, emoji: "📝", name: "Docs" },
  { color: chalk.white, emoji: "🔒", name: "Security" },
  { color: chalk.hex("#FF69B4"), emoji: "🎨", name: "Designer" },
  { color: chalk.cyan, emoji: "🎯", name: "Orchestrator" },
];

function buildCrewFrame(count: number): string {
  const visible = AGENTS.slice(0, count);
  const gap = "          "; // 10 spaces between figures
  const gap2 = "        "; // 8 spaces between bodies/legs (3-char wide)

  const heads = "      " + visible.map(a => a.color("○")).join(gap);
  const bodies = "     " + visible.map(a => a.color("/|\\")).join(gap2);
  const legs = "     " + visible.map(a => a.color("/ \\")).join(gap2);
  const emojis = "      " + visible.map(a => a.emoji).join(gap);

  // Names: pad each to 11 chars, join with 2 spaces
  const nameStrs = visible.map(a => {
    const padded = a.name.padEnd(11);
    return a.color(padded);
  });
  const names = "  " + nameStrs.join("  ");

  return `
${heads}
${bodies}
${legs}
${emojis}
${names}
  `;
}

const LOGO = chalk.bold.cyan(`
    ____        __       __    ____  _ __      __
   / __ \\____ _/ /______/ /_  / __ \\(_) /___  / /______
  / /_/ / __ \`/ __/ ___/ __ \\/ /_/ / / / __ \\/ __/ ___/
 / ____/ /_/ / /_/ /__/ / / / ____/ / / /_/ / /_(__  )
/_/    \\__,_/\\__/\\___/_/ /_/_/   /_/_/\\____/\\__/____/
`);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearPrev(frame: string): void {
  const lines = frame.split("\n").length;
  process.stdout.write(`\x1b[${lines}A\x1b[0J`);
}

export async function playBanner(): Promise<void> {
  // Frame 1: Solo dev
  const solo = `
                         ${chalk.cyan("○")}
                        ${chalk.cyan("/|\\")}
                        ${chalk.cyan("/ \\")}
                    ${chalk.gray("just me...")}
  `;
  console.log(solo);
  await sleep(600);

  // Frame 2: Agents walk in one by one
  let prevFrame = solo;
  for (let i = 1; i <= AGENTS.length; i++) {
    clearPrev(prevFrame);
    const frame = buildCrewFrame(i);
    console.log(frame);
    prevFrame = frame;
    await sleep(250);
  }

  await sleep(400);

  // Frame 3: Logo drops in
  clearPrev(prevFrame);
  const finalFrame = `${LOGO}
${buildCrewFrame(AGENTS.length)}
    ${chalk.gray("Your code crew is ready.")} ${chalk.bold("One dev. Eight agents. Zero bugs.")}
  `;
  console.log(finalFrame);
}

export function printBannerStatic(): void {
  console.log(`${LOGO}
${buildCrewFrame(AGENTS.length)}
    ${chalk.gray("Your code crew is ready.")} ${chalk.bold("One dev. Eight agents. Zero bugs.")}
  `);
}
