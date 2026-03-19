# PatchPilots

A team of AI agents that reviews and improves your code automatically.

```
         ○      ○      ○      ○      ○      ○
        /|\    /|\    /|\    /|\    /|\    /|\
        / \    / \    / \    / \    / \    / \
         🧠      🔍      ✨      🧪      📝      🎯
      Planner Reviewer Coder  Tester  Docs  Orchestrator

    ____        __       __    ____  _ __      __
   / __ \____ _/ /______/ /_  / __ \(_) /___  / /______
  / /_/ / __ `/ __/ ___/ __ \/ /_/ / / / __ \/ __/ ___/
 / ____/ /_/ / /_/ /__/ / / / ____/ / / /_/ / /_(__  )
/_/    \__,_/\__/\___/_/ /_/_/   /_/_/\____/\__/____/

        ○      ○      ○      ○      ○      ○
       /|\    /|\    /|\    /|\    /|\    /|\
       / \    / \    / \    / \    / \    / \

    Your code crew is ready. One dev. Six agents. Zero bugs.
```

**One dev. Six AI agents. Zero excuses.**

Built for solo developers and hobby projects — when you don't have a team to review your PRs, PatchPilots is your crew.

## The Crew

| Agent | Command | What it does |
|-------|---------|--------------|
| 🧠 Planner | `patchpilots plan` | Analyzes codebase and breaks down work into tasks |
| 🔍 Reviewer | `patchpilots review` | Finds bugs, security issues, and code smells |
| ✨ Coder | `patchpilots improve` | Rewrites and fixes code based on review findings |
| 🧪 Tester | `patchpilots test` | Generates unit tests for your source files |
| 📝 Docs | `patchpilots docs` | Generates JSDoc/TSDoc documentation |
| 🎯 Orchestrator | (coordinates) | Manages the pipeline between agents |

## Quick start

```bash
# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY=your-key-here

# Review code
npx tsx bin/patchpilots.ts review ./src

# Generate an implementation plan
npx tsx bin/patchpilots.ts plan ./src --task "add authentication"

# Review and improve code
npx tsx bin/patchpilots.ts improve ./src

# Generate unit tests
npx tsx bin/patchpilots.ts test ./src

# Generate documentation
npx tsx bin/patchpilots.ts docs ./src

# Apply any changes to disk
npx tsx bin/patchpilots.ts improve ./src --write
npx tsx bin/patchpilots.ts test ./src --write
npx tsx bin/patchpilots.ts docs ./src --write
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

Reviews code and then generates improved versions with fixes applied.

All `review` options plus:

| Option | Description |
|--------|-------------|
| `--write` | Write improved files to disk (default: dry-run) |
| `--backup` | Create `.bak` files before overwriting |

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

## Configuration

Create a `.patchpilots.json` in your project root:

```json
{
  "model": "claude-sonnet-4-6",
  "maxTokens": 16000,
  "temperature": 0.3,
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["node_modules/**", "dist/**"],
  "maxFileSize": 100000,
  "maxFiles": 20
}
```

Or set your API key **once globally** so it works for every project:

```bash
echo '{"apiKey": "sk-ant-..."}' > ~/.patchpilots.json
```

Or per-project via `.patchpilots.json` in your project root, or via environment variable:

```bash
export ANTHROPIC_API_KEY=your-key-here
```

Config resolution order: CLI flags > project `.patchpilots.json` > global `~/.patchpilots.json` > `ANTHROPIC_API_KEY` env var.

## Powered by Claude API

PatchPilots uses three key features of the Claude API:

### Structured outputs
Every agent response is **guaranteed** to match its Zod schema via `zodOutputFormat`. No regex JSON extraction, no prayer-based parsing — the API enforces the schema.

### Adaptive thinking
Agents use Claude's adaptive thinking mode for deeper reasoning. The Reviewer agent thinks through code logic before flagging issues, catching bugs that a surface-level scan would miss.

### Streaming
Responses are streamed in real-time. No hanging on long requests, no timeouts. Use `--verbose` to see thinking progress as it happens.

### Prompt caching
System prompts are cached via Claude's `cache_control` — repeat runs against the same project cost ~90% less on the cached portion.

### Cost tracking
Every run shows a cost summary with per-agent token usage and estimated USD cost.

## Architecture

PatchPilots uses a clean agent abstraction. Every agent extends `BaseAgent<T>` and implements three methods:

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
- Claude API (`@anthropic-ai/sdk` v0.79.0)
- Structured outputs (`zodOutputFormat`) — guaranteed schema compliance
- Adaptive thinking — deeper code analysis
- Streaming — real-time response delivery
- Commander (CLI)
- Chalk (terminal formatting)
- Zod (schema definition + validation)

## Status

This is an MVP — actively being built in public. Follow along for updates.

## Roadmap

### Done
- [x] 6 AI agents: Planner, Reviewer, Coder, Tester, Docs, Orchestrator
- [x] Structured outputs with Zod schemas — guaranteed valid responses
- [x] Adaptive thinking for deeper code analysis
- [x] Streaming — real-time response delivery
- [x] Prompt caching — ~90% cost savings on repeat runs
- [x] Cost tracking — per-agent token usage and USD estimate after every run
- [x] Global config (`~/.patchpilots.json`) — set API key once for all projects

### Next up
- [ ] **Diff-based Coder output** — return patches instead of full files (fixes token limit on large files)
- [ ] **npm publish** — `npx patchpilots review ./src` from anywhere
- [ ] **Parallel file review** — review files in batches instead of one giant prompt
- [ ] **GitHub Action** — auto-review PRs and post findings as comments
- [ ] **`patchpilots audit`** — full pipeline: plan → review → improve → test → docs in one command
- [ ] **Smart model routing** — Haiku for Docs/Tester, Sonnet for Reviewer/Coder
- [ ] **HTML/CSS support** — review static sites and stylesheets
- [ ] **Designer agent** — generate CSS, design tokens, and component markup

## License

MIT
