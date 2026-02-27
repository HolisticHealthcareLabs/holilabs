/**
 * Demo Seed Script
 *
 * Creates realistic clinician users and prevention templates
 * for investor demo and internal testing.
 *
 * Idempotent: safe to run multiple times (uses upsert).
 *
 * Usage: npx tsx prisma/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// bcrypt hash of "Cortex2026!" (10 rounds)
const DEMO_PASSWORD_HASH = '$2b$10$XuTG2vGHj6vs/7..WlgvIO9xzrWWdpGZtR8LAcm.ZdNHzjWN9/j1K';

async function main() {
  console.log('🌱 Seeding demo data...\n');

  // ──────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────

  const drSilva = await prisma.user.upsert({
    where: { email: 'dr.silva@holilabs.xyz' },
    update: { passwordHash: DEMO_PASSWORD_HASH, onboardingCompleted: true },
    create: {
      email: 'dr.silva@holilabs.xyz',
      firstName: 'Ricardo',
      lastName: 'Silva Mendes',
      username: 'drsilva',
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'PHYSICIAN',
      specialty: 'Cardiology',
      licenseNumber: 'CRM-SP 142857',
      onboardingCompleted: true,
    },
  });

  const draCampos = await prisma.user.upsert({
    where: { email: 'dra.campos@holilabs.xyz' },
    update: { passwordHash: DEMO_PASSWORD_HASH, onboardingCompleted: true },
    create: {
      email: 'dra.campos@holilabs.xyz',
      firstName: 'Mariana',
      lastName: 'Campos Herrera',
      username: 'dracampos',
      passwordHash: DEMO_PASSWORD_HASH,
      role: 'PHYSICIAN',
      specialty: 'Internal Medicine / Oncology',
      licenseNumber: 'CRM-RJ 198432',
      onboardingCompleted: true,
    },
  });

  console.log(`  ✅ User: Dr. Ricardo Silva Mendes (${drSilva.id})`);
  console.log(`  ✅ User: Dra. Mariana Campos Herrera (${draCampos.id})`);

  // ──────────────────────────────────────────────
  // PREVENTION TEMPLATES
  // ──────────────────────────────────────────────

  const cardioTemplate = await prisma.preventionPlanTemplate.upsert({
    where: { id: 'tpl-cardiometabolic-v1' },
    update: {},
    create: {
      id: 'tpl-cardiometabolic-v1',
      templateName: 'Protocolo de Prevenção Cardiometabólica — Risco Moderado a Alto',
      planType: 'CHRONIC_DISEASE',
      description:
        'Protocolo longitudinal para adultos de 40-70 anos com pelo menos 2 fatores de risco cardiovascular (hipertensão, dislipidemia, diabetes, tabagismo, obesidade). Baseado nas diretrizes da Sociedade Brasileira de Cardiologia (SBC 2023) e AHA/ACC 2024. Inclui metas de controle pressórico (<130/80 mmHg), LDL-C conforme estratificação de risco, e rastreamento de doença arterial coronariana subclínica.',
      guidelineSource: 'SBC 2023 / AHA-ACC 2024 / USPSTF Grade A',
      evidenceLevel: 'Level A',
      targetPopulation: 'Adultos 40-70 anos com ≥2 fatores de risco CV. Exclui pacientes com evento CV prévio (prevenção secundária).',
      goals: [
        { goal: 'Reduzir PA sistólica para <130 mmHg em 90 dias', category: 'Clinical', timeframe: '90 days', priority: 'HIGH' },
        { goal: 'Atingir LDL-C <100 mg/dL (ou <70 se alto risco) em 6 meses', category: 'Clinical', timeframe: '6 months', priority: 'HIGH' },
        { goal: 'HbA1c <7.0% para pacientes com DM2', category: 'Clinical', timeframe: '6 months', priority: 'HIGH' },
        { goal: 'Cessação de tabagismo com suporte farmacológico', category: 'Behavioral', timeframe: '3 months', priority: 'CRITICAL' },
        { goal: 'Atividade física ≥150 min/semana de intensidade moderada', category: 'Lifestyle', timeframe: '30 days', priority: 'MEDIUM' },
        { goal: 'Perda de 5-10% do peso corporal em pacientes com IMC ≥30', category: 'Lifestyle', timeframe: '12 months', priority: 'MEDIUM' },
      ],
      recommendations: [
        { title: 'Escore de Cálcio Coronariano (CAC)', description: 'Indicar em pacientes com risco intermediário (ERG 5-20%) para reclassificação. CAC >100 → tratar como alto risco.', category: 'Preventive', priority: 'HIGH' },
        { title: 'Perfil Lipídico Completo', description: 'Coletar CT, LDL-C, HDL-C, TG, Lp(a) basal. Repetir em 6-8 semanas após início de estatina.', category: 'Monitoring', priority: 'HIGH' },
        { title: 'MAPA 24h', description: 'Monitorização ambulatorial da PA para confirmar hipertensão do jaleco branco e avaliar descenso noturno.', category: 'Clinical', priority: 'MEDIUM' },
        { title: 'Dieta Mediterrânea / DASH', description: 'Encaminhar para nutricionista. Redução de sódio <2g/dia, aumento de fibras, gorduras insaturadas.', category: 'Lifestyle', priority: 'MEDIUM' },
      ],
      useCount: 47,
      isActive: true,
      createdBy: drSilva.id,
    },
  });

  const oncologyTemplate = await prisma.preventionPlanTemplate.upsert({
    where: { id: 'tpl-oncology-screening-v1' },
    update: {},
    create: {
      id: 'tpl-oncology-screening-v1',
      templateName: 'Rastreamento Oncológico Multimodal — Protocolo Baseado em Risco',
      planType: 'WELLNESS',
      description:
        'Protocolo de rastreamento oncológico para adultos ≥45 anos seguindo diretrizes INCA/MS 2024, NCCN 2024, e USPSTF. Integra rastreamento de câncer colorretal (colonoscopia ou FIT), mama (mamografia), colo uterino (Papanicolaou/HPV), pulmão (LDCT para tabagistas), e próstata (PSA com decisão compartilhada). Inclui avaliação de risco hereditário com critérios para encaminhamento a aconselhamento genético.',
      guidelineSource: 'INCA/MS 2024 / NCCN 2024 / USPSTF A/B',
      evidenceLevel: 'Level A',
      targetPopulation: 'Adultos ≥45 anos em atenção primária. Critérios expandidos para alto risco familiar/genético.',
      goals: [
        { goal: 'Rastreamento colorretal em dia para 100% dos elegíveis ≥45 anos', category: 'Preventive', timeframe: '6 months', priority: 'HIGH' },
        { goal: 'Mamografia bienal em mulheres 50-69 anos', category: 'Preventive', timeframe: '12 months', priority: 'HIGH' },
        { goal: 'Papanicolaou/HPV a cada 3 anos em mulheres 25-64 anos', category: 'Preventive', timeframe: '12 months', priority: 'HIGH' },
        { goal: 'LDCT anual em tabagistas ≥20 maços-ano (50-80 anos)', category: 'Preventive', timeframe: '12 months', priority: 'CRITICAL' },
        { goal: 'Avaliação de risco hereditário em pacientes com ≥2 parentes de 1° grau com câncer', category: 'Clinical', timeframe: '30 days', priority: 'HIGH' },
      ],
      recommendations: [
        { title: 'Colonoscopia ou Teste Imunoquímico Fecal (FIT)', description: 'Colonoscopia a cada 10 anos OU FIT anual. Colonoscopia preferencial se história familiar positiva.', category: 'Preventive', priority: 'HIGH' },
        { title: 'Mamografia Digital com Tomossíntese', description: 'Bienal para risco padrão. Anual + RM para alto risco (BRCA, Li-Fraumeni, radiação torácica prévia).', category: 'Preventive', priority: 'HIGH' },
        { title: 'Citologia Cervical + Co-teste HPV', description: 'Papanicolaou a cada 3 anos (25-29) ou co-teste HPV a cada 5 anos (30-64).', category: 'Preventive', priority: 'MEDIUM' },
        { title: 'TC de Baixa Dose de Tórax (LDCT)', description: 'Anual para tabagistas ou ex-tabagistas (<15 anos de cessação) com ≥20 maços-ano.', category: 'Preventive', priority: 'CRITICAL' },
      ],
      useCount: 31,
      isActive: true,
      createdBy: draCampos.id,
    },
  });

  const wellnessTemplate = await prisma.preventionPlanTemplate.upsert({
    where: { id: 'tpl-wellness-metabolic-v1' },
    update: {},
    create: {
      id: 'tpl-wellness-metabolic-v1',
      templateName: 'Check-up Executivo — Saúde Metabólica e Estresse Ocupacional',
      planType: 'OCCUPATIONAL',
      description:
        'Protocolo de avaliação longitudinal para profissionais de alta performance (30-55 anos) com foco em síndrome metabólica, burnout, e fatores de risco cardiovascular precoce. Baseado em diretrizes da SBEM 2023, WHO Occupational Health Guidelines, e meta-análise Lancet 2023 sobre estresse ocupacional e risco CV. Inclui avaliação de cortisol, eixo tireoidiano, e marcadores inflamatórios (PCR-us, homocisteína).',
      guidelineSource: 'SBEM 2023 / WHO Occupational Health / Lancet 2023',
      evidenceLevel: 'Level B',
      targetPopulation: 'Profissionais 30-55 anos com ≥1 critério de síndrome metabólica ou carga de trabalho >50h/semana.',
      goals: [
        { goal: 'Rastreamento completo de síndrome metabólica (ATP III) na primeira consulta', category: 'Clinical', timeframe: '30 days', priority: 'HIGH' },
        { goal: 'Avaliação de burnout com instrumento validado (MBI ou OLBI)', category: 'Monitoring', timeframe: '30 days', priority: 'HIGH' },
        { goal: 'Regularização do sono: ≥7h/noite em 80% das noites', category: 'Lifestyle', timeframe: '90 days', priority: 'MEDIUM' },
        { goal: 'Redução de circunferência abdominal em ≥5cm se ≥94cm (H) ou ≥80cm (M)', category: 'Lifestyle', timeframe: '6 months', priority: 'MEDIUM' },
      ],
      recommendations: [
        { title: 'Painel Metabólico Expandido', description: 'Glicose de jejum, HbA1c, insulina, HOMA-IR, perfil lipídico completo, ácido úrico, PCR-us, homocisteína, Vitamina D, TSH, T4L, cortisol matinal.', category: 'Clinical', priority: 'HIGH' },
        { title: 'Avaliação Cardiovascular Não-Invasiva', description: 'ECG de repouso + teste ergométrico. Considerar CAC score se risco intermediário. Ecocardiograma se hipertensão.', category: 'Preventive', priority: 'HIGH' },
        { title: 'Protocolo de Estresse Ocupacional', description: 'Aplicar MBI (Maslach Burnout Inventory). Se score alto: encaminhar para psicoterapia cognitivo-comportamental e avaliar necessidade de ajuste de carga horária.', category: 'Behavioral', priority: 'MEDIUM' },
        { title: 'Planejamento Nutricional Individualizado', description: 'Avaliação de composição corporal (bioimpedância). Plano alimentar anti-inflamatório com foco em redução de carboidratos refinados e gorduras trans.', category: 'Lifestyle', priority: 'MEDIUM' },
      ],
      useCount: 18,
      isActive: true,
      createdBy: drSilva.id,
    },
  });

  // ──────────────────────────────────────────────
  // VERSION SNAPSHOTS
  // ──────────────────────────────────────────────

  for (const tpl of [cardioTemplate, oncologyTemplate, wellnessTemplate]) {
    const full = await prisma.preventionPlanTemplate.findUnique({
      where: { id: tpl.id },
      select: {
        templateName: true,
        planType: true,
        description: true,
        guidelineSource: true,
        evidenceLevel: true,
        targetPopulation: true,
        goals: true,
        recommendations: true,
      },
    });

    if (!full) continue;

    await prisma.preventionPlanTemplateVersion.upsert({
      where: {
        templateId_version: { templateId: tpl.id, version: 1 },
      },
      update: {},
      create: {
        templateId: tpl.id,
        version: 1,
        changeNote: 'Initial version — guideline-aligned protocol',
        snapshot: full as any,
        createdBy: tpl.createdBy,
      },
    });
  }

  console.log(`  ✅ Template: ${cardioTemplate.templateName}`);
  console.log(`  ✅ Template: ${oncologyTemplate.templateName}`);
  console.log(`  ✅ Template: ${wellnessTemplate.templateName}`);
  console.log(`  ✅ Version snapshots created for all templates`);

  console.log('\n🎉 Demo seed complete.\n');
  console.log('  Login credentials:');
  console.log('  ─────────────────────────────────────────');
  console.log('  Dr. Ricardo Silva  │ dr.silva@holilabs.xyz');
  console.log('  Dra. Mariana Campos│ dra.campos@holilabs.xyz');
  console.log('  Password (both)    │ Cortex2026!');
  console.log('  ─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
