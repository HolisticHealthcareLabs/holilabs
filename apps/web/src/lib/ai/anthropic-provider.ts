import Anthropic from "@anthropic-ai/sdk";
import { AIProvider } from "./provider-interface";

export class AnthropicProvider implements AIProvider {
    private anthropic: Anthropic;
    private model: string;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("Anthropic API Key is required");
        }
        this.anthropic = new Anthropic({
            apiKey: apiKey,
        });
        // Defaulting to Claude 3.5 Sonnet for balance of speed/intelligence
        this.model = "claude-3-5-sonnet-20240620";
    }

    async generateResponse(prompt: string, context?: any): Promise<string> {
        try {
            const msg = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }],
            });

            const textBlock = msg.content.find(c => c.type === 'text');
            if (textBlock && 'text' in textBlock) {
                return textBlock.text;
            }
            return "";
        } catch (error) {
            console.error("Error generating response with Anthropic:", error);
            throw error;
        }
    }
}
