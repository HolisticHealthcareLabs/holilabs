import { RLHFCollector, PatientContext, MedicationContext, EncounterContext } from '../rlhf-collector';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('RLHF Collector - DPO Export', () => {
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

    test('exportAsDPOPairs returns only overridden records with ground truth', () => {
        const patient: PatientContext = {
            ageRange: 'adult',
            weightRange: 'normal',
            renalFunction: 'normal',
        };

        const medication: MedicationContext = {
            genericName: 'Aspirin',
            drugClass: 'antiplatelet',
            doseValue: 100,
            doseUnit: 'mg',
            route: 'oral',
        };

        const encounter: EncounterContext = {
            encounterType: 'outpatient',
            specialty: 'cardiology',
        };

        // Record 1: confirmed (should NOT be in DPO export)
        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 85,
            llmReasoning: 'No contraindications detected',
            llmLatencyMs: 150,
            doctorAction: 'confirmed',
        });

        // Record 2: overridden WITH ground truth (should be in DPO)
        collector.recordFeedback({
            patient,
            medication: { ...medication, doseValue: 500 },
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 70,
            llmReasoning: 'Standard dosing assumed',
            llmLatencyMs: 160,
            doctorAction: 'overridden',
            correctRiskLevel: 'high',
            overrideJustification: 'Patient on warfarin - high interaction risk',
        });

        // Record 3: overridden WITHOUT ground truth (should NOT be in DPO)
        collector.recordFeedback({
            patient,
            medication: { ...medication, genericName: 'Ibuprofen' },
            encounter,
            llmRiskLevel: 'medium',
            llmConfidence: 65,
            llmReasoning: 'Possible interaction',
            llmLatencyMs: 140,
            doctorAction: 'overridden',
            overrideJustification: 'Clinician override',
        });

        const dpoExport = collector.exportAsDPOPairs();

        expect(dpoExport.pairCount).toBe(1);
        expect(dpoExport.pairs).toHaveLength(1);
        expect(dpoExport.pairs[0].metadata.drugClass).toBe('antiplatelet');
    });

    test('exportAsDPOPairs with since filter', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Aspirin', drugClass: 'antiplatelet' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        // Record in the past
        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 80,
            llmReasoning: 'test',
            llmLatencyMs: 100,
            doctorAction: 'overridden',
            correctRiskLevel: 'high',
        });

        // Advance time
        const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour later

        const dpoAll = collector.exportAsDPOPairs();
        const dpFuture = collector.exportAsDPOPairs(futureDate);

        expect(dpoAll.pairCount).toBe(1);
        expect(dpFuture.pairCount).toBe(0);
    });

    test('DPO prompt contains NO raw PII', () => {
        const patient: PatientContext = {
            ageRange: 'adult',
            weightRange: 'normal',
            sex: 'male',
            renalFunction: 'moderate_impairment',
            hepaticFunction: 'normal',
        };

        const medication: MedicationContext = {
            genericName: 'Metformin',
            drugClass: 'antidiabetic',
            doseValue: 500,
            doseUnit: 'mg',
            route: 'oral',
        };

        const encounter: EncounterContext = {
            encounterType: 'outpatient',
            specialty: 'endocrinology',
        };

        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 80,
            llmReasoning: 'Standard dosing',
            llmLatencyMs: 120,
            doctorAction: 'overridden',
            correctRiskLevel: 'high',
            overrideJustification: 'Renal impairment detected',
        });

        const dpoExport = collector.exportAsDPOPairs();
        const prompt = dpoExport.pairs[0].prompt;

        // Check that prompt contains NO raw patient identifiers
        expect(prompt).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/); // CPF pattern
        expect(prompt).not.toMatch(/[A-Z]{2}\d{6}/); // RG-like pattern
        // "Patient:" is allowed as a section header; check for raw PII fields
        expect(prompt).not.toMatch(/patient_id|medical_record|mrn|cpf_number|rg_number/i);

        // Check that categorical values ARE present (no PII)
        expect(prompt).toContain('Age: adult');
        expect(prompt).toContain('Weight: normal');
        expect(prompt).toContain('Sex: male');
        expect(prompt).toContain('Renal: moderate_impairment');
        expect(prompt).toContain('Metformin');
        expect(prompt).toContain('antidiabetic');
    });

    test('DPO prompt includes categorical patient context', () => {
        const patient: PatientContext = {
            ageRange: 'geriatric',
            weightRange: 'overweight',
            sex: 'female',
            pregnancyStatus: 'none',
            renalFunction: 'moderate_impairment',
            hepaticFunction: 'mild_impairment',
            comorbidityCategories: ['diabetes', 'hypertension'],
            allergyCategories: ['penicillin'],
        };

        const medication: MedicationContext = {
            genericName: 'Lisinopril',
            drugClass: 'ace_inhibitor',
            doseValue: 10,
            doseUnit: 'mg',
            frequency: 'daily',
            route: 'oral',
            indication: 'hypertension',
        };

        const encounter: EncounterContext = {
            encounterType: 'inpatient',
            specialty: 'cardiology',
            acuityLevel: 'urgent',
        };

        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'medium',
            llmConfidence: 75,
            llmReasoning: 'Possible renal interaction',
            llmLatencyMs: 130,
            doctorAction: 'overridden',
            correctRiskLevel: 'low',
            overrideJustification: 'Appropriate dosing for renal function',
        });

        const dpoExport = collector.exportAsDPOPairs();
        const prompt = dpoExport.pairs[0].prompt;

        expect(prompt).toContain('Age: geriatric');
        expect(prompt).toContain('Weight: overweight');
        expect(prompt).toContain('Sex: female');
        expect(prompt).toContain('Renal: moderate_impairment');
        expect(prompt).toContain('Hepatic: mild_impairment');
        expect(prompt).toContain('Allergies: penicillin');
        expect(prompt).toContain('Comorbidities: diabetes, hypertension');
        expect(prompt).toContain('inpatient');
        expect(prompt).toContain('cardiology');
        expect(prompt).toContain('urgent');
    });

    test('empty dataset returns pairCount=0', () => {
        const dpoExport = collector.exportAsDPOPairs();

        expect(dpoExport.pairCount).toBe(0);
        expect(dpoExport.pairs).toHaveLength(0);
        expect(dpoExport.version).toBe('1.0.0');
        expect(dpoExport.datasetStats.uniqueDrugClasses).toBe(0);
        expect(dpoExport.datasetStats.overriddenRecordCount).toBe(0);
    });
});
