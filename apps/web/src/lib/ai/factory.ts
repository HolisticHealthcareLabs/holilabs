import { AIProvider } from "./provider-interface";
import { GeminiProvider } from "./gemini-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { prisma } from "../prisma";
import { decryptPHIWithVersion } from "../security/encryption";

export class AIProviderFactory {
    /**
     * Gets the appropriate AI provider for a user.
     * Checks if the user has a BYOK key configured.
     * Defaults to Gemini (system key) if no BYOK key is found.
     * 
     * @param userId The ID of the user making the request
     * @param preferredProvider Optional preference (e.g., "anthropic", "gemini")
     */
    static async getProvider(userId: string, preferredProvider?: string): Promise<AIProvider> {
        // 1. Check for user-specific API keys
        const userKeys = await prisma.userAPIKey.findMany({
            where: { userId },
        });

        // 2. If user has a preferred provider and a key for it, use it
        if (preferredProvider) {
            const key = userKeys.find(k => k.provider.toLowerCase() === preferredProvider.toLowerCase());
            if (key) {
                try {
                    const decryptedKey = await decryptPHIWithVersion(key.encryptedKey);
                    if (decryptedKey) {
                        return this.createProvider(preferredProvider, decryptedKey);
                    }
                } catch (error) {
                    console.error(`Failed to decrypt key for ${preferredProvider}, falling back to default logic.`, error);
                }
            }
        }

        // 3. If no preference or key not found, check if user has ANY key that matches their preference? 
        // Or just fallback to system default.

        // If user explicitly wanted Anthropic but key failed, we might want to error or fallback.
        // For now, we fallback to system Gemini.

        const systemGeminiKey = process.env.GEMINI_API_KEY;
        if (systemGeminiKey) {
            return new GeminiProvider(systemGeminiKey);
        }

        throw new Error("No AI provider available. System Gemini key is missing and no user key provided.");
    }

    private static createProvider(provider: string, apiKey: string): AIProvider {
        switch (provider.toLowerCase()) {
            case "gemini":
            case "google":
                return new GeminiProvider(apiKey);
            case "anthropic":
            case "claude":
                return new AnthropicProvider(apiKey);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }
}
