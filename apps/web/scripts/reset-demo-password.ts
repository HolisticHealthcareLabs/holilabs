
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔐 Resetting Demo Clinician Password...');

    try {
        const email = 'demo-clinician@holilabs.xyz';
        const password = 'Demo123!@#';

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update the user
        const user = await prisma.user.update({
            where: { email },
            data: { passwordHash },
        });

        console.log(`✅ Password for ${user.email} has been reset to: ${password}`);
        console.log(`   (ID: ${user.id})`);

    } catch (error) {
        console.error('❌ FAILED to reset password:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
