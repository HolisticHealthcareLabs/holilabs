/**
 * Test script for environment variable validation
 *
 * This script tests the env validation by temporarily unsetting a required variable
 * to ensure the validation properly fails and exits.
 */

import { execSync } from 'child_process';

console.log('🧪 Testing Environment Variable Validation\n');

// Test 1: Validation should pass with current .env
console.log('Test 1: Validating with current environment...');
try {
  execSync('tsx -e "import(\'@/lib/env\'); console.log(\'✅ Validation passed\');"', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('❌ Test 1 FAILED: Validation should have passed with current .env');
  process.exit(1);
}

console.log('\n');

// Test 2: Validation should fail without NEXT_PUBLIC_SUPABASE_URL
console.log('Test 2: Testing validation without NEXT_PUBLIC_SUPABASE_URL...');
try {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_URL;

  execSync('tsx -e "import(\'@/lib/env\');"', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env,
  });

  console.error('❌ Test 2 FAILED: Validation should have failed without NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
} catch (error) {
  console.log('✅ Test 2 PASSED: Validation correctly failed without NEXT_PUBLIC_SUPABASE_URL');
}

console.log('\n');

// Test 3: Validation should fail without NEXT_PUBLIC_SUPABASE_ANON_KEY
console.log('Test 3: Testing validation without NEXT_PUBLIC_SUPABASE_ANON_KEY...');
try {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  execSync('tsx -e "import(\'@/lib/env\');"', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env,
  });

  console.error('❌ Test 3 FAILED: Validation should have failed without NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
} catch (error) {
  console.log('✅ Test 3 PASSED: Validation correctly failed without NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

console.log('\n');

// Test 4: Validation should fail without NEXT_PUBLIC_APP_URL
console.log('Test 4: Testing validation without NEXT_PUBLIC_APP_URL...');
try {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_APP_URL;

  execSync('tsx -e "import(\'@/lib/env\');"', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env,
  });

  console.error('❌ Test 4 FAILED: Validation should have failed without NEXT_PUBLIC_APP_URL');
  process.exit(1);
} catch (error) {
  console.log('✅ Test 4 PASSED: Validation correctly failed without NEXT_PUBLIC_APP_URL');
}

console.log('\n🎉 All tests passed! Environment validation is working correctly.\n');
