/**
 * Seed Prevention Plan Templates
 *
 * Loads sample prevention plan templates into the database
 */

import { PrismaClient } from '@prisma/client';
import { seedPreventionTemplates } from '../prisma/seeds/prevention-templates';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting prevention templates seed...\n');

  try {
    // Get the first user to assign as creator (prefer admin)
    let user = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
    });

    // If no admin, use any user
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      console.error('❌ No users found in database. Please create a user first.');
      process.exit(1);
    }

    console.log(`📝 Using user: ${user.firstName} ${user.lastName} (${user.email})\n`);

    // Check if templates already exist
    const existingTemplates = await prisma.preventionPlanTemplate.count();

    if (existingTemplates > 0) {
      console.log(`⚠️  Found ${existingTemplates} existing templates.`);
      console.log('Deleting existing templates...\n');

      await prisma.preventionPlanTemplate.deleteMany({});
      console.log('✓ Existing templates removed\n');
    }

    // Seed the templates
    await seedPreventionTemplates(user.id);

    // Verify seeding
    const totalTemplates = await prisma.preventionPlanTemplate.count();
    console.log(`\n✅ Seeding complete! Total templates in database: ${totalTemplates}`);

    // Show template summary
    const templates = await prisma.preventionPlanTemplate.findMany({
      select: {
        templateName: true,
        planType: true,
        isActive: true,
      },
    });

    console.log('\n📋 Templates loaded:');
    templates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.templateName} (${template.planType})`);
    });

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
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
