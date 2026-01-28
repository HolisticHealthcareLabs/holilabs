import { prisma } from '@/lib/prisma';

/**
 * Seeds demo governance data for the Mission Control dashboard
 * Run with: npx tsx prisma/seed-governance.ts
 */
async function seedGovernanceData() {
    console.log('🔐 Seeding Governance Demo Data...\n');

    // Get demo clinician
    const clinician = await prisma.user.findFirst({
        where: { email: 'demo-clinician@holilabs.xyz' }
    });

    // Get demo patient
    const patient = await prisma.patient.findFirst({
        where: { mrn: 'MRN-DEMO-2024' }
    });

    if (!clinician || !patient) {
        console.log('❌ Demo clinician or patient not found. Run main seed first.');
        return;
    }

    console.log(`✅ Found clinician: ${clinician.email}`);
    console.log(`✅ Found patient: ${patient.mrn}\n`);

    // Create Interaction Sessions
    const sessions = await Promise.all([
        // Session 1: Clean pass (no issues)
        prisma.interactionSession.create({
            data: {
                userId: clinician.id,
                patientId: patient.id,
                startedAt: new Date(Date.now() - 3600000), // 1 hour ago
                endedAt: new Date(Date.now() - 3300000),
            }
        }),
        // Session 2: Soft nudge
        prisma.interactionSession.create({
            data: {
                userId: clinician.id,
                patientId: patient.id,
                startedAt: new Date(Date.now() - 7200000), // 2 hours ago
                endedAt: new Date(Date.now() - 6900000),
            }
        }),
        // Session 3: Hard block (contraindication caught)
        prisma.interactionSession.create({
            data: {
                userId: clinician.id,
                patientId: patient.id,
                startedAt: new Date(Date.now() - 10800000), // 3 hours ago
                endedAt: new Date(Date.now() - 10500000),
            }
        }),
    ]);

    console.log(`✅ Created ${sessions.length} interaction sessions\n`);

    // Create Governance Logs
    const logs = await Promise.all([
        // Log 1: Clean pass - high safety score
        prisma.governanceLog.create({
            data: {
                sessionId: sessions[0].id,
                inputPrompt: 'Patient reports occasional headaches. Recommending acetaminophen 500mg PRN.',
                rawModelOutput: 'Recommended acetaminophen for mild headache management.',
                safetyScore: 98,
                latencyMs: 145,
                provider: 'gpt-4o-mini',
                timestamp: new Date(Date.now() - 3500000),
            }
        }),
        // Log 2: Clean pass
        prisma.governanceLog.create({
            data: {
                sessionId: sessions[0].id,
                inputPrompt: 'Follow-up on blood pressure. BP 120/80. Continue current regimen.',
                rawModelOutput: 'Blood pressure within normal range. No changes recommended.',
                safetyScore: 100,
                latencyMs: 89,
                provider: 'gpt-4o-mini',
                timestamp: new Date(Date.now() - 3400000),
            }
        }),
        // Log 3: Soft nudge - dosage concern
        prisma.governanceLog.create({
            data: {
                sessionId: sessions[1].id,
                inputPrompt: 'Prescribing metformin 2000mg daily for type 2 diabetes.',
                rawModelOutput: 'Metformin prescription generated. Note: Starting dose typically 500mg.',
                safetyScore: 75,
                latencyMs: 234,
                provider: 'gpt-4o-mini',
                timestamp: new Date(Date.now() - 7000000),
            }
        }),
        // Log 4: Hard block - beta-blocker + asthma
        prisma.governanceLog.create({
            data: {
                sessionId: sessions[2].id,
                inputPrompt: 'Patient with asthma. Considering propranolol 40mg for anxiety.',
                rawModelOutput: 'BLOCKED: Propranolol contraindicated in asthma patients.',
                safetyScore: 15,
                latencyMs: 312,
                provider: 'gpt-4o-mini',
                timestamp: new Date(Date.now() - 10600000),
            }
        }),
        // Log 5: Another clean pass
        prisma.governanceLog.create({
            data: {
                sessionId: sessions[0].id,
                inputPrompt: 'Routine wellness check. All vitals normal. Patient in good health.',
                rawModelOutput: 'Wellness check documented. No concerns identified.',
                safetyScore: 100,
                latencyMs: 67,
                provider: 'gpt-4o-mini',
                timestamp: new Date(Date.now() - 1800000),
            }
        }),
    ]);

    console.log(`✅ Created ${logs.length} governance logs\n`);

    // Create Governance Events
    const events = await Promise.all([
        // Event for log 3: Soft nudge
        prisma.governanceEvent.create({
            data: {
                logId: logs[2].id,
                ruleId: 'DOSAGE_CONCERN',
                ruleName: 'High Starting Dose Alert',
                severity: 'SOFT_NUDGE',
                actionTaken: 'FLAGGED',
                description: 'Starting dose of 2000mg metformin is above typical initial dose. Consider titration. Metformin is typically started at 500mg and titrated up to avoid GI side effects.',
                timestamp: new Date(Date.now() - 7000000),
            }
        }),
        // Event for log 4: Hard block
        prisma.governanceEvent.create({
            data: {
                logId: logs[3].id,
                ruleId: 'CONTRAINDICATION_BETA_BLOCKER_ASTHMA',
                ruleName: 'Beta-Blocker Contraindication',
                severity: 'HARD_BLOCK',
                actionTaken: 'BLOCKED',
                description: 'Non-selective beta-blocker contraindicated in asthma. Risk of bronchospasm. Propranolol is a non-selective beta-blocker that can cause severe bronchospasm in asthma patients. This prescription was blocked.',
                timestamp: new Date(Date.now() - 10600000),
            }
        }),
    ]);

    console.log(`✅ Created ${events.length} governance events\n`);

    console.log('🎉 Governance demo data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${sessions.length} Interaction Sessions`);
    console.log(`   - ${logs.length} Governance Logs`);
    console.log(`   - ${events.length} Governance Events (1 SOFT_NUDGE, 1 HARD_BLOCK)`);
    console.log('\n💡 View at: http://localhost:3000/dashboard/governance');
}

seedGovernanceData()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
