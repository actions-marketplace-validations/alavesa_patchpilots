# PatchPilots

A team of AI agents that reviews and improves your code automatically.

```
         ○      ○      ○      ○      ○      ○
        /|\    /|\    /|\    /|\    /|\    /|\
        / \    / \    / \    / \    / \    / \
         🧠      🔍      ✨      🧪      📝      🎯
      Planner Reviewer Coder  Tester  Docs  Orchestrator
```

**One dev. Six AI agents. Zero excuses.**

Built for solo developers and hobby projects — when you don't have a team to review your PRs, PatchPilots is your crew.

## What it does

PatchPilots is a CLI tool that runs AI-powered agents on your codebase:

- **Reviewer** — finds bugs, security issues, performance problems, and code smells
- **Coder** — rewrites and fixes the issues the Reviewer found
- **Orchestrator** — coordinates the whole pipeline

More agents coming soon: Planner, Tester, and Docs.

## Quick start

```bash
# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY=your-key-here

# Review code
npx tsx bin/patchpilots.ts review ./src

# Review and improve code
npx tsx bin/patchpilots.ts improve ./src

# Apply fixes to disk
npx tsx bin/patchpilots.ts improve ./src --write
```

## CLI commands

### `patchpilots review <path>`

Analyzes your code and reports findings grouped by file, color-coded by severity.

| Option | Description |
|--------|-------------|
| `-m, --model <model>` | Claude model to use |
| `-c, --config <path>` | Path to config file |
| `--severity <level>` | Minimum severity: `critical`, `warning`, `info` |
| `--json` | Output raw JSON |
| `--verbose` | Show token usage and timing |

### `patchpilots improve <path>`

Reviews code and then generates improved versions with fixes applied.

All `review` options plus:

| Option | Description |
|--------|-------------|
| `--write` | Write improved files to disk (default: dry-run) |
| `--backup` | Create `.bak` files before overwriting |

## Configuration

Create a `.patchpilots.json` in your project root:

```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 4096,
  "temperature": 0.3,
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["node_modules/**", "dist/**"],
  "maxFileSize": 100000,
  "maxFiles": 20
}
```

Or set your API key via environment variable:

```bash
export ANTHROPIC_API_KEY=your-key-here
```

## Architecture

PatchPilots uses a clean agent abstraction. Every agent extends `BaseAgent` and implements three methods:

```typescript
class MyAgent extends BaseAgent {
  getSystemPrompt()          // What the agent's role is
  buildUserMessage(context)  // How to format the input
  parseResponse(raw)         // How to parse the LLM output
}
```

Adding a new agent is one file + three methods. The orchestrator handles coordination, error handling, and output.

## Tech stack

- TypeScript + Node.js
- Claude API (`@anthropic-ai/sdk`)
- Commander (CLI)
- Chalk (terminal formatting)
- Zod (LLM output validation)

## Status

This is an MVP — actively being built in public. Follow along for updates.

## License

MIT
