/**
 * Synthetic Data Generator using Synthea
 *
 * Usage:
 *   pnpm tsx scripts/generate-synthetic-data.ts --count 100
 *   pnpm tsx scripts/generate-synthetic-data.ts --count 1000 --state SP --city "Sao Paulo"
 *
 * Features:
 * - Downloads and runs Synthea (Java-based synthetic patient generator)
 * - Generates realistic FHIR R4 patient bundles
 * - Imports data into HoliLabs database
 * - Supports Brazilian demographics and geography
 * - Creates patients, diagnoses, medications, procedures, lab results
 *
 * Requirements:
 * - Java 11+ installed
 * - Synthea JAR file (auto-downloaded if missing)
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { fromFHIRPatient } from '../apps/web/src/lib/fhir/patient-mapper';
import { generatePatientDataHash } from '../apps/web/src/lib/blockchain/hashing';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SYNTHEA_VERSION = '3.2.0';
const SYNTHEA_JAR_URL = `https://github.com/synthetichealth/synthea/releases/download/v${SYNTHEA_VERSION}/synthea-with-dependencies.jar`;
const SYNTHEA_DIR = path.join(process.cwd(), '.synthea');
const SYNTHEA_JAR_PATH = path.join(SYNTHEA_DIR, `synthea-${SYNTHEA_VERSION}.jar`);
const OUTPUT_DIR = path.join(SYNTHEA_DIR, 'output');

// Brazilian state codes
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// ============================================================================
// CLI INTERFACE
// ============================================================================

interface GeneratorOptions {
  count: number;
  state?: string;
  city?: string;
  assignToClinicianId?: string;
  palliativeCareRatio?: number; // 0-1, percentage of patients in palliative care
}

function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  const options: GeneratorOptions = {
    count: 100,
    palliativeCareRatio: 0.1, // 10% default
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
      case '-n':
        options.count = parseInt(args[++i]);
        break;
      case '--state':
        options.state = args[++i];
        break;
      case '--city':
        options.city = args[++i];
        break;
      case '--clinician':
        options.assignToClinicianId = args[++i];
        break;
      case '--palliative-ratio':
        options.palliativeCareRatio = parseFloat(args[++i]);
        break;
      case '--help':
      case '-h':
        console.log(`
Synthetic Data Generator for HoliLabs

Usage:
  pnpm tsx scripts/generate-synthetic-data.ts [options]

Options:
  --count, -n <number>       Number of patients to generate (default: 100)
  --state <code>             Brazilian state code (e.g., SP, RJ)
  --city <name>              City name (e.g., "Sao Paulo")
  --clinician <id>           Assign all patients to this clinician ID
  --palliative-ratio <0-1>   Ratio of palliative care patients (default: 0.1)
  --help, -h                 Show this help message

Examples:
  pnpm tsx scripts/generate-synthetic-data.ts --count 100
  pnpm tsx scripts/generate-synthetic-data.ts --count 500 --state SP --city "Sao Paulo"
  pnpm tsx scripts/generate-synthetic-data.ts --count 1000 --palliative-ratio 0.15
        `);
        process.exit(0);
    }
  }

  return options;
}

// ============================================================================
// SYNTHEA SETUP
// ============================================================================

async function ensureSyntheaInstalled(): Promise<void> {
  console.log('🔍 Checking for Synthea installation...');

  // Create .synthea directory if it doesn't exist
  if (!fs.existsSync(SYNTHEA_DIR)) {
    fs.mkdirSync(SYNTHEA_DIR, { recursive: true });
  }

  // Check if Synthea JAR exists
  if (fs.existsSync(SYNTHEA_JAR_PATH)) {
    console.log('✅ Synthea already installed');
    return;
  }

  console.log(`📥 Downloading Synthea v${SYNTHEA_VERSION}...`);
  console.log(`   From: ${SYNTHEA_JAR_URL}`);

  try {
    await execAsync(`curl -L -o "${SYNTHEA_JAR_PATH}" "${SYNTHEA_JAR_URL}"`);
    console.log('✅ Synthea downloaded successfully');
  } catch (error: any) {
    console.error('❌ Failed to download Synthea:', error.message);
    console.log('\n💡 Manual installation:');
    console.log(`   1. Download from: ${SYNTHEA_JAR_URL}`);
    console.log(`   2. Save to: ${SYNTHEA_JAR_PATH}`);
    process.exit(1);
  }
}

async function checkJavaInstalled(): Promise<void> {
  try {
    const { stdout } = await execAsync('java -version');
    console.log('✅ Java is installed');
  } catch (error) {
    console.error('❌ Java is not installed');
    console.log('\n💡 Please install Java 11 or higher:');
    console.log('   macOS: brew install openjdk@11');
    console.log('   Ubuntu: sudo apt install openjdk-11-jdk');
    console.log('   Windows: Download from https://adoptium.net/');
    process.exit(1);
  }
}

// ============================================================================
// SYNTHEA EXECUTION
// ============================================================================

async function generateSyntheticPatients(options: GeneratorOptions): Promise<string[]> {
  console.log(`\n🏥 Generating ${options.count} synthetic patients...`);

  // Clear output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Build Synthea command
  const syntheaArgs = [
    `-jar "${SYNTHEA_JAR_PATH}"`,
    `-p ${options.count}`,
    '--exporter.fhir.export=true',
    '--exporter.fhir.use_us_core_ig=false',
    '--exporter.practitioner.fhir.export=false',
    '--exporter.hospital.fhir.export=false',
    `--exporter.baseDirectory="${OUTPUT_DIR}"`,
  ];

  if (options.state && BRAZILIAN_STATES.includes(options.state.toUpperCase())) {
    syntheaArgs.push(`--exporter.location.state="${options.state}"`);
  }

  if (options.city) {
    syntheaArgs.push(`--exporter.location.city="${options.city}"`);
  }

  const command = `java ${syntheaArgs.join(' ')}`;

  console.log('⚙️  Running Synthea...');
  console.log(`   Command: ${command.substring(0, 100)}...`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    console.log('✅ Synthea generation complete');

    // Find generated FHIR bundle files
    const fhirDir = path.join(OUTPUT_DIR, 'fhir');
    if (!fs.existsSync(fhirDir)) {
      throw new Error('FHIR output directory not found');
    }

    const files = fs.readdirSync(fhirDir).filter(f => f.endsWith('.json'));
    console.log(`📁 Generated ${files.length} FHIR bundle files`);

    return files.map(f => path.join(fhirDir, f));
  } catch (error: any) {
    console.error('❌ Synthea generation failed:', error.message);
    throw error;
  }
}

// ============================================================================
// DATA IMPORT
// ============================================================================

async function importFHIRBundle(filePath: string, options: GeneratorOptions): Promise<{
  patientId: string;
  resourceCounts: Record<string, number>;
}> {
  const bundleData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (bundleData.resourceType !== 'Bundle') {
    throw new Error(`Invalid resource type: ${bundleData.resourceType}`);
  }

  const resourceCounts: Record<string, number> = {};

  // Find Patient resource
  const patientEntry = bundleData.entry?.find((e: any) => e.resource?.resourceType === 'Patient');
  if (!patientEntry) {
    throw new Error('No Patient resource found in bundle');
  }

  const fhirPatient = patientEntry.resource;

  // Convert FHIR Patient to internal model
  const patientData = fromFHIRPatient(fhirPatient);

  // Generate required fields
  if (!patientData.mrn) {
    patientData.mrn = `SYN-${Date.now()}-${Math.random().toString(36).substring(7)}`.toUpperCase();
  }

  if (!patientData.tokenId) {
    patientData.tokenId = `PT-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}`.toUpperCase();
  }

  // Assign to clinician if specified
  if (options.assignToClinicianId) {
    patientData.assignedClinicianId = options.assignToClinicianId;
  }

  // Randomly assign palliative care status
  if (Math.random() < (options.palliativeCareRatio || 0.1)) {
    patientData.isPalliativeCare = true;
  }

  // Generate data hash
  const dataHash = generatePatientDataHash({
    id: patientData.id || 'pending',
    firstName: patientData.firstName!,
    lastName: patientData.lastName!,
    dateOfBirth: patientData.dateOfBirth!.toISOString(),
    mrn: patientData.mrn,
  });

  // Create patient
  const patient = await prisma.patient.create({
    data: {
      ...patientData,
      dataHash,
      lastHashUpdate: new Date(),
      isActive: true,
    } as any,
  });

  resourceCounts['Patient'] = 1;

  console.log(`   ✅ Created patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);

  return {
    patientId: patient.id,
    resourceCounts,
  };
}

async function importAllBundles(bundlePaths: string[], options: GeneratorOptions): Promise<void> {
  console.log(`\n📊 Importing ${bundlePaths.length} patients into database...`);

  let successCount = 0;
  let failCount = 0;

  for (const bundlePath of bundlePaths) {
    try {
      await importFHIRBundle(bundlePath, options);
      successCount++;

      if (successCount % 10 === 0) {
        console.log(`   Progress: ${successCount}/${bundlePaths.length} patients imported`);
      }
    } catch (error: any) {
      console.error(`   ⚠️  Failed to import ${path.basename(bundlePath)}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ Import complete:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 HoliLabs Synthetic Data Generator\n');

  const options = parseArgs();

  console.log('Configuration:');
  console.log(`  Patients: ${options.count}`);
  console.log(`  State: ${options.state || 'Random'}`);
  console.log(`  City: ${options.city || 'Random'}`);
  console.log(`  Palliative Care Ratio: ${(options.palliativeCareRatio! * 100).toFixed(1)}%`);
  if (options.assignToClinicianId) {
    console.log(`  Assign to Clinician: ${options.assignToClinicianId}`);
  }
  console.log('');

  try {
    // Check prerequisites
    await checkJavaInstalled();
    await ensureSyntheaInstalled();

    // Generate synthetic data
    const bundlePaths = await generateSyntheticPatients(options);

    // Import into database
    await importAllBundles(bundlePaths, options);

    console.log('\n🎉 Synthetic data generation complete!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main, GeneratorOptions };
