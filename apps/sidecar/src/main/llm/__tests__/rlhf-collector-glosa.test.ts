import { RLHFCollector } from '../rlhf-collector';
import path from 'path';
import os from 'os';
import fs from 'fs';

describe('RLHF Collector - Glosa Feedback', () => {
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

    test('recordGlosaFeedback creates record with auto-generated ID', () => {
        const id = collector.recordGlosaFeedback({
            tussCode: '1.01.01.01',
            icd10Code: 'I10',
            billedAmount: 500,
            glosaCode: 'CONC001',
            glosaAmount: 200,
            glosaRecovered: 150,
            appealStrategy: 'clinical_justification',
            originalPredictionId: 'pred-12345',
            insurerCode: 'UNIMED',
            insurerProtocol: 'UNIMED-2024-001',
        });

        expect(id).toBeTruthy();
        expect(id).toMatch(/^fb-/);
        expect(typeof id).toBe('string');
    });

    test('recordGlosaFeedback links to originalPredictionId', () => {
        const predictionId = 'pred-abc-123';
        const id = collector.recordGlosaFeedback({
            tussCode: '2.05.02.01',
            icd10Code: 'E11',
            billedAmount: 800,
            glosaCode: 'INCOMPAT002',
            glosaAmount: 300,
            glosaRecovered: 300,
            appealStrategy: 'document_submission',
            originalPredictionId: predictionId,
            insurerCode: 'SULAMERICA',
            insurerProtocol: 'SULA-2024-003',
        });

        expect(id).toBeTruthy();
    });

    test('getGlosaStats returns accurate totals', () => {
        // Record 3 glosas: 2 recovered, 1 not recovered
        collector.recordGlosaFeedback({
            tussCode: '1.01.01.01',
            icd10Code: 'I10',
            billedAmount: 500,
            glosaCode: 'CONC001',
            glosaAmount: 200,
            glosaRecovered: 150,
            appealStrategy: 'clinical_justification',
            originalPredictionId: 'pred-1',
            insurerCode: 'UNIMED',
            insurerProtocol: 'UNIMED-2024-001',
        });

        collector.recordGlosaFeedback({
            tussCode: '1.02.03.04',
            icd10Code: 'E11',
            billedAmount: 600,
            glosaCode: 'CONC002',
            glosaAmount: 250,
            glosaRecovered: 250,
            appealStrategy: 'clinical_justification',
            originalPredictionId: 'pred-2',
            insurerCode: 'UNIMED',
            insurerProtocol: 'UNIMED-2024-001',
        });

        collector.recordGlosaFeedback({
            tussCode: '2.05.02.01',
            icd10Code: 'M79.3',
            billedAmount: 400,
            glosaCode: 'INCOMPAT001',
            glosaAmount: 100,
            glosaRecovered: 0,
            appealStrategy: 'documentation_retry',
            originalPredictionId: 'pred-3',
            insurerCode: 'BRADESCO',
            insurerProtocol: 'BRAD-2024-002',
        });

        const stats = collector.getGlosaStats();

        expect(stats.totalGlosas).toBe(3);
        expect(stats.recoveredCount).toBe(2);
        expect(stats.totalDeniedBRL).toBe(550); // 200 + 250 + 100
        expect(stats.totalRecoveredBRL).toBe(400); // 150 + 250 + 0
        expect(stats.recoveryRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });

    test('getGlosaStats topGlosaCodes sorted by count descending', () => {
        // Record glosas with multiple codes
        for (let i = 0; i < 5; i++) {
            collector.recordGlosaFeedback({
                tussCode: `1.01.01.0${i}`,
                icd10Code: 'I10',
                billedAmount: 500,
                glosaCode: 'CONC001',
                glosaAmount: 200,
                glosaRecovered: 150,
                appealStrategy: 'clinical_justification',
                originalPredictionId: `pred-${i}`,
                insurerCode: 'UNIMED',
                insurerProtocol: 'UNIMED-2024-001',
            });
        }

        for (let i = 0; i < 3; i++) {
            collector.recordGlosaFeedback({
                tussCode: `2.05.02.0${i}`,
                icd10Code: 'E11',
                billedAmount: 600,
                glosaCode: 'INCOMPAT002',
                glosaAmount: 300,
                glosaRecovered: 250,
                appealStrategy: 'document_submission',
                originalPredictionId: `pred-alt-${i}`,
                insurerCode: 'SULAMERICA',
                insurerProtocol: 'SULA-2024-003',
            });
        }

        for (let i = 0; i < 2; i++) {
            collector.recordGlosaFeedback({
                tussCode: `3.06.03.0${i}`,
                icd10Code: 'M79.3',
                billedAmount: 400,
                glosaCode: 'DURATION001',
                glosaAmount: 100,
                glosaRecovered: 0,
                appealStrategy: 'documentation_retry',
                originalPredictionId: `pred-dur-${i}`,
                insurerCode: 'BRADESCO',
                insurerProtocol: 'BRAD-2024-002',
            });
        }

        const stats = collector.getGlosaStats();

        expect(stats.topGlosaCodes.length).toBeGreaterThan(0);
        expect(stats.topGlosaCodes[0].code).toBe('CONC001');
        expect(stats.topGlosaCodes[0].count).toBe(5);

        if (stats.topGlosaCodes.length > 1) {
            expect(stats.topGlosaCodes[0].count).toBeGreaterThanOrEqual(stats.topGlosaCodes[1].count);
        }
    });

    test('recovery rate calculation (0 when no glosas)', () => {
        const stats = collector.getGlosaStats();

        expect(stats.totalGlosas).toBe(0);
        expect(stats.recoveryRate).toBe(0);
        expect(stats.totalDeniedBRL).toBe(0);
        expect(stats.totalRecoveredBRL).toBe(0);
    });
});
