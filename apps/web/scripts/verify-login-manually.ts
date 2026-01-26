
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🕵️‍♂️ Verifying Login Logic Manually...');

    const email = 'demo-clinician@holilabs.xyz';
    const password = 'Demo123!@#';

    console.log(`Target: ${email}`);
    console.log(`Password: ${password}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error('❌ User NOT FOUND.');
            return;
        }

        console.log('✅ User found.');
        console.log(`   Hash: ${user.passwordHash?.substring(0, 10)}...`);

        if (!user.passwordHash) {
            console.error('❌ Password hash is missing.');
            return;
        }

        const start = Date.now();
        const isValid = await bcrypt.compare(password, user.passwordHash);
        const end = Date.now();

        console.log(`⏱ Comparison took ${end - start}ms`);

        if (isValid) {
            console.log('✅ BCRYPT VALIDATION PASSED. The password is correct.');
        } else {
            console.error('❌ BCRYPT VALIDATION FAILED. Hash does not match password.');
            console.log('   Re-running password reset...');

            const newHash = await bcrypt.hash(password, 12);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newHash },
            });
            console.log('   ✅ Password forced reset completed.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
