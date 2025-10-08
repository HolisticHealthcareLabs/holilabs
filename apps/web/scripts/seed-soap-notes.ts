/**
 * Seed SOAP Notes for Testing Bulk Export
 *
 * Creates sample SOAP notes with ICD-10/CPT codes for export testing
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  console.log('🌱 Seeding SOAP notes...');

  // Get first user and patient
  const user = await prisma.user.findFirst();
  const patient = await prisma.patient.findFirst();

  if (!user || !patient) {
    console.error('❌ No user or patient found. Run seed script first.');
    process.exit(1);
  }

  console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
  console.log(`Found patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);

  // Create 5 sample SOAP notes with different dates and diagnoses
  const notes = [
    {
      chiefComplaint: 'Control de diabetes mellitus tipo 2',
      subjective: 'Paciente refiere adherencia al tratamiento. Glucemias matinales entre 110-140 mg/dL.',
      objective: 'PA: 130/85 mmHg, FC: 78 lpm, Peso: 82 kg, IMC: 28.5',
      assessment: 'Diabetes mellitus tipo 2 con control glucémico aceptable. Requiere ajuste de medicación.',
      plan: 'Aumentar metformina a 1000mg c/12h. Solicitar HbA1c. Control en 3 meses.',
      diagnoses: [
        { icd10Code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', isPrimary: true },
        { icd10Code: 'I10', description: 'Hipertensión esencial', isPrimary: false },
      ],
      procedures: [
        { cptCode: '99213', description: 'Office visit, established patient, level 3' },
      ],
      vitalSigns: {
        bp: '130/85',
        hr: '78',
        temp: '36.5',
        weight: '82',
      },
      createdAt: new Date('2025-09-15'),
      signedAt: new Date('2025-09-15'),
    },
    {
      chiefComplaint: 'Control de hipertensión arterial',
      subjective: 'Paciente refiere tomas de presión domiciliarias entre 125/80 - 140/90 mmHg.',
      objective: 'PA: 135/88 mmHg (brazo derecho, sentado), FC: 72 lpm regular.',
      assessment: 'Hipertensión arterial esencial en tratamiento. Control presorial subóptimo.',
      plan: 'Ajustar enalapril a 20mg/día. Mantener dieta hiposódica.',
      diagnoses: [
        { icd10Code: 'I10', description: 'Hipertensión esencial (primaria)', isPrimary: true },
      ],
      procedures: [
        { cptCode: '99213', description: 'Office visit, established patient, level 3' },
      ],
      vitalSigns: {
        bp: '135/88',
        hr: '72',
        temp: '36.6',
        weight: '75',
      },
      createdAt: new Date('2025-09-20'),
      signedAt: new Date('2025-09-20'),
    },
    {
      chiefComplaint: 'Infección respiratoria aguda',
      subjective: 'Paciente refiere tos productiva, fiebre de 38.2°C hace 2 días, odinofagia.',
      objective: 'T: 37.8°C, FR: 18 rpm, SatO2: 96%. Orofaringe hiperémica. Auscultación con estertores.',
      assessment: 'Bronquitis aguda probable etiología bacteriana.',
      plan: 'Amoxicilina 500mg c/8h x 7 días. Paracetamol PRN. Regresar si persiste fiebre >48h.',
      diagnoses: [
        { icd10Code: 'J20.9', description: 'Bronquitis aguda no especificada', isPrimary: true },
      ],
      procedures: [
        { cptCode: '99213', description: 'Office visit, established patient, level 3' },
      ],
      vitalSigns: {
        bp: '118/75',
        hr: '88',
        temp: '37.8',
        rr: '18',
        spo2: '96',
        weight: '70',
      },
      createdAt: new Date('2025-09-25'),
      signedAt: new Date('2025-09-25'),
    },
    {
      chiefComplaint: 'Control pediátrico de niño sano',
      subjective: 'Padres refieren desarrollo psicomotor adecuado. Alimentación balanceada.',
      objective: 'Peso: 15 kg (percentil 50), Talla: 95 cm (percentil 50). Examen físico normal.',
      assessment: 'Niño sano de 2 años con crecimiento y desarrollo normales.',
      plan: 'Continuar alimentación balanceada. Vacunas al día. Control en 6 meses.',
      diagnoses: [
        { icd10Code: 'Z00.129', description: 'Examen médico de rutina del niño', isPrimary: true },
      ],
      procedures: [
        { cptCode: '99391', description: 'Preventive medicine visit, infant (age younger than 1 year)' },
      ],
      vitalSigns: {
        hr: '95',
        temp: '36.8',
        rr: '24',
        weight: '15',
      },
      createdAt: new Date('2025-10-01'),
      signedAt: new Date('2025-10-01'),
    },
    {
      chiefComplaint: 'Dolor lumbar crónico',
      subjective: 'Paciente refiere dolor lumbar de 3 meses de evolución. Mejora con reposo.',
      objective: 'Movilidad lumbar limitada. Signo de Lasègue negativo bilateral.',
      assessment: 'Lumbalgia mecánica crónica sin compromiso radicular.',
      plan: 'Ibuprofeno 400mg c/8h x 10 días. Terapia física. Evitar cargas pesadas.',
      diagnoses: [
        { icd10Code: 'M54.5', description: 'Dolor lumbar bajo', isPrimary: true },
      ],
      procedures: [
        { cptCode: '99214', description: 'Office visit, established patient, level 4' },
      ],
      vitalSigns: {
        bp: '125/78',
        hr: '70',
        temp: '36.5',
        weight: '80',
      },
      createdAt: new Date('2025-10-05'),
      signedAt: new Date('2025-10-05'),
    },
  ];

  for (const note of notes) {
    const noteContent = JSON.stringify(note);
    const noteHash = generateHash(noteContent);

    // Create ScribeSession first
    const session = await prisma.scribeSession.create({
      data: {
        patientId: patient.id,
        clinicianId: user.id,
        status: 'COMPLETED',
        audioFileUrl: 'test-audio.webm',
        audioFileName: `consultation-${note.createdAt.toISOString().split('T')[0]}.webm`,
        audioDuration: 300,
        audioFormat: 'webm',
        processingStartedAt: note.createdAt,
        processingCompletedAt: note.signedAt,
        createdAt: note.createdAt,
      },
    });

    // Create SOAP note linked to session
    const created = await prisma.sOAPNote.create({
      data: {
        sessionId: session.id,
        patientId: patient.id,
        clinicianId: user.id,
        chiefComplaint: note.chiefComplaint,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        diagnoses: note.diagnoses,
        procedures: note.procedures,
        vitalSigns: note.vitalSigns || {},
        noteHash,
        overallConfidence: 0.95,
        status: 'SIGNED',
        signedAt: note.signedAt,
        createdAt: note.createdAt,
      },
    });
    console.log(`✅ Created SOAP note: ${created.chiefComplaint} (${created.createdAt.toISOString().split('T')[0]})`);
  }

  console.log('\n🎉 Successfully seeded 5 SOAP notes!');
  console.log('\nYou can now test the export API:');
  console.log('- Go to http://localhost:3000/dashboard');
  console.log('- Click "Exportar Facturación"');
  console.log('- Select date range: 2025-09-01 to 2025-10-08');
  console.log('- Download CSV file with all 5 notes');
}

main()
  .catch((e) => {
    console.error('Error seeding SOAP notes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
