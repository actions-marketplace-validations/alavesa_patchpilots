import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext } from "../types/index.js";
import type { CoderResult, ReviewResult } from "../types/review.js";

const coderResultSchema = z.object({
  improvedFiles: z.array(
    z.object({
      path: z.string(),
      patches: z.array(
        z.object({
          find: z.string(),
          replace: z.string(),
          description: z.string(),
        })
      ),
    })
  ),
  summary: z.string(),
});

export class CoderAgent extends BaseAgent<CoderResult> {
  readonly name = "Coder";
  readonly description = "Rewrites and improves code based on review findings";

  protected getOutputSchema() {
    return coderResultSchema;
  }

  protected getSystemPrompt(): string {
    return `You are a senior software developer. You receive code files along with review findings, and your job is to fix the identified issues.

Rules:
- Only change what the review identified — do not refactor unrelated code
- Preserve the original code style (indentation, naming conventions, etc.)
- Make minimal, targeted changes

Output format: For each file, return an array of search-and-replace patches.
Each patch has:
- "find": the EXACT string to find in the original file (must match uniquely, include enough context)
- "replace": the replacement string
- "description": brief explanation of what the patch does

IMPORTANT:
- The "find" string must be an EXACT match of the original source code including whitespace and indentation
- Include enough surrounding context in "find" to ensure a unique match (at least 2-3 lines)
- Do NOT include the entire file — only the specific lines that need changing with minimal surrounding context
- Each patch should be small and focused on one change

Only include files that actually need changes. If no changes are needed, return an empty improvedFiles array.`;
  }

  protected buildUserMessage(context: AgentContext): string {
    const review = context.previousResults?.data as ReviewResult;
    const parts = ["Here are the code files and the review findings. Please fix the identified issues.\n"];

    parts.push("## Review Findings");
    parts.push("```json");
    parts.push(JSON.stringify(review, null, 2));
    parts.push("```\n");

    parts.push("## Source Files\n");
    for (const file of context.files) {
      parts.push(`### ${file.path} (${file.language})`);
      parts.push("```" + file.language);
      parts.push(file.content);
      parts.push("```\n");
    }

    return parts.join("\n");
  }
}
