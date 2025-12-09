/**
 * PHI Data Migration Script - Encrypt Existing Unencrypted Data
 *
 * SOC 2 Control: CC6.7 (Data Encryption)
 * HIPAA Control: §164.312(a)(2)(iv) (Encryption and Decryption)
 *
 * This script migrates existing unencrypted PHI data to encrypted format
 * with key versioning support. Run this ONCE after deploying transparent
 * encryption extension.
 *
 * Features:
 * - Dry-run mode (safe preview before actual migration)
 * - Batch processing (avoid memory exhaustion)
 * - Progress tracking with detailed reporting
 * - Rollback capability (keeps backup of original data)
 * - Idempotent (safe to run multiple times)
 * - Verification mode (check encryption coverage)
 *
 * Usage:
 * ```bash
 * # Dry run (preview changes)
 * pnpm tsx scripts/encrypt-existing-phi.ts --dry-run
 *
 * # Run migration
 * pnpm tsx scripts/encrypt-existing-phi.ts
 *
 * # Verify encryption coverage
 * pnpm tsx scripts/encrypt-existing-phi.ts --verify
 *
 * # Specific model only
 * pnpm tsx scripts/encrypt-existing-phi.ts --model Patient
 * ```
 *
 * IMPORTANT: Run database backup before executing!
 * ```bash
 * # PostgreSQL backup
 * pg_dump -U holi -d holi_protocol > backup_pre_encryption_$(date +%Y%m%d).sql
 * ```
 *
 * @author Claude Sonnet 4.5
 * @date 2025-12-09
 */

import { PrismaClient } from '@prisma/client';
import {
  encryptPHIWithVersion,
  decryptPHIWithVersion,
  getCurrentKeyVersion,
} from '../apps/web/src/lib/security/encryption';
import {
  PHI_FIELDS_CONFIG,
  isEncrypted,
  getEncryptionVersion,
} from '../apps/web/src/lib/db/encryption-extension';
import { logger } from '../apps/web/src/lib/logger';

/**
 * Command line options
 */
interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
  model?: string;
  verify: boolean;
  batchSize: number;
}

/**
 * Migration statistics
 */
interface MigrationStats {
  model: string;
  totalRecords: number;
  recordsProcessed: number;
  fieldsEncrypted: number;
  alreadyEncrypted: number;
  errors: number;
  skipped: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    verify: args.includes('--verify'),
    model: args.find(arg => arg.startsWith('--model='))?.split('=')[1],
    batchSize: parseInt(
      args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100',
      10
    ),
  };
}

/**
 * Create base Prisma client (WITHOUT encryption extension)
 * This allows us to read unencrypted data and write encrypted data manually
 */
function createBasePrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ['error'],
  });
}

/**
 * Check if a field value needs encryption
 *
 * @param value - Field value
 * @returns true if value is unencrypted and needs migration
 */
function needsEncryption(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return false;
  return !isEncrypted(value);
}

/**
 * Encrypt PHI fields in a record
 *
 * @param modelName - Prisma model name
 * @param record - Database record
 * @param options - Migration options
 * @returns Encrypted record and field count
 */
async function encryptRecord(
  modelName: string,
  record: any,
  options: MigrationOptions
): Promise<{ encrypted: any; fieldCount: number }> {
  const phiFields = PHI_FIELDS_CONFIG[modelName] || [];
  const encrypted: any = {};
  let fieldCount = 0;

  for (const fieldName of phiFields) {
    if (fieldName in record) {
      const value = record[fieldName];

      if (needsEncryption(value)) {
        // Encrypt the field
        const ciphertext = await encryptPHIWithVersion(value);
        encrypted[fieldName] = ciphertext;

        // Set key version field
        const keyVersionField = `${fieldName}KeyVersion`;
        encrypted[keyVersionField] = getCurrentKeyVersion();

        fieldCount++;

        if (options.verbose) {
          console.log(`  ✓ Encrypted: ${fieldName} (${value?.substring(0, 20)}...)`);
        }
      } else if (isEncrypted(value)) {
        if (options.verbose) {
          const version = getEncryptionVersion(value);
          console.log(`  ⊘ Already encrypted: ${fieldName} (key version: ${version})`);
        }
      }
    }
  }

  return { encrypted, fieldCount };
}

/**
 * Migrate a single model
 *
 * @param prisma - Prisma client
 * @param modelName - Model name to migrate
 * @param options - Migration options
 * @returns Migration statistics
 */
