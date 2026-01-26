
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Diagnosing DigitalOcean Connection & Demo Credentials...');

    try {
        // 1. Check Connection
        console.log('1️⃣  Testing Database Connection...');
        await prisma.$connect();
        console.log('✅ Database Connection Successful!');

        // 2. Check Demo Clinician
        console.log('\n2️⃣  Checking for Demo Clinician (demo-clinician@holilabs.xyz)...');
        const user = await prisma.user.findUnique({
            where: { email: 'demo-clinician@holilabs.xyz' },
        });

        if (user) {
            console.log('✅ Demo Clinician Found:');
            console.log(`   - ID: ${user.id}`);
            console.log(`   - Email: ${user.email}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - Password Hash Present: ${!!user.passwordHash}`);
        } else {
            console.error('❌ Demo Clinician NOT FOUND in database.');
            console.log('   -> Run "pnpm db:seed" to create it.');
        }

    } catch (error) {
        console.error('❌ DIAGNOSIS FAILED:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
