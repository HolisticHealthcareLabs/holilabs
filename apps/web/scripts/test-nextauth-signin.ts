/**
 * Test NextAuth signIn directly
 */

import { signIn } from '@/lib/auth/auth';

async function testSignIn() {
    console.log('\n🧪 TESTING NextAuth signIn() DIRECTLY\n' + '='.repeat(50));

    try {
        console.log('Attempting to sign in with credentials...');

        const result = await signIn('credentials', {
            email: 'demo-clinician@holilabs.xyz',
            password: 'Demo123!@#',
            redirect: false,
        });

        console.log('\n✅ signIn() completed');
        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('\n❌ signIn() threw an error:');
        console.error(error);
    }

    console.log('\n' + '='.repeat(50) + '\n');
}

testSignIn().catch(console.error);
