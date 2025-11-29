/**
 * Security Headers Verification Script
 *
 * Verifies that all OWASP-recommended security headers are present
 * Run with: npx tsx scripts/verify-security-headers.ts <URL>
 *
 * Usage:
 *   npx tsx scripts/verify-security-headers.ts https://holilabs.app
 *   npx tsx scripts/verify-security-headers.ts http://localhost:3000
 */

interface SecurityHeader {
  name: string;
  required: boolean;
  expectedValues?: string[];
  description: string;
  owaspReference: string;
}

const SECURITY_HEADERS: SecurityHeader[] = [
  {
    name: 'Content-Security-Policy',
    required: true,
    description: 'Prevents XSS attacks by controlling allowed resource sources',
    owaspReference: 'OWASP A03:2021 – Injection',
  },
  {
    name: 'Strict-Transport-Security',
    required: true,
    description: 'Forces HTTPS connections (production only)',
    owaspReference: 'OWASP A02:2021 – Cryptographic Failures',
  },
  {
    name: 'X-Frame-Options',
    required: true,
    expectedValues: ['DENY', 'SAMEORIGIN'],
    description: 'Prevents clickjacking attacks',
    owaspReference: 'OWASP A08:2021 – Software and Data Integrity Failures',
  },
  {
    name: 'X-Content-Type-Options',
    required: true,
    expectedValues: ['nosniff'],
    description: 'Prevents MIME type sniffing',
    owaspReference: 'OWASP A04:2021 – Insecure Design',
  },
  {
    name: 'X-XSS-Protection',
    required: false,
    expectedValues: ['1; mode=block'],
    description: 'Legacy XSS protection (modern browsers use CSP)',
    owaspReference: 'OWASP A03:2021 – Injection',
  },
  {
    name: 'Referrer-Policy',
    required: true,
    description: 'Controls referrer information disclosure',
    owaspReference: 'OWASP A01:2021 – Broken Access Control',
  },
  {
    name: 'Permissions-Policy',
    required: true,
    description: 'Controls browser feature access',
    owaspReference: 'OWASP A04:2021 – Insecure Design',
  },
  {
    name: 'Cross-Origin-Opener-Policy',
    required: true,
    expectedValues: ['same-origin'],
    description: 'Isolates browsing context',
    owaspReference: 'OWASP A05:2021 – Security Misconfiguration',
  },
  {
    name: 'Cross-Origin-Resource-Policy',
    required: true,
    expectedValues: ['same-origin'],
    description: 'Protects against cross-origin attacks',
    owaspReference: 'OWASP A05:2021 – Security Misconfiguration',
  },
];

async function verifySecurityHeaders(url: string): Promise<void> {
  console.log(`\n🔒 Verifying security headers for: ${url}\n`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SecurityHeadersVerifier/1.0',
      },
    });

    const headers = response.headers;

    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const header of SECURITY_HEADERS) {
      const value = headers.get(header.name.toLowerCase());

      if (!value) {
        if (header.required) {
          console.log(`❌ ${header.name}: MISSING (REQUIRED)`);
          console.log(`   ${header.description}`);
          console.log(`   ${header.owaspReference}\n`);
          failed++;
        } else {
          console.log(`⚠️  ${header.name}: MISSING (OPTIONAL)`);
          console.log(`   ${header.description}\n`);
          warnings++;
        }
        continue;
      }

      // Check expected values if specified
      if (header.expectedValues) {
        const matchesExpected = header.expectedValues.some((expected) =>
          value.includes(expected)
        );

        if (matchesExpected) {
          console.log(`✅ ${header.name}: ${value}`);
          passed++;
        } else {
          console.log(`⚠️  ${header.name}: ${value}`);
          console.log(`   Expected one of: ${header.expectedValues.join(', ')}\n`);
          warnings++;
        }
      } else {
        console.log(`✅ ${header.name}: ${value}`);
        passed++;
      }
    }

    // Check for X-Powered-By (should be removed)
    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
      console.log(`⚠️  X-Powered-By: ${poweredBy} (Should be removed to hide tech stack)`);
      warnings++;
    } else {
      console.log(`✅ X-Powered-By: Removed (Tech stack hidden)`);
      passed++;
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SECURITY HEADERS VERIFICATION SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Passed:   ${passed}`);
    console.log(`❌ Failed:   ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`${'='.repeat(60)}\n`);

    if (failed === 0) {
      console.log(`🎉 All required security headers are present!\n`);
      process.exit(0);
    } else {
      console.log(`❌ ${failed} required security header(s) missing. Please fix before deployment.\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error fetching URL: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const url = args[0];

if (!url) {
  console.error(`\n❌ Usage: npx tsx scripts/verify-security-headers.ts <URL>\n`);
  console.error(`Examples:`);
  console.error(`  npx tsx scripts/verify-security-headers.ts https://holilabs.app`);
  console.error(`  npx tsx scripts/verify-security-headers.ts http://localhost:3000\n`);
  process.exit(1);
}

// Validate URL
try {
  new URL(url);
} catch {
  console.error(`\n❌ Invalid URL: ${url}\n`);
  process.exit(1);
}

verifySecurityHeaders(url);
