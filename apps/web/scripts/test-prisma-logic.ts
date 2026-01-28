
// Load env vars first
import 'dotenv/config';
// Use a relative import to test the file logic, bypassing alias issues if tsx doesn't handle them
// We need to shim the logger since it likely depends on alias
import { PrismaClient } from '@prisma/client';

console.log('🧪 Testing lib/prisma.ts logic...');

const url = process.env.DATABASE_URL;
console.log(`ENV DATABASE_URL: ${url ? 'Found' : 'MISSING'}`);

try {
    // Simulate the logic from lib/prisma.ts
    const createPrismaClient = () => {
        if (!url) {
            console.log('❌ createPrismaClient: No URL');
            return null;
        }
        console.log('✅ createPrismaClient: Creating client...');
        return new PrismaClient({ datasources: { db: { url } } });
    }

    const client = createPrismaClient();

    if (!client) {
        console.error('❌ Client is null!');
        process.exit(1);
    }

    console.log('✅ Client created. Connecting...');
    await client.$connect();
    console.log('✅ Connected successfully.');

    const user = await client.user.findUnique({ where: { email: 'demo-clinician@holilabs.xyz' } });
    console.log(`✅ Query result: ${user ? 'User Found' : 'User Not Found'}`);

    await client.$disconnect();

} catch (e) {
    console.error('💥 Error:', e);
}
