import { generateModelVersionReport, wilsonScoreInterval } from '../model-version-report';
import { RLHFCollector, PatientContext, MedicationContext, EncounterContext } from '../rlhf-collector';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('Model Version Report', () => {
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

    test('generateModelVersionReport populates all ANVISA fields', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Test Drug' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 80,
            llmReasoning: 'No contraindications',
            llmLatencyMs: 100,
            doctorAction: 'confirmed',
        });

        const now = new Date();
        const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const period = { startDate, endDate: now };

        const report = generateModelVersionReport(
            collector,
            'v1.0.0',
            period,
            'deterministic-engine-v2.3.1'
        );

        // ANVISA compliance fields
        expect(report.intendedUse).toBe('Clinical decision support context gathering');
        expect(report.regulatoryClass).toBe('ANVISA Class I - RDC 657/2022');
        expect(report.deterministicEngineVersion).toBe('deterministic-engine-v2.3.1');
        expect(report.llmModelIdentifier).toBe('v1.0.0');
        expect(report.llmUsageScope).toBe(
            'Context gathering and risk stratification only. Final clinical decision made by licensed clinician.'
        );
        expect(report.dataRetentionPolicy).toBe(
            'LGPD Art. 37 — audit records retained for minimum 5 years'
        );
    });

    test('accuracy rate = confirmed / total', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Test Drug' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        // 4 confirmed, 1 overridden = 80% accuracy
        for (let i = 0; i < 4; i++) {
            collector.recordFeedback({
                patient,
                medication: { ...medication, genericName: `Drug-${i}` },
                encounter,
                llmRiskLevel: 'low',
                llmConfidence: 85,
                llmReasoning: 'Safe',
                llmLatencyMs: 100,
                doctorAction: 'confirmed',
            });
        }

        collector.recordFeedback({
            patient,
            medication: { ...medication, genericName: 'Drug-override' },
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 70,
            llmReasoning: 'Assumed safe',
            llmLatencyMs: 120,
            doctorAction: 'overridden',
            correctRiskLevel: 'high',
        });

        const now = new Date();
        const period = { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), endDate: now };
        const report = generateModelVersionReport(collector, 'v1.0.0', period, 'engine-v2');

        expect(report.accuracyRate).toBeCloseTo(80, 1);
        expect(report.totalPredictions).toBe(5);
        expect(report.confirmedCount).toBe(4);
        expect(report.overriddenCount).toBe(1);
    });

    test('adverse event rate = adverseEventCount / total', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Test Drug' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 80,
            llmReasoning: 'Safe',
            llmLatencyMs: 100,
            doctorAction: 'confirmed',
            adverseEventReported: true,
        });

        collector.recordFeedback({
            patient: { ...patient, ageRange: 'pediatric' },
            medication: { ...medication, genericName: 'Drug2' },
            encounter,
            llmRiskLevel: 'medium',
            llmConfidence: 75,
            llmReasoning: 'Possible issue',
            llmLatencyMs: 110,
            doctorAction: 'confirmed',
            adverseEventReported: false,
        });

        const now = new Date();
        const period = { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), endDate: now };
        const report = generateModelVersionReport(collector, 'v1.0.0', period, 'engine-v2');

        expect(report.adverseEventCount).toBe(1);
        expect(report.adverseEventRate).toBeCloseTo(50, 0); // 1/2 = 50%
    });

    test('Wilson score interval produces valid bounds', () => {
        const ci = wilsonScoreInterval(80, 100, 0.95);

        expect(ci.lower).toBeGreaterThanOrEqual(0);
        expect(ci.lower).toBeLessThan(0.8);
        expect(ci.upper).toBeGreaterThan(0.8);
        expect(ci.upper).toBeLessThanOrEqual(1);
        expect(ci.lower).toBeLessThan(ci.upper);
    });

    test('zero predictions produces zero-safe report (no division by zero)', () => {
        const now = new Date();
        const period = { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), endDate: now };
        const report = generateModelVersionReport(collector, 'v1.0.0', period, 'engine-v2');

        expect(report.totalPredictions).toBe(0);
        expect(report.accuracyRate).toBe(0);
        expect(report.adverseEventRate).toBe(0);
        expect(report.confidenceInterval.lower).toBe(0);
        expect(report.confidenceInterval.upper).toBe(1);
        expect(Number.isNaN(report.accuracyRate)).toBe(false);
        expect(Number.isNaN(report.adverseEventRate)).toBe(false);
    });

    test('fixed fields match ANVISA requirements exactly', () => {
        const patient: PatientContext = { ageRange: 'adult' };
        const medication: MedicationContext = { genericName: 'Test Drug' };
        const encounter: EncounterContext = { encounterType: 'outpatient' };

        collector.recordFeedback({
            patient,
            medication,
            encounter,
            llmRiskLevel: 'low',
            llmConfidence: 80,
            llmReasoning: 'Safe',
            llmLatencyMs: 100,
            doctorAction: 'confirmed',
        });

        const now = new Date();
        const period = { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), endDate: now };
        const report = generateModelVersionReport(collector, 'v1.0.0', period, 'engine-v2.3');

        // Verify exact ANVISA strings (no typos, no variations)
        expect(report.intendedUse).toBe('Clinical decision support context gathering');
        expect(report.regulatoryClass).toBe('ANVISA Class I - RDC 657/2022');
        expect(report.llmUsageScope).toContain('Context gathering and risk stratification only');
        expect(report.dataRetentionPolicy).toContain('LGPD Art. 37');
        expect(report.dataRetentionPolicy).toContain('minimum 5 years');
    });
});
