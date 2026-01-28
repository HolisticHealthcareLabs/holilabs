/**
 * Direct Login Simulation
 * Simulates exactly what the authorize() function does
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
    console.log('\n🔐 SIMULATING LOGIN FLOW\n' + '='.repeat(50));

    const email = 'demo-clinician@holilabs.xyz';
    const password = 'Demo123!@#';

    console.log('\n1️⃣ Checking demo credentials match...');
    const isDemoUser = email === 'demo-clinician@holilabs.xyz' && password === 'Demo123!@#';
    console.log('   Is demo user:', isDemoUser);

    if (isDemoUser) {
        console.log('\n2️⃣ Looking up user in database...');
        try {
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (user) {
                console.log('   ✅ User found!');
                console.log('   ID:', user.id);
                console.log('   Email:', user.email);
                console.log('   Name:', `${user.firstName} ${user.lastName}`);
                console.log('   Role:', user.role);
                console.log('   Has passwordHash:', !!user.passwordHash);

                if (user.passwordHash) {
                    console.log('\n3️⃣ Testing password hash...');
                    try {
                        const isValid = await bcrypt.compare(password, user.passwordHash);
                        console.log('   Password valid:', isValid);

                        if (!isValid) {
                            console.log('\n   ⚠️ PASSWORD MISMATCH DETECTED!');
                            console.log('   The stored hash does not match "Demo123!@#"');
                            console.log('   This is why login is failing.');

                            console.log('\n4️⃣ Generating correct hash...');
                            const correctHash = await bcrypt.hash(password, 12);
                            console.log('   New hash:', correctHash);

                            console.log('\n5️⃣ Updating user with correct hash...');
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { passwordHash: correctHash }
                            });
                            console.log('   ✅ User updated! Login should work now.');
                        } else {
                            console.log('\n   ✅ Password hash is correct!');
                            console.log('   The issue is NOT the password.');
                        }
                    } catch (error) {
                        console.error('   ❌ Error comparing password:', error);
                    }
                }

                console.log('\n6️⃣ Testing return value construction...');
                const returnValue = {
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                };
                console.log('   Would return:', JSON.stringify(returnValue, null, 2));

            } else {
                console.log('   ❌ User NOT found - will be created on next login');
            }
        } catch (error) {
            console.error('   ❌ Database error:', error);
        }
    }

    await prisma.$disconnect();
    console.log('\n' + '='.repeat(50) + '\n');
}

testLogin().catch(console.error);
