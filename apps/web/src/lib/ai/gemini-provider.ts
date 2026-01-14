import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "./provider-interface";

export class GeminiProvider implements AIProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("Gemini API Key is required");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // using gemini-1.5-flash as default for speed/cost, or pro for reasoning
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async generateResponse(prompt: string, context?: any): Promise<string> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Error generating response with Gemini:", error);
            throw error;
        }
    }
}
