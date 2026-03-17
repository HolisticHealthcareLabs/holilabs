import { RLHFCollector, PatientContext, MedicationContext, EncounterContext } from '../rlhf-collector';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('RLHF Collector - Rejection Taxonomy', () => {
    let collector: RLHFCollector;
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rlhf-test-'));
        collector = new RLHFCollector('test-session', tmpDir);
    });

    afterEach(() => {
        collector.close();
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true });
        }
    });

    test('rejectionCategory can be set on new feedback records', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Aspirin' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        const id = collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 80,
            llmReasoning: 'No issues detected',
            llmLatencyMs: 100,
            doctorAction: 'overridden',
            correctRiskLevel: 'high',
            rejectionCategory: 'CONTRAINDICATION_MISS',
            overrideJustification: 'Patient allergic to salicylates',
        });

        expect(id).toBeTruthy();
    });

    test('rejectionCategory is null for legacy records (backward compat)', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Ibuprofen' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        const id = collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'medium',
            llmConfidence: 70,
            llmReasoning: 'Possible interaction',
            llmLatencyMs: 120,
            doctorAction: 'overridden',
            correctRiskLevel: 'low',
            overrideJustification: 'Clinician discretion',
            // rejectionCategory NOT provided
        });

        expect(id).toBeTruthy();
    });

    test('all 9 category values are accepted', () => {
        const categories = [
            'DOSE_ADJUSTMENT',
            'CONTRAINDICATION_MISS',
            'INTERACTION_MISS',
            'FALSE_POSITIVE',
            'FALSE_NEGATIVE',
            'CONTEXT_ERROR',
            'BILLING_ERROR',
            'REGULATORY_OVERRIDE',
            'CLINICAL_JUDGMENT',
        ];

        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Test Drug' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        categories.forEach((category, idx) => {
            const id = collector.recordFeedback({
                patient,
                medication: { ...medication, genericName: `Drug-${idx}` },
                encounter,
                llmRiskLevel: 'low',
                llmConfidence: 80,
                llmReasoning: 'Test',
                llmLatencyMs: 100,
                doctorAction: 'overridden',
                correctRiskLevel: 'high',
                rejectionCategory: category as any,
                overrideJustification: `Category: ${category}`,
            });

            expect(id).toBeTruthy();
        });
    });
});
