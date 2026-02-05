const { execSync } = require('child_process');
const path = require('path');

/**
 * Azure Trusted Signing script for electron-builder
 *
 * This script signs Windows executables using Azure Trusted Signing (cloud HSM).
 * Required for CI/CD since EV certificates can no longer be exported as PFX files.
 *
 * @param {Object} configuration - electron-builder configuration
 * @param {string} configuration.path - Full path to file being signed
 * @param {string} configuration.hash - File hash (not used, kept for compatibility)
 * @param {boolean} configuration.isNest - Whether this is a nested signing operation
 */
exports.default = async function(configuration) {
  const file = configuration.path;
  const fileName = path.basename(file);

  // Validate required environment variables
  const requiredEnvVars = [
    'AZURE_SIGNING_ENDPOINT',
    'AZURE_SIGNING_CERT_PROFILE',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Azure Trusted Signing Error: Missing required environment variables');
    console.error('Missing variables:', missingVars.join(', '));
    console.error('\nRequired GitHub Secrets:');
    requiredEnvVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Extract environment variables
  const endpoint = process.env.AZURE_SIGNING_ENDPOINT;
  const certProfile = process.env.AZURE_SIGNING_CERT_PROFILE;
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  // Validate file exists
  const fs = require('fs');
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  console.log(`\n🔐 Signing ${fileName} with Azure Trusted Signing...`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Profile: ${certProfile}`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   File size: ${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB`);

  // Construct AzureSignTool command
  // Note: Command is split for readability but execSync requires single string
  const azureSignTool = process.platform === 'win32' ? 'AzureSignTool' : 'azuresigntool';

  const command = [
    azureSignTool,
    'sign',
    `-kvu "${endpoint}"`,
    `-kvc "${certProfile}"`,
    `-kvt "${tenantId}"`,
    `-kvi "${clientId}"`,
    `-kvs "${clientSecret}"`,
    `-tr "http://timestamp.digicert.com"`, // RFC 3161 timestamp server
    `-td sha256`, // Timestamp digest algorithm
    `-v`, // Verbose output
    `"${file}"`
  ].join(' ');

  try {
    // Execute signing command
    const output = execSync(command, {
      stdio: ['inherit', 'pipe', 'pipe'],
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for output
    });

    console.log(output);
    console.log(`✅ Successfully signed ${fileName}\n`);

  } catch (error) {
    console.error(`\n❌ Failed to sign ${fileName}`);
    console.error('Error details:', error.message);

    if (error.stdout) {
      console.error('\nStdout:', error.stdout);
    }
    if (error.stderr) {
      console.error('\nStderr:', error.stderr);
    }

    // Provide helpful error messages for common issues
    if (error.message.includes('not found') || error.message.includes('command not found')) {
      console.error('\n💡 Troubleshooting: AzureSignTool not found');
      console.error('   Make sure to install it in CI/CD:');
      console.error('   dotnet tool install --global AzureSignTool');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n💡 Troubleshooting: Authentication failed');
      console.error('   - Check AZURE_CLIENT_ID and AZURE_CLIENT_SECRET');
      console.error('   - Verify service principal has "Trusted Signing Certificate Profile Signer" role');
    } else if (error.message.includes('certificate profile')) {
      console.error('\n💡 Troubleshooting: Certificate profile not found');
      console.error('   - Check AZURE_SIGNING_CERT_PROFILE matches Azure portal');
      console.error('   - Ensure business validation is complete');
    }

    throw error;
  }
};
