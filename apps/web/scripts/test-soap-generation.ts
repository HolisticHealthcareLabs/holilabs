
import { soapGenerator } from '../src/lib/clinical-notes/soap-generator';
import { AIProviderFactory } from '../src/lib/ai/factory';
import { GeminiProvider } from '../src/lib/ai/gemini-provider';
import { PromptBuilder } from '../src/lib/ai/prompt-builder';

// Mock environment variables if needed
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000';

async function main() {
    console.log('🧪 Testing Refactored SOAP Generator...');

    // Mock Clinical Context
    const context = {
        patient: {
            id: 'patient-123',
            mrn: 'MRN-123',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1980-01-01',
            age: 45,
            gender: 'Male',
            deidentifiedName: 'Patient-X',
            deidentifiedDOB: '1980-01-01',
        },
        chiefComplaint: 'Sore throat and fever',
    };

    const transcription = `
    Patient presents with a sore throat that started 2 days ago. 
    He reports fever up to 38.5C. 
    Denies cough or runny nose. 
    On exam, pharynx is erythematous with exudates. 
    Lungs are clear. 
    Assessment is likely strep pharyngitis. 
    Plan is Amoxicillin 500mg tid for 10 days.
  `;

    try {
        // We need to ensure AIProviderFactory returns a working provider.
        // For this test, we might want to mock the provider if we don't want real API calls.
        // But let's try to see if we can use the real one if env vars are set, 
        // or a mock one if not.

        // Mocking AIProviderFactory.getProvider to return a dummy provider if no key
        if (process.env.GEMINI_API_KEY === 'test-key') {
            console.log('⚠️ Using Mock AI Provider (No real API key found)');
            const originalGetProvider = AIProviderFactory.getProvider;
            AIProviderFactory.getProvider = async () => {
                return {
                    generateResponse: async (prompt: string) => {
                        console.log('📝 Mock Provider received prompt length:', prompt.length);
                        return `
**SUBJECTIVE:**
Patient reports sore throat x2 days. Fever 38.5C. No cough/coryza.

**OBJECTIVE:**
Pharynx erythematous w/ exudates. Lungs clear.

**ASSESSMENT:**
Strep pharyngitis.

**PLAN:**
Amoxicillin 500mg TID x10 days.
                    `;
                    }
                };
            };
        }

        console.log('🚀 Generating SOAP note...');
        const result = await soapGenerator.generateFromTranscription(
            transcription,
            context,
            {
                patientId: 'patient-123',
                authorId: 'user-123',
                saveToDatabase: false
            }
        );

        console.log('\n✅ Generation Complete!');
        console.log('-----------------------------------');
        console.log('Subjective:', result.sections.subjective.substring(0, 50) + '...');
        console.log('Objective:', result.sections.objective.substring(0, 50) + '...');
        console.log('Assessment:', result.sections.assessment.substring(0, 50) + '...');
        console.log('Plan:', result.sections.plan.substring(0, 50) + '...');
        console.log('-----------------------------------');
        console.log('Confidence Score:', result.confidence);
        console.log('Status:', result.status);
        console.log('Model Used:', result.metadata.modelUsed);

        if (result.sections.subjective && result.sections.plan) {
            console.log('\n✅ Test PASSED: SOAP sections generated.');
        } else {
            console.error('\n❌ Test FAILED: Missing SOAP sections.');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test FAILED with error:', error);
        process.exit(1);
    }
}

main();
