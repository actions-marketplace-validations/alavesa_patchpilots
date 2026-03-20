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
npx patchpilots review ./src
```

Or install globally:

```bash
npm install -g patchpilots
```

## The Crew

| Agent | Command | What it does |
|-------|---------|--------------|
| 🧠 Planner | `patchpilots plan` | Analyzes codebase and breaks down work into tasks |
| 🔍 Reviewer | `patchpilots review` | Finds bugs, security issues, and code smells |
| ✨ Coder | `patchpilots improve` | Fixes code based on review findings (diff-based patches) |
| 🧪 Tester | `patchpilots test` | Generates unit tests for your source files |
| 📝 Docs | `patchpilots docs` | Generates JSDoc/TSDoc documentation |
| 🔒 Security | `patchpilots security` | OWASP Top 10 audit, secrets detection, auth analysis |
| 🎯 Orchestrator | (coordinates) | Manages the pipeline between agents |

## Quick start

```bash
# Set your API key (get one at https://console.anthropic.com/settings/keys)
# Option 1: Global config (set once, works everywhere)
echo '{"apiKey": "sk-ant-..."}' > ~/.patchpilots.json

# Option 2: Environment variable
export ANTHROPIC_API_KEY=your-key-here

# Review code
npx patchpilots review ./src

# Generate an implementation plan
npx patchpilots plan ./src --task "add authentication"

# Review and fix code
npx patchpilots improve ./src --write

# Generate unit tests
npx patchpilots test ./src --write

# Generate documentation
npx patchpilots docs ./src --write

# Run a security audit
npx patchpilots security ./src
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

### Structured outputs
Every agent response is **guaranteed** to match its Zod schema via JSON schema enforcement. No regex JSON extraction, no prayer-based parsing — the API enforces the schema.

### Adaptive thinking
Agents use Claude's adaptive thinking mode for deeper reasoning. The Reviewer agent thinks through code logic before flagging issues, catching bugs that a surface-level scan would miss.

### Streaming
Responses are streamed in real-time. No hanging on long requests, no timeouts. Use `--verbose` to see thinking progress as it happens.

### Prompt caching
System prompts are cached via Claude's `cache_control` — repeat runs against the same project cost ~90% less on the cached portion.

### Cost tracking
Every run shows a cost summary with per-agent token usage and estimated USD cost.

### Diff-based patches
The Coder agent returns search-and-replace patches instead of full file content, dramatically reducing token usage and enabling fixes on large files.

## Architecture

Every agent extends `BaseAgent<T>` and implements three methods:

```typescript
class MyAgent extends BaseAgent<MyOutputType> {
  getSystemPrompt()          // What the agent's role is
  buildUserMessage(context)  // How to format the input
  getOutputSchema()          // Zod schema — guarantees output shape
}
```

Adding a new agent is one file + three methods. The orchestrator handles coordination, streaming, error handling, and output formatting.

### Error handling

The LLM client uses typed Anthropic SDK exceptions:
- `RateLimitError` — automatic retry with backoff
- `AuthenticationError` — clear message about API key
- `APIError` — surfaced with status code and details

## Tech stack

- TypeScript + Node.js
- Claude API (`@anthropic-ai/sdk`)
- Structured outputs (JSON schema) — guaranteed schema compliance
- Adaptive thinking — deeper code analysis
- Streaming — real-time response delivery
- Diff-based patches — efficient code fixes
- Prompt caching — cost optimization
- Commander (CLI) + Chalk (terminal formatting) + Zod (validation)

## Roadmap

### Done
- [x] 7 AI agents: Planner, Reviewer, Coder, Tester, Docs, Security, Orchestrator
- [x] Structured outputs with Zod schemas
- [x] Adaptive thinking for deeper code analysis
- [x] Streaming with real-time progress
- [x] Prompt caching (~90% cost savings on repeat runs)
- [x] Cost tracking (per-agent token usage and USD estimate)
- [x] Global config (`~/.patchpilots.json`)
- [x] Diff-based Coder output (patches instead of full files)
- [x] Published to npm (`npx patchpilots`)
- [x] HTML, CSS, SCSS, Vue, Svelte file support

### Next up
- [x] **Security agent** — OWASP Top 10, secrets detection, input validation, auth pattern analysis
- [ ] **Parallel file review** — review files in batches instead of one giant prompt
- [ ] **GitHub Action** — auto-review PRs and post findings as comments
- [x] **`patchpilots audit`** — full pipeline: plan → review → security → improve → test → docs in one command
- [ ] **Smart model routing** — Haiku for Docs/Tester, Sonnet for Reviewer/Coder
- [ ] **Designer agent** — generate CSS, design tokens, and component markup

## License

MIT
