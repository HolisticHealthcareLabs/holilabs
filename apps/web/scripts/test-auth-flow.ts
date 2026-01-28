/**
 * Direct Auth Test Script
 * 
 * Run with: npx tsx scripts/test-auth-flow.ts
 */

import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('\n🔬 DIRECT AUTH FLOW TEST\n' + '='.repeat(40));

    // 1. Check DATABASE_URL
    console.log('\n1️⃣ Environment Check:');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ MISSING');

    if (!process.env.DATABASE_URL) {
        console.error('\n💥 DATABASE_URL is not set! This is why auth fails.');
        console.log('   Please ensure your .env file has a valid DATABASE_URL');
        process.exit(1);
    }

    // 2. Test Prisma Connection
    console.log('\n2️⃣ Testing Prisma Connection...');
    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log('   ✅ Database connection successful!');
    } catch (error) {
        console.error('   ❌ Database connection FAILED:', error);
        process.exit(1);
    }

    // 3. Check for demo user
    console.log('\n3️⃣ Checking for Demo User...');
    const email = 'demo-clinician@holilabs.xyz';

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                passwordHash: true,
            }
        });

        if (user) {
            console.log('   ✅ Demo user found!');
            console.log('   ID:', user.id);
            console.log('   Email:', user.email);
            console.log('   Name:', `${user.firstName} ${user.lastName}`);
            console.log('   Role:', user.role);
            console.log('   Has password hash:', user.passwordHash ? '✅ Yes' : '❌ No');
        } else {
            console.log('   ⚠️ Demo user NOT found in database');
            console.log('   Will be auto-created on first login attempt');
        }
    } catch (error) {
        console.error('   ❌ Error querying user:', error);
    }

    // 4. List all users
    console.log('\n4️⃣ All Users in Database:');
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });

        if (users.length === 0) {
            console.log('   ⚠️ No users in database at all!');
        } else {
            users.forEach(u => {
                console.log(`   - ${u.email} (${u.role})`);
            });
        }
    } catch (error) {
        console.error('   ❌ Error listing users:', error);
    }

    // 5. Check NEXTAUTH_URL
    console.log('\n5️⃣ NextAuth URL Check:');
    console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NOT SET');
    console.log('   AUTH_SECRET:', process.env.AUTH_SECRET ? '✅ Set' : '❌ MISSING');
    console.log('   NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ MISSING');

    await prisma.$disconnect();

    console.log('\n' + '='.repeat(40));
    console.log('🏁 Test Complete\n');
}

main().catch(console.error);
