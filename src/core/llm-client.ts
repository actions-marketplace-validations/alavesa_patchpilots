import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { log } from "../utils/logger.js";

export interface LLMResponse<T = string> {
  data: T;
  usage: { input: number; output: number };
}

export interface ChatOptions {
  maxTokens: number;
  temperature: number;
  model?: string;
}

export class LLMClient {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }

  async chatStructured<T>(
    systemPrompt: string,
    userMessage: string,
    schema: z.ZodType<T>,
    options: ChatOptions,
    onToken?: (text: string) => void,
  ): Promise<LLMResponse<T>> {
    const model = options.model ?? this.defaultModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(schema as any);

    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: options.maxTokens,
        temperature: 1,
        thinking: { type: "adaptive" },
        system: [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }],
        messages: [{ role: "user", content: userMessage }],
        output_config: {
          format: {
            type: "json_schema" as const,
            schema: jsonSchema as Record<string, unknown>,
          },
        },
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          if (event.delta.type === "thinking_delta" && onToken) {
            onToken(event.delta.thinking);
          } else if (event.delta.type === "text_delta" && onToken) {
            onToken(event.delta.text);
          }
        }
      }

      const finalMessage = await stream.finalMessage();

      const text = finalMessage.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const parsed = schema.parse(JSON.parse(text));

      return {
        data: parsed,
        usage: {
          input: finalMessage.usage.input_tokens,
          output: finalMessage.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        log.warn("Rate limited — waiting 10s before retry...");
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        return this.chatStructured(systemPrompt, userMessage, schema, options, onToken);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error("Invalid API key. Check your ANTHROPIC_API_KEY.");
      }
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API error (${error.status}): ${error.message}`);
      }
      throw error;
    }
  }
}
