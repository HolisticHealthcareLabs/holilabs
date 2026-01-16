/**
 * Set Demo Account Password
 *
 * Sets the password for demo@holilabs.xyz to 'Demo123!@#'
 */

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function setDemoPassword() {
  const demoEmail = 'demo@holilabs.xyz';
  const demoPassword = 'Demo123!@#';

  console.log('🔐 Setting password for demo account...');

  // Hash password
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // Update patient user
  const updated = await prisma.patientUser.update({
    where: { email: demoEmail },
    data: {
      passwordHash,
      emailVerifiedAt: new Date(), // Ensure email is verified
      loginAttempts: 0,
      lockedUntil: null,
    },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  console.log('✅ Demo password set successfully!');
  console.log('📧 Email:', updated.email);
  console.log('✓ Email verified:', updated.emailVerifiedAt);
  console.log('🔑 Password: Demo123!@#');
}

setDemoPassword()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