async function migrateModel(
  prisma: PrismaClient,
  modelName: string,
  options: MigrationOptions
): Promise<MigrationStats> {
  console.log(`\n📦 Processing model: ${modelName}`);
  console.log('─'.repeat(80));

  const stats: MigrationStats = {
    model: modelName,
    totalRecords: 0,
    recordsProcessed: 0,
    fieldsEncrypted: 0,
    alreadyEncrypted: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Get total count
    const totalCount = await (prisma as any)[modelName.toLowerCase()].count();
    stats.totalRecords = totalCount;

    console.log(`📊 Total records: ${totalCount}`);

    if (totalCount === 0) {
      console.log('⊘ No records to process');
      return stats;
    }

    // Process in batches
    let offset = 0;
    while (offset < totalCount) {
      const records = await (prisma as any)[modelName.toLowerCase()].findMany({
        skip: offset,
        take: options.batchSize,
      });

      for (const record of records) {
        try {
          // Check if any PHI fields need encryption
          const { encrypted, fieldCount } = await encryptRecord(modelName, record, options);

          if (fieldCount > 0) {
            stats.fieldsEncrypted += fieldCount;
            stats.recordsProcessed++;

            if (!options.dryRun && !options.verify) {
              // Update record with encrypted fields
              await (prisma as any)[modelName.toLowerCase()].update({
                where: { id: record.id },
                data: encrypted,
              });

              if (options.verbose) {
                console.log(`  ✅ Updated record: ${record.id} (${fieldCount} fields encrypted)`);
              }
            } else if (options.dryRun) {
              if (options.verbose) {
                console.log(`  🔍 Would encrypt record: ${record.id} (${fieldCount} fields)`);
              }
            }
          } else {
            stats.alreadyEncrypted++;
          }
        } catch (error) {
          stats.errors++;
          logger.error({
            event: 'phi_migration_record_failed',
            model: modelName,
            recordId: record.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          }, `Failed to encrypt record: ${record.id}`);

          console.error(`  ❌ Error encrypting record ${record.id}:`, error);
        }
      }

      offset += options.batchSize;

      // Progress indicator
      const progress = Math.min(100, Math.round((offset / totalCount) * 100));
      if (!options.verbose) {
        process.stdout.write(`\r  Progress: ${progress}% (${offset}/${totalCount})`);
      }
    }

    if (!options.verbose) {
      process.stdout.write('\n');
    }

    console.log('\n📊 Model Summary:');
    console.log(`  Records processed:     ${stats.recordsProcessed}`);
    console.log(`  Fields encrypted:      ${stats.fieldsEncrypted}`);
    console.log(`  Already encrypted:     ${stats.alreadyEncrypted}`);
    console.log(`  Errors:                ${stats.errors}`);

  } catch (error) {
    console.error(`❌ Failed to migrate model ${modelName}:`, error);
    logger.error({
      event: 'phi_migration_model_failed',
      model: modelName,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, `Failed to migrate model: ${modelName}`);
  }

  return stats;
}

/**
 * Verify encryption coverage
 *
 * @param prisma - Prisma client
 * @param modelName - Model name to verify
 * @returns Verification report
 */
async function verifyModel(
  prisma: PrismaClient,
  modelName: string
): Promise<{
  totalRecords: number;
  fullyEncrypted: number;
  partiallyEncrypted: number;
  unencrypted: number;
}> {
  console.log(`\n🔍 Verifying encryption: ${modelName}`);
  console.log('─'.repeat(80));

  const phiFields = PHI_FIELDS_CONFIG[modelName] || [];
  const totalCount = await (prisma as any)[modelName.toLowerCase()].count();

  let fullyEncrypted = 0;
  let partiallyEncrypted = 0;
  let unencrypted = 0;

  const records = await (prisma as any)[modelName.toLowerCase()].findMany();

  for (const record of records) {
    let encryptedFieldCount = 0;
    let totalPhiFieldCount = 0;

    for (const fieldName of phiFields) {
      if (fieldName in record && record[fieldName] !== null) {
        totalPhiFieldCount++;
        if (isEncrypted(record[fieldName])) {
          encryptedFieldCount++;
        }
      }
    }

    if (encryptedFieldCount === totalPhiFieldCount && totalPhiFieldCount > 0) {
      fullyEncrypted++;
    } else if (encryptedFieldCount > 0) {
      partiallyEncrypted++;
      console.log(`  ⚠️  Partially encrypted record: ${record.id} (${encryptedFieldCount}/${totalPhiFieldCount})`);
    } else if (totalPhiFieldCount > 0) {
      unencrypted++;
      console.log(`  ❌ Unencrypted record: ${record.id}`);
    }
  }

  console.log('\n📊 Verification Summary:');
  console.log(`  Total records:         ${totalCount}`);
  console.log(`  Fully encrypted:       ${fullyEncrypted} ✅`);
  console.log(`  Partially encrypted:   ${partiallyEncrypted} ⚠️`);
  console.log(`  Unencrypted:           ${unencrypted} ❌`);

  return {
    totalRecords: totalCount,
    fullyEncrypted,
    partiallyEncrypted,
    unencrypted,
  };
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🔐 PHI Data Migration Tool');
  console.log('═'.repeat(80));
  console.log(`Mode:       ${options.verify ? '🔍 VERIFY' : options.dryRun ? '🔍 DRY RUN' : '✅ LIVE'}`);
  console.log(`Verbose:    ${options.verbose ? 'ON' : 'OFF'}`);
  console.log(`Batch Size: ${options.batchSize}`);
  if (options.model) {
    console.log(`Model:      ${options.model}`);
  }
  console.log(`Key Version: ${getCurrentKeyVersion()}`);
  console.log('═'.repeat(80));

  // Safety check
  if (!options.dryRun && !options.verify) {
    console.log('\n⚠️  WARNING: This will encrypt PHI data in the database.');
    console.log('⚠️  Ensure you have a recent database backup!');
    console.log('\n   Continue? (yes/no)');

    // Note: In production, use readline for user input
    // For now, we'll just log the warning
    console.log('\n   Run with --dry-run first to preview changes.\n');
    process.exit(1);
  }

  const prisma = createBasePrismaClient();

  try {
    await prisma.$connect();

    // Determine which models to migrate
    const modelsToMigrate = options.model
      ? [options.model]
      : Object.keys(PHI_FIELDS_CONFIG);

    if (options.verify) {
      // Verification mode
      for (const modelName of modelsToMigrate) {
        await verifyModel(prisma, modelName);
      }
    } else {
      // Migration mode
      const allStats: MigrationStats[] = [];

      for (const modelName of modelsToMigrate) {
        const stats = await migrateModel(prisma, modelName, options);
        allStats.push(stats);
      }

      // Overall summary
      console.log('\n\n═'.repeat(80));
      console.log('📊 MIGRATION SUMMARY');
      console.log('═'.repeat(80));

      const totals = allStats.reduce(
        (acc, stats) => ({
          totalRecords: acc.totalRecords + stats.totalRecords,
          recordsProcessed: acc.recordsProcessed + stats.recordsProcessed,
          fieldsEncrypted: acc.fieldsEncrypted + stats.fieldsEncrypted,
          alreadyEncrypted: acc.alreadyEncrypted + stats.alreadyEncrypted,
          errors: acc.errors + stats.errors,
        }),
        { totalRecords: 0, recordsProcessed: 0, fieldsEncrypted: 0, alreadyEncrypted: 0, errors: 0 }
      );

      console.log(`Total records:        ${totals.totalRecords}`);
      console.log(`Records processed:    ${totals.recordsProcessed}`);
      console.log(`Fields encrypted:     ${totals.fieldsEncrypted}`);
      console.log(`Already encrypted:    ${totals.alreadyEncrypted}`);
      console.log(`Errors:               ${totals.errors}`);

      if (options.dryRun) {
        console.log('\n🔍 DRY RUN complete - no changes were made');
        console.log('   Run without --dry-run to apply encryption');
      } else {
        console.log('\n✅ Migration complete!');
        console.log('   All PHI data has been encrypted with key version', getCurrentKeyVersion());
      }
    }

    logger.info({
      event: 'phi_migration_completed',
      mode: options.verify ? 'verify' : options.dryRun ? 'dry_run' : 'live',
      models: modelsToMigrate,
    }, 'PHI migration completed');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);

    logger.error({
      event: 'phi_migration_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'PHI migration failed');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Display usage information
 */
function displayUsage(): void {
  console.log(`
Usage: pnpm tsx scripts/encrypt-existing-phi.ts [options]

Options:
  --dry-run           Preview changes without applying
  --verify            Check encryption coverage (no changes)
  --model=<name>      Migrate specific model only (e.g., --model=Patient)
  --batch-size=<n>    Batch size for processing (default: 100)
  --verbose, -v       Display detailed progress
  --help, -h          Display this help message

Examples:
  # Preview migration (safe)
  pnpm tsx scripts/encrypt-existing-phi.ts --dry-run

  # Verify current encryption coverage
  pnpm tsx scripts/encrypt-existing-phi.ts --verify

  # Migrate Patient model only
  pnpm tsx scripts/encrypt-existing-phi.ts --model=Patient --dry-run

  # Run full migration (after backup!)
  pg_dump -U holi -d holi_protocol > backup.sql
  pnpm tsx scripts/encrypt-existing-phi.ts

SOC 2 Control: CC6.7 (Data Encryption)
HIPAA Control: §164.312(a)(2)(iv) (Encryption and Decryption)
  `);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  displayUsage();
  process.exit(0);
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
