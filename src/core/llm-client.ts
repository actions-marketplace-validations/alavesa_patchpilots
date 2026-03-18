import Anthropic from "@anthropic-ai/sdk";

export interface LLMResponse {
  text: string;
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

  constructor(apiKey: string, defaultModel = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }

  async chat(
    systemPrompt: string,
    userMessage: string,
    options: ChatOptions
  ): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return {
      text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }
}
