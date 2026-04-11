/**
 * HoliLabs Prisma Seed Runner
 *
 * Reads prisma-seed-data.json and inserts demo data into the database.
 * Compatible with `npx prisma db seed` (exports async main function).
 *
 * Usage:
 *   npx tsx sprint5-assets/seed-runner.ts          # Seed data
 *   npx tsx sprint5-assets/seed-runner.ts --clean   # Clear demo data first
 *
 * Idempotent: uses upsert — safe to re-run.
 *
 * @see sprint5-assets/prisma-seed-data.json — source data
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── Load seed data ──────────────────────────────────────────────────────────

const SEED_FILE = path.join(__dirname, 'prisma-seed-data.json');

interface SeedData {
  organizations: Array<{ id: string; name: string; slug: string; cnpj: string; cnes: string; address: string; phone: string; timezone: string }>;
  users: Array<{ id: string; name: string; email: string; role: string; crm?: string; specialty?: string; organizationId: string; preferredAiModel?: string; firstRunCompleted?: boolean }>;
  patients: Array<{ id: string; firstName: string; lastName: string; cpf: string; cns: string; dateOfBirth: string; sex: string; phone: string; email: string; address: string; organizationId: string }>;
  billingCodes: {
    icd10: Array<{ code: string; description: string; category: string; chapter: string }>;
    loinc: Array<{ code: string; component: string; system: string; method: string }>;
    snomed: Array<{ conceptId: string; term: string; semanticTag: string }>;
  };
  encounters: Array<{
    id: string; patientId: string; clinicianId: string; organizationId: string;
    status: string; startTime: string; endTime: string | null; reasonCode: string;
    soapNote: { subjective: string; objective: string; assessment: string; plan: string };
  }>;
  invoices: Array<{
    id: string; patientId: string; encounterId?: string; organizationId: string; createdById: string;
    invoiceNumber: string; status: string; paymentMethod: string;
    dueDate: string; paidAt?: string;
    lineItems: Array<{ description: string; tussCode: string; cbhpmCode: string; icd10Code: string; quantity: number; unitAmount: number; amount: number }>;
  }>;
  conversations: Array<{
    id: string; patientId: string; organizationId: string;
    channelType: string; status: string; lastMessageAt: string;
    messages: Array<{ direction: string; content: string; status: string; createdAt: string; sentById?: string }>;
  }>;
  screeningResults: Array<{
    id: string; patientId: string; clinicianId: string; encounterId?: string;
    instrumentId: string; score: number; severity: string; severityColor: string;
    completedAt: string; responses: Array<{ questionId: string; value: number }>;
    triggeredRules: string[]; note: string;
  }>;
}

function loadSeedData(): SeedData {
  const raw = fs.readFileSync(SEED_FILE, 'utf-8');
  return JSON.parse(raw);
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(emoji: string, msg: string) {
  console.log(`  ${emoji} ${msg}`);
}

// ─── Clean ───────────────────────────────────────────────────────────────────

async function cleanDemoData() {
  console.log('\nCleaning demo data...');
  // Delete in reverse dependency order
  // TODO: holilabsv2 — adjust model names to match your exact Prisma schema
  try {
    await prisma.$executeRaw`DELETE FROM "ScreeningResult" WHERE id LIKE 'scr_%'`;
    log('🗑', 'Screening results cleared');
  } catch { log('⏭', 'ScreeningResult table not found — skipping'); }

  try {
    await prisma.$executeRaw`DELETE FROM "Message" WHERE "conversationId" IN (SELECT id FROM "Conversation" WHERE id LIKE 'conv_%')`;
    await prisma.$executeRaw`DELETE FROM "Conversation" WHERE id LIKE 'conv_%'`;
    log('🗑', 'Conversations + messages cleared');
  } catch { log('⏭', 'Conversation/Message tables not found — skipping'); }

  try {
    await prisma.$executeRaw`DELETE FROM "InvoiceLineItem" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE id LIKE 'inv_%')`;
    await prisma.$executeRaw`DELETE FROM "Invoice" WHERE id LIKE 'inv_%'`;
    log('🗑', 'Invoices + line items cleared');
  } catch { log('⏭', 'Invoice tables not found — skipping'); }

  try {
    await prisma.$executeRaw`DELETE FROM "ClinicalNote" WHERE "encounterId" IN (SELECT id FROM "Encounter" WHERE id LIKE 'enc_%')`;
    await prisma.$executeRaw`DELETE FROM "Encounter" WHERE id LIKE 'enc_%'`;
    log('🗑', 'Encounters + notes cleared');
  } catch { log('⏭', 'Encounter tables not found — skipping'); }

  try {
    await prisma.$executeRaw`DELETE FROM "Patient" WHERE id LIKE 'pat_%'`;
    log('🗑', 'Patients cleared');
  } catch { log('⏭', 'Patient table not found — skipping'); }

  try {
    await prisma.$executeRaw`DELETE FROM "User" WHERE id LIKE 'user_%'`;
    log('🗑', 'Users cleared');
  } catch { log('⏭', 'User table not found — skipping'); }

  try {
    await prisma.$executeRaw`DELETE FROM "Organization" WHERE id LIKE 'org_%'`;
    log('🗑', 'Organizations cleared');
  } catch { log('⏭', 'Organization table not found — skipping'); }

  console.log('  Clean complete.\n');
}

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedOrganizations(orgs: SeedData['organizations']) {
  for (const org of orgs) {
    // TODO: holilabsv2 — adjust field names to match your Organization model
    await prisma.organization.upsert({
      where: { id: org.id },
      update: { name: org.name },
      create: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        // cnpj, cnes, address, phone, timezone may be custom fields
      },
    });
  }
  log('🏥', `Organizations: ${orgs.length} seeded`);
}

async function seedUsers(users: SeedData['users']) {
  for (const user of users) {
    // TODO: holilabsv2 — adjust to your User model. May need hashedPassword for demo login.
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as any,
        // password: await hash('demo-password-123'),
        // organizationId: user.organizationId,
        // preferredAiModel: user.preferredAiModel,
        // firstRunCompleted: user.firstRunCompleted,
      },
    });
  }
  log('👤', `Users: ${users.length} seeded`);
}

async function seedPatients(patients: SeedData['patients']) {
  for (const pat of patients) {
    await prisma.patient.upsert({
      where: { id: pat.id },
      update: { firstName: pat.firstName, lastName: pat.lastName },
      create: {
        id: pat.id,
        firstName: pat.firstName,
        lastName: pat.lastName,
        dateOfBirth: new Date(pat.dateOfBirth),
        sex: pat.sex as any,
        phone: pat.phone,
        email: pat.email,
        // cpf: encrypt(pat.cpf),  // CYRUS: use encryptPHIWithVersion
        // cns: pat.cns,
        // address: pat.address,
        // organizationId: pat.organizationId,
      },
    });
  }
  log('🧑‍⚕️', `Patients: ${patients.length} seeded`);
}

async function seedBillingCodes(codes: SeedData['billingCodes']) {
  // ICD-10
  for (const icd of codes.icd10) {
    try {
      await prisma.iCD10Code.upsert({
        where: { code: icd.code },
        update: { description: icd.description },
        create: { code: icd.code, description: icd.description, category: icd.category, chapter: icd.chapter },
      });
    } catch { /* Model may not exist yet */ }
  }
  log('🏷️', `ICD-10 codes: ${codes.icd10.length} seeded`);

  // LOINC
  for (const loinc of codes.loinc) {
    try {
      await prisma.loincCode.upsert({
        where: { code: loinc.code },
        update: { component: loinc.component },
        create: { code: loinc.code, component: loinc.component, system: loinc.system, method: loinc.method },
      });
    } catch { /* Model may not exist yet */ }
  }
  log('🏷️', `LOINC codes: ${codes.loinc.length} seeded`);

  // SNOMED
  for (const snomed of codes.snomed) {
    try {
      await prisma.snomedConcept.upsert({
        where: { conceptId: snomed.conceptId },
        update: { term: snomed.term },
        create: { conceptId: snomed.conceptId, term: snomed.term, semanticTag: snomed.semanticTag },
      });
    } catch { /* Model may not exist yet */ }
  }
  log('🏷️', `SNOMED concepts: ${codes.snomed.length} seeded`);
}

