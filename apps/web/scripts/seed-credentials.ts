/**
 * Seed Sample Credentials for Testing
 * Run with: npx tsx scripts/seed-credentials.ts
 */

import { PrismaClient, CredentialType, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

const sampleCredentials = [
  {
    credentialType: 'MEDICAL_LICENSE' as CredentialType,
    credentialNumber: 'CA-MD-123456',
    issuingAuthority: 'California Medical Board',
    issuingCountry: 'US',
    issuingState: 'CA',
    issuedDate: new Date('2018-05-15'),
    expirationDate: new Date('2026-05-15'),
    neverExpires: false,
    verificationStatus: 'VERIFIED' as VerificationStatus,
    autoVerified: true,
    verificationSource: 'State Medical Board API',
    verifiedAt: new Date(),
  },
  {
    credentialType: 'NPI' as CredentialType,
    credentialNumber: '1234567890',
    issuingAuthority: 'National Plan and Provider Enumeration System',
    issuingCountry: 'US',
    issuedDate: new Date('2018-06-01'),
    neverExpires: true,
    verificationStatus: 'VERIFIED' as VerificationStatus,
    autoVerified: true,
    verificationSource: 'NPPES (National Plan & Provider Enumeration System)',
    verifiedAt: new Date(),
  },
  {
    credentialType: 'BOARD_CERTIFICATION' as CredentialType,
    credentialNumber: 'ABIM-2019-00123',
    issuingAuthority: 'American Board of Internal Medicine',
    issuingCountry: 'US',
    issuedDate: new Date('2019-03-20'),
    expirationDate: new Date('2029-03-20'),
    neverExpires: false,
    verificationStatus: 'VERIFIED' as VerificationStatus,
    autoVerified: true,
    verificationSource: 'ABMS (American Board of Medical Specialties)',
    verifiedAt: new Date(),
  },
  {
    credentialType: 'DEA_LICENSE' as CredentialType,
    credentialNumber: 'BD1234567',
    issuingAuthority: 'Drug Enforcement Administration',
    issuingCountry: 'US',
    issuingState: 'CA',
    issuedDate: new Date('2020-01-10'),
    expirationDate: new Date('2026-01-10'),
    neverExpires: false,
    verificationStatus: 'PENDING' as VerificationStatus,
    autoVerified: false,
    verificationSource: null,
  },
  {
    credentialType: 'MALPRACTICE_INSURANCE' as CredentialType,
    credentialNumber: 'MLP-2024-789456',
    issuingAuthority: 'The Doctors Company',
    issuingCountry: 'US',
    issuedDate: new Date('2024-01-01'),
    expirationDate: new Date('2025-12-31'),
    neverExpires: false,
    verificationStatus: 'MANUAL_REVIEW' as VerificationStatus,
    autoVerified: false,
    verificationSource: 'Document Review',
  },
  {
    credentialType: 'BLS_CERTIFICATION' as CredentialType,
    credentialNumber: 'AHA-BLS-2023-45678',
    issuingAuthority: 'American Heart Association',
    issuingCountry: 'US',
    issuedDate: new Date('2023-08-15'),
    expirationDate: new Date('2025-08-15'),
    neverExpires: false,
    verificationStatus: 'VERIFIED' as VerificationStatus,
    autoVerified: false,
    manualVerified: true,
    verificationSource: 'Manual Review',
    verifiedAt: new Date(),
  },
  {
    credentialType: 'ACLS_CERTIFICATION' as CredentialType,
    credentialNumber: 'AHA-ACLS-2023-89012',
    issuingAuthority: 'American Heart Association',
    issuingCountry: 'US',
    issuedDate: new Date('2023-09-20'),
    expirationDate: new Date('2025-09-20'),
    neverExpires: false,
    verificationStatus: 'VERIFIED' as VerificationStatus,
    autoVerified: false,
    manualVerified: true,
    verificationSource: 'Manual Review',
    verifiedAt: new Date(),
  },
];

async function seedCredentials() {
  console.log('🌱 Seeding sample credentials...');

  try {
    // Create or find demo user
    let demoUser = await prisma.user.findUnique({
      where: { email: 'demo@holilabs.com' },
    });

    if (!demoUser) {
      console.log('Creating demo user...');
      demoUser = await prisma.user.create({
        data: {
          email: 'demo@holilabs.com',
          firstName: 'Demo',
          lastName: 'Physician',
          role: 'CLINICIAN',
          specialty: 'Internal Medicine',
          licenseNumber: 'CA-MD-123456',
          npi: '1234567890',
        },
      });
      console.log(`✓ Created demo user: ${demoUser.email}`);
    } else {
      console.log(`✓ Using existing demo user: ${demoUser.email}`);
    }

    // Clear existing credentials for demo user
    const deleted = await prisma.providerCredential.deleteMany({
      where: { userId: demoUser.id },
    });
    console.log(`✓ Cleared ${deleted.count} existing credentials`);

    // Create sample credentials
    let created = 0;
    for (const credential of sampleCredentials) {
      await prisma.providerCredential.create({
        data: {
          ...credential,
          userId: demoUser.id,
        },
      });
      created++;
      console.log(
        `✓ Created: ${credential.credentialType} - ${credential.credentialNumber} (${credential.verificationStatus})`
      );
    }

    console.log(`\n✅ Successfully seeded ${created} credentials!`);
    console.log('\nCredential Summary:');
    console.log(
      `- VERIFIED: ${sampleCredentials.filter((c) => c.verificationStatus === 'VERIFIED').length}`
    );
    console.log(
      `- PENDING: ${sampleCredentials.filter((c) => c.verificationStatus === 'PENDING').length}`
    );
    console.log(
      `- MANUAL_REVIEW: ${
        sampleCredentials.filter((c) => c.verificationStatus === 'MANUAL_REVIEW').length
      }`
    );
    console.log(
      `- Auto-verified: ${sampleCredentials.filter((c) => c.autoVerified).length}`
    );
    console.log(
      `- Manually verified: ${sampleCredentials.filter((c) => c.manualVerified).length}`
    );

    console.log(`\n🎉 You can now test the credential verification system!`);
    console.log(`\nDemo User ID: ${demoUser.id}`);
    console.log(`Demo User Email: ${demoUser.email}`);
    console.log(`\nTo view credentials, visit:`);
    console.log(`http://129.212.184.190:3000/dashboard/credentials`);
  } catch (error) {
    console.error('❌ Error seeding credentials:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedCredentials();
