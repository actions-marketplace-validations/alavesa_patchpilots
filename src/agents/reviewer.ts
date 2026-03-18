import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext } from "../types/index.js";
import type { ReviewResult } from "../types/review.js";

const reviewResultSchema = z.object({
  findings: z.array(
    z.object({
      file: z.string(),
      line: z.number().optional(),
      severity: z.enum(["critical", "warning", "info"]),
      category: z.enum(["bug", "security", "performance", "code-smell", "style"]),
      title: z.string(),
      description: z.string(),
      suggestion: z.string().optional(),
    })
  ),
  summary: z.string(),
});

export class ReviewerAgent extends BaseAgent {
  readonly name = "Reviewer";
  readonly description = "Finds bugs, code smells, security issues, and performance problems";

  protected getSystemPrompt(): string {
    return `You are a senior code reviewer with expertise in software security, performance, and best practices.

Your job is to review code and find issues. For each issue, classify it by:
- **severity**: "critical" (bugs, security holes), "warning" (code smells, performance), or "info" (style, minor improvements)
- **category**: "bug", "security", "performance", "code-smell", or "style"

Be specific:
- Reference exact file names and line numbers when possible
- Explain WHY something is a problem, not just WHAT
- Provide actionable suggestions

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "warning",
      "category": "code-smell",
      "title": "Short title of the issue",
      "description": "Detailed explanation of the problem",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Brief overall assessment"
}

If the code looks good, return an empty findings array with a positive summary.`;
  }

  protected buildUserMessage(context: AgentContext): string {
    const parts = ["Please review the following code files:\n"];

    for (const file of context.files) {
      parts.push(`## File: ${file.path} (${file.language})`);
      parts.push("```" + file.language);
      parts.push(file.content);
      parts.push("```\n");
    }

    return parts.join("\n");
  }

  protected parseResponse(raw: string): ReviewResult {
    const jsonStr = this.extractJson(raw);
    return reviewResultSchema.parse(JSON.parse(jsonStr));
  }
}
