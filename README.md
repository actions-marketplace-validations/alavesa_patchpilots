# PatchPilots

[![npm version](https://img.shields.io/npm/v/patchpilots)](https://www.npmjs.com/package/patchpilots)
[![license](https://img.shields.io/npm/l/patchpilots)](https://github.com/alavesa/patchpilots/blob/main/LICENSE)

A team of AI agents that reviews and improves your code automatically.

```
     ○      ○      ○      ○      ○      ○      ○
    /|\    /|\    /|\    /|\    /|\    /|\    /|\
    / \    / \    / \    / \    / \    / \    / \
     🧠      🔍      ✨      🧪      📝      🔒      🎯
  Planner Reviewer  Coder   Tester   Docs  Security Orchestrator

    ____        __       __    ____  _ __      __
   / __ \____ _/ /______/ /_  / __ \(_) /___  / /______
  / /_/ / __ `/ __/ ___/ __ \/ /_/ / / / __ \/ __/ ___/
 / ____/ /_/ / /_/ /__/ / / / ____/ / / /_/ / /_(__  )
/_/    \__,_/\__/\___/_/ /_/_/   /_/_/\____/\__/____/

     ○      ○      ○      ○      ○      ○      ○
    /|\    /|\    /|\    /|\    /|\    /|\    /|\
    / \    / \    / \    / \    / \    / \    / \

    Your code crew is ready. One dev. Seven agents. Zero bugs.
```

**One dev. Seven AI agents. Zero excuses.**

Built for solo developers and hobby projects — when you don't have a team to review your PRs, PatchPilots is your crew.

## Install

```bash
npx patchpilots audit ./src
```

Or install globally:

```bash
npm install -g patchpilots
```

## The Killer Feature

**`patchpilots audit`** — run all 7 agents in one command. No other tool does this.

```bash
npx patchpilots audit ./src --write
```

```
🧠 Planner → 🔍 Reviewer → 🔒 Security → ✨ Coder → 🧪 Tester → 📝 Docs
```

One command gives you: an implementation plan, code review, security audit, auto-fixes, unit tests, and documentation. Skip what you don't need:

```bash
npx patchpilots audit ./src --skip plan,docs --write
```

## The Crew

| Agent | Command | What it does |
|-------|---------|--------------|
| 🎯 Orchestrator | `patchpilots audit` | Runs the full pipeline in one command |
| 🧠 Planner | `patchpilots plan` | Analyzes codebase and breaks down work into tasks |
| 🔍 Reviewer | `patchpilots review` | Finds bugs, security issues, and code smells |
| ✨ Coder | `patchpilots improve` | Fixes code based on review findings (diff-based patches) |
| 🧪 Tester | `patchpilots test` | Generates unit tests for your source files |
| 📝 Docs | `patchpilots docs` | Generates JSDoc/TSDoc documentation |
| 🔒 Security | `patchpilots security` | OWASP Top 10 audit, secrets detection, auth analysis |

## Quick start

```bash
# Set your API key (get one at https://console.anthropic.com/settings/keys)
# Option 1: Global config (set once, works everywhere)
echo '{"apiKey": "sk-ant-..."}' > ~/.patchpilots.json

# Option 2: Environment variable
export ANTHROPIC_API_KEY=your-key-here

# Run the full audit
npx patchpilots audit ./src --write

# Or run individual agents:
npx patchpilots review ./src
npx patchpilots security ./src
npx patchpilots improve ./src --write
npx patchpilots test ./src --write
npx patchpilots docs ./src --write
npx patchpilots plan ./src --task "add authentication"
```

## CLI commands

### `patchpilots audit <path>`

Runs all agents in sequence: plan → review → security → improve → test → docs.

| Option | Description |
|--------|-------------|
| `--write` | Apply patches and write tests/docs to disk |
| `--backup` | Create `.bak` files before patching |
| `--skip <agents>` | Skip agents (comma-separated: `plan,test,docs`) |
| `--severity <level>` | Minimum severity for review findings |
| `--framework <name>` | Test framework (default: `vitest`) |
| `--json` | Output raw JSON |
| `--verbose` | Show per-agent token usage |
| `-m, --model <model>` | Claude model to use |

### `patchpilots review <path>`

Analyzes your code and reports findings grouped by file, color-coded by severity.

| Option | Description |
|--------|-------------|
| `-m, --model <model>` | Claude model to use |
| `-c, --config <path>` | Path to config file |
| `--severity <level>` | Minimum severity: `critical`, `warning`, `info` |
| `--json` | Output raw JSON |
| `--verbose` | Show token usage and thinking progress |

### `patchpilots improve <path>`

Reviews code and generates search-and-replace patches to fix issues.

All `review` options plus:

| Option | Description |
|--------|-------------|
| `--write` | Apply patches to disk (default: dry-run) |
| `--backup` | Create `.bak` files before patching |

### `patchpilots test <path>`

Generates unit tests for source files.

| Option | Description |
|--------|-------------|
| `--write` | Write test files to disk |
| `--framework <name>` | Test framework to use (default: `vitest`) |

### `patchpilots plan <path>`

Analyzes codebase and creates a structured implementation plan.

| Option | Description |
|--------|-------------|
| `-t, --task <description>` | Specific task to plan for |

### `patchpilots docs <path>`

Generates documentation for source files.

| Option | Description |
|--------|-------------|
| `--write` | Write documented files to disk |
| `--backup` | Create `.bak` files before overwriting |

### `patchpilots security <path>`

Runs a security audit focused on OWASP Top 10, secrets detection, and auth patterns.

| Option | Description |
|--------|-------------|
| `--severity <level>` | Minimum severity: `critical`, `high`, `medium`, `low` |
| `--json` | Output raw JSON |
| `--verbose` | Show token usage and timing |

## Configuration

Set your API key **once globally** so it works for every project:

```bash
echo '{"apiKey": "sk-ant-..."}' > ~/.patchpilots.json
```

Or create a per-project `.patchpilots.json`:

```json
{
  "model": "claude-sonnet-4-6",
  "maxTokens": 64000,
  "include": ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx", "**/*.html", "**/*.css"],
  "exclude": ["node_modules/**", "dist/**"],
  "maxFileSize": 100000,
  "maxFiles": 20
}
```

Config resolution order: CLI flags > project `.patchpilots.json` > global `~/.patchpilots.json` > `ANTHROPIC_API_KEY` env var.

### Supported file types

TypeScript, JavaScript, JSX/TSX, Python, Go, Rust, Java, Ruby, PHP, C/C++, C#, Swift, Kotlin, HTML, CSS, SCSS, Vue, Svelte.

## Powered by Claude API

- **Structured outputs** — guaranteed schema compliance via JSON schema enforcement
- **Adaptive thinking** — deeper reasoning catches bugs a surface scan misses
- **Streaming** — real-time response delivery, no timeouts
- **Prompt caching** — ~90% cost savings on repeat runs
- **Cost tracking** — per-agent token usage and USD estimate after every run
- **Diff-based patches** — search-and-replace instead of full files, works on large codebases

## Architecture

Every agent extends `BaseAgent<T>` and implements three methods:

```typescript
class MyAgent extends BaseAgent<MyOutputType> {
  getSystemPrompt()          // What the agent's role is
  buildUserMessage(context)  // How to format the input
  getOutputSchema()          // Zod schema — guarantees output shape
}
```

Adding a new agent is one file + three methods.

## Roadmap

### Done
- [x] 7 AI agents: Planner, Reviewer, Coder, Tester, Docs, Security, Orchestrator
- [x] `patchpilots audit` — full pipeline in one command
- [x] Structured outputs, adaptive thinking, streaming
- [x] Prompt caching + cost tracking
- [x] Diff-based Coder output (patches instead of full files)
- [x] Global config + per-project config
- [x] Published to npm (`npx patchpilots`)
- [x] 18 file types supported

### Next up
- [ ] **GitHub Action** — auto-review PRs and post findings as comments
- [ ] **Parallel file review** — review in batches instead of one giant prompt
- [ ] **Smart model routing** — Haiku for Docs/Tester, Sonnet for Reviewer/Coder
- [ ] **Custom agents** — define your own agents via config
- [ ] **Designer agent** — generate CSS, design tokens, and component markup

## License

MIT
