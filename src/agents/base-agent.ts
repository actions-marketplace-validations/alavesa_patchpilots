import type { LLMClient } from "../core/llm-client.js";
import type { AgentContext, AgentResult } from "../types/index.js";

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;

  constructor(protected llmClient: LLMClient) {}

  protected abstract getSystemPrompt(): string;
  protected abstract buildUserMessage(context: AgentContext): string;
  protected abstract parseResponse(raw: string): unknown;

  async execute(context: AgentContext): Promise<AgentResult> {
    const systemPrompt = this.getSystemPrompt();
    const userMessage = this.buildUserMessage(context);

    const response = await this.llmClient.chat(systemPrompt, userMessage, {
      maxTokens: context.config.maxTokens,
      temperature: context.config.temperature,
    });

    const data = this.parseResponse(response.text);

    return {
      agentName: this.name,
      success: true,
      data,
      rawResponse: response.text,
      tokensUsed: response.usage,
    };
  }

  protected extractJson(text: string): string {
    // Try to extract JSON from markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) return fenceMatch[1].trim();

    // Try to find raw JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];

    throw new Error(`Could not extract JSON from response:\n${text.slice(0, 200)}`);
  }
}
