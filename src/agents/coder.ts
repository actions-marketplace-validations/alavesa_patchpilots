import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext } from "../types/index.js";
import type { CoderResult, ReviewResult } from "../types/review.js";

const coderResultSchema = z.object({
  improvedFiles: z.array(
    z.object({
      path: z.string(),
      original: z.string(),
      improved: z.string(),
      changes: z.array(z.string()),
    })
  ),
  summary: z.string(),
});

export class CoderAgent extends BaseAgent {
  readonly name = "Coder";
  readonly description = "Rewrites and improves code based on review findings";

  protected getSystemPrompt(): string {
    return `You are a senior software developer. You receive code files along with review findings, and your job is to fix the identified issues.

Rules:
- Only change what the review identified — do not refactor unrelated code
- Preserve the original code style (indentation, naming conventions, etc.)
- Make minimal, targeted changes
- Explain each change concisely

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{
  "improvedFiles": [
    {
      "path": "path/to/file.ts",
      "original": "full original file content",
      "improved": "full improved file content",
      "changes": ["Description of change 1", "Description of change 2"]
    }
  ],
  "summary": "Brief summary of all improvements made"
}

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

  protected parseResponse(raw: string): CoderResult {
    const jsonStr = this.extractJson(raw);
    return coderResultSchema.parse(JSON.parse(jsonStr));
  }
}
