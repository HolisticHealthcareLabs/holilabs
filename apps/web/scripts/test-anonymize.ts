
// Force development environment to avoid SSL requirements for local DB
// We set this before imports to ensure it applies
// process.env.NODE_ENV = 'development';

import { anonymizePatientData } from "../src/lib/presidio";

// Get text from command line args or use default
const text = process.argv[2] || "Patient John Doe (DOB: 01/01/1980) presented with a fever and high blood pressure.";

async function main() {
    console.log("\n🔍 Testing Presidio De-identification");
    console.log("-----------------------------------");
    console.log("📝 Input Text:");
    console.log(`"${text}"`);

    try {
        console.log("\n🔄 Processing...");
        const safeText = await anonymizePatientData(text);

        console.log("\n✅ Result:");
        console.log(`"${safeText}"`);
        console.log("-----------------------------------");

        if (safeText === text) {
            console.log("⚠️  Warning: Output matches input. Presidio might not be running or no PII was detected.");
        }
    } catch (error) {
        console.error("\n❌ Error calling Presidio:", error);
        console.log("\nTip: Make sure Presidio is running on ports 3000/3001");
    }
}

main().catch(console.error);
