
import { governance } from '../src/lib/governance/governance.service';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('🧪 Testing Governance Black Box Logger...');

    // 1. Setup Mock Data
    const mockSessionId = `test-session-${Date.now()}`;
    const mockTransactionId = `tx-${Date.now()}`;

    // We need a dummy ScribeSession for the logger to link to (or it will create an orphan warning, but still work? No, logic tries to find scribeSession first)
    // Actually, looking at code: if interaction doesn't exist, it looks for ScribeSession. If ScribeSession doesn't exist, it logs warning and returns.
    // So we must create a dummy ScribeSession first to test the full flow.

    // Create Dummy User & Patient first? Or use existing seed data?
    // Let's try to create them to be self-contained.
    const user = await prisma.user.create({
        data: {
            email: `dr.test.${Date.now()}@holilabs.dev`,
            firstName: 'Test',
            lastName: 'Doctor',
            role: 'PHYSICIAN'
        }
    });

    const patient = await prisma.patient.create({
        data: {
            firstName: 'Test',
            lastName: 'Patient',
            dateOfBirth: new Date('1980-01-01'),
            mrn: `MRN-${Date.now()}`,
            tokenId: `pt-token-${Date.now()}` // Required field
        }
    });

    const scribeSession = await prisma.scribeSession.create({
        data: {
            id: mockSessionId,
            clinicianId: user.id,
            patientId: patient.id,
            status: 'RECORDING'
        }
    });

    console.log(`✅ Created Mock Scribe Session: ${mockSessionId}`);

    // 2. Trigger the Governance Check (which triggers the async log)
    // We trigger a hard block
    const prompt = "Prescribe Propranolol 10mg";
    const context = {
        patientId: patient.id,
        conditions: ['Asthma'] // This triggers BSTH-001
    };

    console.log('🚀 Triggering Fast Lane Check (Asthma)...');
    const verdict = await governance.checkFastLane(prompt, context, mockSessionId);
    console.log('🕵️‍♀️ Verdict (Asthma):', verdict);

    // Test 2: Penicillin Check
    const prompt2 = "Prescribe Amoxicillin 500mg";
    const context2 = {
        patientId: patient.id,
        conditions: ['Penicillin Allergy']
    };

    console.log('🚀 Triggering Fast Lane Check (Penicillin)...');
    const verdict2 = await governance.checkFastLane(prompt2, context2, mockSessionId);
    console.log('🕵️‍♀️ Verdict (Penicillin):', verdict2);

    const isShadow = process.env.GOVERNANCE_MODE === 'SHADOW';
    const expectedAction = isShadow ? 'PASSED' : 'BLOCKED';

    if (verdict.action !== expectedAction) {
        console.error(`❌ [Asthma] Expected ${expectedAction} action, got:`, verdict.action);
        process.exit(1);
    }
    if (verdict2.action !== expectedAction) {
        console.error(`❌ [Penicillin] Expected ${expectedAction} action, got:`, verdict2.action);
        process.exit(1);
    }

    if (verdict2.ruleId !== 'PCN-002') {
        console.error(`❌ [Penicillin] Expected rule PCN-002, got:`, verdict2.ruleId);
        process.exit(1);
    }

    // 3. Verify Database Persistence (Wait a bit for async)
    console.log('⏳ Waiting for async DB write...');
    await new Promise(r => setTimeout(r, 2000));

    const interaction = await prisma.interactionSession.findFirst({
        where: { scribeSessionId: mockSessionId },
        include: {
            logs: {
                include: {
                    events: true
                }
            }
        }
    });

    if (!interaction) {
        console.error('❌ InteractionSession not found!');
        process.exit(1);
    }

    console.log('✅ InteractionSession found:', interaction.id);

    if (interaction.logs.length === 0) {
        console.error('❌ No Governance Logs found!');
        process.exit(1);
    }

    const log = interaction.logs[0];
    console.log('✅ Governance Log found:', log.id);

    if (log.events.length === 0) {
        console.error('❌ No Governance Events found!');
        process.exit(1);
    }

    const event = log.events[0];
    console.log('✅ Governance Event found:', event);

    const expectedLogAction = isShadow ? 'SHADOW_BLOCK' : 'BLOCKED';

    if (event.severity === 'HARD_BLOCK' && event.ruleId === 'BSTH-001' && event.actionTaken === expectedLogAction) {
        console.log(`🎉 SUCCESS: Black Box recorded the ${expectedLogAction} correctly!`);
    } else {
        console.log('Event details:', JSON.stringify(event, null, 2));
        console.error(`❌ Event data mismatch. Expected action ${expectedLogAction}, got ${event.actionTaken}`);
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
