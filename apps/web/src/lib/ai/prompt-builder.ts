import { anonymizePatientData } from "../presidio";

export class PromptBuilder {
    /**
     * Constructs a secure, de-identified prompt for the AI.
     * Automatically strips PII from patient data before including it in the prompt.
     * 
     * @param instruction The clinical task (e.g., "Summarize this note", "Suggest diagnosis")
     * @param patientData The raw patient data containing potential PII
     * @param context Optional additional context
     */
    static async buildClinicalPrompt(
        instruction: string,
        patientData: string,
        context?: string
    ): Promise<string> {
        // 1. De-identify patient data
        // This is the CRITICAL security step
        const safeData = await anonymizePatientData(patientData);

        // 2. Construct the prompt
        return `
You are an expert clinical assistant. 
Your task is to: ${instruction}

Patient Data (De-identified):
---
${safeData}
---

${context ? `Additional Context:\n${context}` : ""}

Instructions:
- Do not attempt to re-identify the patient.
- Provide a professional, concise clinical response.
- If the data is insufficient, state that clearly.
`;
    }
}
