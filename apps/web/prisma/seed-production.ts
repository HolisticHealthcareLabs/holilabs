/**
 * Production Seed Script
 *
 * Creates minimal production-ready data:
 * - Admin user (for system setup)
 * - System configuration
 *
 * Usage:
 * tsx prisma/seed-production.ts
 *
 * DO NOT use the regular seed.ts in production (that's for development with test data)
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 HoliLabs Production Database Setup');
  console.log('=====================================\n');

  // Check if we're really in production
  const env = process.env.NODE_ENV;
  if (env !== 'production') {
    console.log('⚠️  NODE_ENV is not set to "production"');
    console.log(`   Current NODE_ENV: ${env || 'not set'}\n`);

    const confirm = await question('Are you sure you want to seed production data? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Seed cancelled.');
      process.exit(0);
    }
  }

  console.log('\n📋 This script will create:');
  console.log('   1. An admin clinician user');
  console.log('   2. System audit log\n');

  // Get admin details
  console.log('👤 Admin User Setup');
  console.log('-------------------');

  const email = await question('Admin email: ');
  const firstName = await question('First name: ');
  const lastName = await question('Last name: ');
  const specialty = await question('Specialty (e.g., "Internal Medicine"): ');
  const licenseNumber = await question('Medical license number: ');
  const npiNumber = await question('NPI number (optional, press Enter to skip): ');

  console.log('\n🔨 Creating database entries...\n');

  try {
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists.`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.firstName} ${existingUser.lastName}`);

      const overwrite = await question('\nOverwrite existing user? (yes/no): ');
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Seed cancelled.');
        process.exit(0);
      }

      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          firstName,
          lastName,
          specialty,
          licenseNumber,
          npiNumber: npiNumber || null,
          role: 'CLINICIAN',
          mfaEnabled: false,
        }
      });

      console.log('✅ Updated admin user:', updatedUser.email);
      console.log(`   ID: ${updatedUser.id}`);

    } else {
      // Create new admin user
      const adminUser = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: 'CLINICIAN',
          specialty,
          licenseNumber,
          npiNumber: npiNumber || null,
          mfaEnabled: false,
        },
      });

      console.log('✅ Created admin user:', adminUser.email);
      console.log(`   ID: ${adminUser.id}`);

      // Create audit log for user creation
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          userEmail: adminUser.email,
          ipAddress: '0.0.0.0', // System action
          action: 'CREATE',
          resource: 'User',
          resourceId: adminUser.id,
          details: {
            source: 'production-seed',
            role: 'CLINICIAN',
          },
          success: true,
        },
      });

      console.log('✅ Created audit log entry');
    }

    console.log('\n🎉 Production database setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Set up authentication for the admin user in DigitalOcean/Supabase');
    console.log('   2. Log in at: https://your-domain.com/auth/login');
    console.log(`   3. Use email: ${email}`);
    console.log('   4. Complete MFA setup in user settings\n');

    console.log('⚠️  IMPORTANT: Delete or secure this seed script after use!');
    console.log('   It should not be accessible in production.\n');

  } catch (error) {
    console.error('❌ Error during production seed:');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
