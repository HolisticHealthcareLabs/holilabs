
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from current dir
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGemini(keyName: string) {
  const apiKey = process.env[keyName];
  console.log(`\nTesting ${keyName}...`);
  
  if (!apiKey) {
    console.log(`❌ ${keyName} is not set.`);
    return;
  }

  console.log(`Key starts with: ${apiKey.substring(0, 4)}...`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Say 'Hello, Holi Labs!'");
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ Success! Response: ${text.trim()}`);
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.status === 401 || error.status === 403) {
      console.log('   (Likely an invalid API key)');
    }
  }
}

async function runTests() {
  await testGemini('GOOGLE_AI_API_KEY');
  await testGemini('GEMINI_API_KEY');
}

runTests();
