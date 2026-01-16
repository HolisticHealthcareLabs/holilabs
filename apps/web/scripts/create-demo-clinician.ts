/**
 * Create Demo Clinician Account
 *
 * Creates a demo clinician account: demo@holilabs.xyz / Demo123!@#
 */

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createDemoClinician() {
  const demoEmail = 'demo-clinician@holilabs.xyz';
  const demoPassword = 'Demo123!@#';

  console.log('👨‍⚕️ Creating demo clinician account...');

  // Check if account already exists
  const existing = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (existing) {
    console.log('✓ Demo clinician already exists, updating password...');

    // Hash password
    const passwordHash = await bcrypt.hash(demoPassword, 12);

    const updated = await prisma.user.update({
      where: { email: demoEmail },
      data: {
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    console.log('✅ Demo clinician password updated!');
    console.log('📧 Email:', updated.email);
    console.log('👤 Name:', updated.firstName, updated.lastName);
    console.log('👔 Role:', updated.role);
    console.log('🔑 Password: Demo123!@#');
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // Create clinician user
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      firstName: 'Demo',
      lastName: 'Clinician',
      role: 'CLINICIAN',
      passwordHash,
      permissions: ['READ_PATIENTS', 'WRITE_PATIENTS', 'READ_RECORDS', 'WRITE_RECORDS'],
      specialty: 'Family Medicine',
      licenseNumber: 'DEMO-12345',
      npi: '1234567890',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      specialty: true,
    },
  });

  console.log('✅ Demo clinician created successfully!');
  console.log('📧 Email:', user.email);
  console.log('👤 Name:', user.firstName, user.lastName);
  console.log('👔 Role:', user.role);
  console.log('🏥 Specialty:', user.specialty);
  console.log('🔑 Password: Demo123!@#');
}

createDemoClinician()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
