/**
 * Seed Default Situations for Enhanced Agenda System
 *
 * Creates the 5 default situation types:
 * - Deudas (RED) - Payment due
 * - Urgente (ORANGE) - Urgent medical need
 * - Primera Vez (BLUE) - First time patient
 * - Seguimiento (GREEN) - Follow-up visit
 * - VIP (PURPLE) - VIP patient
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSituations = [
  {
    name: 'Deudas',
    color: '#EF4444', // Red-500
    priority: 1,
    icon: '💰',
    requiresAction: true,
    actionLabel: 'Notify Patient',
    description: 'Patient has outstanding payment. Requires immediate attention to collect fees.',
    isActive: true,
  },
  {
    name: 'Urgente',
    color: '#F97316', // Orange-500
    priority: 1,
    icon: '🚨',
    requiresAction: false,
    actionLabel: null,
    description: 'Urgent medical need. Prioritize this appointment.',
    isActive: true,
  },
  {
    name: 'Primera Vez',
    color: '#3B82F6', // Blue-500
    priority: 3,
    icon: '🆕',
    requiresAction: false,
    actionLabel: null,
    description: 'First time patient. Requires new patient intake and additional time.',
    isActive: true,
  },
  {
    name: 'Seguimiento',
    color: '#10B981', // Green-500
    priority: 4,
    icon: '🔁',
    requiresAction: false,
    actionLabel: null,
    description: 'Follow-up visit for ongoing treatment or condition monitoring.',
    isActive: true,
  },
  {
    name: 'VIP',
    color: '#8B5CF6', // Purple-500
    priority: 2,
    icon: '⭐',
    requiresAction: false,
    actionLabel: null,
    description: 'VIP patient. Requires special handling and priority service.',
    isActive: true,
  },
];

async function main() {
  console.log('🌱 Seeding default situations...');

  for (const situation of defaultSituations) {
    const result = await prisma.situation.upsert({
      where: { name: situation.name },
      update: situation,
      create: situation,
    });
    console.log(`✅ Created/Updated situation: ${result.name} (${result.color})`);
  }

  console.log('✨ Situation seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding situations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