async function seedEncounters(encounters: SeedData['encounters']) {
  for (const enc of encounters) {
    // TODO: holilabsv2 — adjust to your Encounter + ClinicalNote models
    try {
      await prisma.encounter.upsert({
        where: { id: enc.id },
        update: { status: enc.status as any },
        create: {
          id: enc.id,
          patientId: enc.patientId,
          // clinicianId: enc.clinicianId,
          // organizationId: enc.organizationId,
          status: enc.status as any,
          startTime: new Date(enc.startTime),
          endTime: enc.endTime ? new Date(enc.endTime) : null,
          // reasonCode: enc.reasonCode,
        },
      });

      // Create SOAP note
      if (enc.soapNote) {
        await prisma.clinicalNote.upsert({
          where: { id: `note_${enc.id}` },
          update: {},
          create: {
            id: `note_${enc.id}`,
            encounterId: enc.id,
            patientId: enc.patientId,
            type: 'PROGRESS' as any,
            subjective: enc.soapNote.subjective,
            objective: enc.soapNote.objective,
            assessment: enc.soapNote.assessment,
            plan: enc.soapNote.plan,
            // authorId: enc.clinicianId,
          },
        });
      }
    } catch (e) {
      log('⚠️', `Encounter ${enc.id} skipped: ${(e as Error).message?.slice(0, 60)}`);
    }
  }
  log('📋', `Encounters: ${encounters.length} seeded (with SOAP notes)`);
}

