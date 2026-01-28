
import { adversarialAuditor } from '@/services/adversarial-auditor.service';
import { prisma } from '@/lib/prisma';
import { IntegrityRiskLevel, DetectionCategory } from '@/domain/auditor.types';

async function main() {
    console.log('🧪 Testing Adversarial Auditor (Slow Lane)...');

    // 1. Setup Mock Data
    const mockSessionId = `test-audit-${Date.now()}`;

    // Create dummy User/Patient for constraints (Prisma writes fail without them)
    const user = await prisma.user.create({
        data: {
            email: `dr.audit.${Date.now()}@holilabs.dev`,
            firstName: 'Audit',
            lastName: 'Tester',
            role: 'PHYSICIAN'
        }
    });

    const patient = await prisma.patient.create({
        data: {
            firstName: 'Audit',
            lastName: 'Patient',
            dateOfBirth: new Date('1990-01-01'),
            mrn: `MRN-AUDIT-${Date.now()}`,
            tokenId: `pt-token-${Date.now()}`
        }
    });

    const scribeSession = await prisma.scribeSession.create({
        data: {
            id: mockSessionId,
            clinicianId: user.id,
            patientId: patient.id,
            status: 'COMPLETED'
        }
    });

    console.log(`✅ Created Mock Session: ${mockSessionId}`);

    // 2. Simulate "Dosage Hallucination"
    const transcript = "Start 5mg Warfarin daily.";
    const note = "Plan: Prescribe 50mg Warfarin daily for anticoagulation.";

    console.log('🚀 Running Audit...');
    const verdict = await adversarialAuditor.auditSession(mockSessionId, transcript, note);

    console.log('🕵️‍♀️ Auditor Verdict:', JSON.stringify(verdict, null, 2));

    // 3. Assertions
    if (verdict.risk_level !== IntegrityRiskLevel.CRITICAL) {
        console.error(`❌ Expected CRITICAL risk, got ${verdict.risk_level}`);
        process.exit(1);
    }

    if (!verdict.categories_detected.includes(DetectionCategory.DOSAGE_ERROR)) {
        console.error(`❌ Expected DOSAGE_ERROR category, got ${verdict.categories_detected}`);
        process.exit(1);
    }

    if (verdict.execution_metadata.latency_ms <= 0) {
        console.error(`❌ Latency should be > 0`);
        process.exit(1);
    }

    // 4. Verify Persistence
    console.log('⏳ Verifying DB persistence...');
    const logs = await prisma.governanceLog.findMany({
        where: {
            session: { scribeSessionId: mockSessionId },
            provider: 'mock-gpt-4-sim'
        },
        include: { events: true }
    });

    if (logs.length === 0) {
        console.error('❌ No GovernanceLog found in DB');
        process.exit(1);
    }

    const log = logs[0];
    console.log('✅ Found Persistence Log:', log.id);

    if (log.events.length === 0) {
        console.error('❌ No GovernanceEvent found for Critical Error');
        process.exit(1);
    }

    console.log('✅ Found Governance Event:', log.events[0]);

    console.log('🎉 SUCCESS: Auditor caught the dosage error!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