async function seedInvoices(invoices: SeedData['invoices']) {
  for (const inv of invoices) {
    try {
      const totalAmount = inv.lineItems.reduce((sum, li) => sum + li.amount, 0);
      await prisma.invoice.upsert({
        where: { id: inv.id },
        update: { status: inv.status as any },
        create: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          patientId: inv.patientId,
          // encounterId: inv.encounterId,
          // organizationId: inv.organizationId,
          // createdById: inv.createdById,
          status: inv.status as any,
          totalAmount,
          dueDate: new Date(inv.dueDate),
          paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
          // paymentMethod: inv.paymentMethod,
        },
      });

      // Create line items
      for (let i = 0; i < inv.lineItems.length; i++) {
        const li = inv.lineItems[i];
        await prisma.invoiceLineItem.upsert({
          where: { id: `${inv.id}_li_${i}` },
          update: {},
          create: {
            id: `${inv.id}_li_${i}`,
            invoiceId: inv.id,
            description: li.description,
            quantity: li.quantity,
            unitAmount: li.unitAmount,
            amount: li.amount,
            // tussCode: li.tussCode,
            // cbhpmCode: li.cbhpmCode,
            // icd10Code: li.icd10Code,
          },
        });
      }
    } catch (e) {
      log('⚠️', `Invoice ${inv.id} skipped: ${(e as Error).message?.slice(0, 60)}`);
    }
  }
  log('💰', `Invoices: ${invoices.length} seeded (${invoices.reduce((s, i) => s + i.lineItems.length, 0)} line items)`);
}

async function seedConversations(convos: SeedData['conversations']) {
  for (const conv of convos) {
    try {
      await prisma.conversation.upsert({
        where: { id: conv.id },
        update: { lastMessageAt: new Date(conv.lastMessageAt) },
        create: {
          id: conv.id,
          patientId: conv.patientId,
          // organizationId: conv.organizationId,
          // channelType: conv.channelType,
          status: conv.status as any,
          lastMessageAt: new Date(conv.lastMessageAt),
        },
      });

      for (let i = 0; i < conv.messages.length; i++) {
        const msg = conv.messages[i];
        await prisma.message.upsert({
          where: { id: `${conv.id}_msg_${i}` },
          update: {},
          create: {
            id: `${conv.id}_msg_${i}`,
            conversationId: conv.id,
            // direction: msg.direction,
            content: msg.content,
            // status: msg.status,
            createdAt: new Date(msg.createdAt),
            // sentById: msg.sentById,
          },
        });
      }
    } catch (e) {
      log('⚠️', `Conversation ${conv.id} skipped: ${(e as Error).message?.slice(0, 60)}`);
    }
  }
  log('💬', `Conversations: ${convos.length} seeded (${convos.reduce((s, c) => s + c.messages.length, 0)} messages)`);
}

async function seedScreeningResults(results: SeedData['screeningResults']) {
  for (const scr of results) {
    try {
      // TODO: holilabsv2 — create ScreeningResult model or use QuestionnaireResponse
      // This is a placeholder — adjust to your actual schema
      log('📊', `Screening ${scr.id}: ${scr.instrumentId} score=${scr.score} (${scr.severity}) — skipped (model TBD)`);
    } catch (e) {
      log('⚠️', `Screening ${scr.id} skipped: ${(e as Error).message?.slice(0, 60)}`);
    }
  }
  log('📊', `Screening results: ${results.length} prepared (insert when model exists)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean');

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  HoliLabs Seed Runner');
  console.log(`  Source: ${SEED_FILE}`);
  console.log('═══════════════════════════════════════════');

  const data = loadSeedData();

  if (shouldClean) {
    await cleanDemoData();
  }

  console.log('\nSeeding...');

  await prisma.$transaction(async () => {
    await seedOrganizations(data.organizations);
    await seedUsers(data.users);
    await seedPatients(data.patients);
    await seedBillingCodes(data.billingCodes);
    await seedEncounters(data.encounters);
    await seedInvoices(data.invoices);
    await seedConversations(data.conversations);
    await seedScreeningResults(data.screeningResults);
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('  Seed complete!');
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
