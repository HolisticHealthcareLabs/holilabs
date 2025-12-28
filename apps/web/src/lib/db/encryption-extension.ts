/**
 * Prisma Transparent Encryption Extension
 *
 * SOC 2 Control: CC6.7 (Data Encryption)
 * HIPAA Control: §164.312(a)(2)(iv) (Encryption and Decryption)
 *
 * Automatically encrypts PHI fields on write and decrypts on read.
 * Developers never touch encryption directly - it's 100% transparent.
 *
 * Features:
 * - Automatic field-level encryption for PHI
 * - Key versioning support (seamless key rotation)
 * - Backward compatibility with unencrypted data
 * - Zero code changes required in application logic
 * - Performance-optimized with async crypto
 * - Null-safe (preserves NULL values)
 *
 * Usage:
 * ```typescript
 * import { prisma } from '@/lib/prisma'; // Already extended
 *
 * // Automatic encryption
 * const patient = await prisma.patient.create({
 *   data: {
 *     firstName: 'John',  // ← Encrypted automatically
 *     lastName: 'Doe',    // ← Encrypted automatically
 *     email: 'john@example.com', // ← Encrypted automatically
 *     ssn: '123-45-6789', // ← Encrypted automatically
 *   },
 * });
 *
 * // Automatic decryption
 * console.log(patient.firstName); // ← "John" (decrypted automatically)
 * ```
 *
 * @author Claude Sonnet 4.5
 * @date 2025-12-09
 */

import { Prisma } from '@prisma/client';
import {
  encryptPHIWithVersion,
  decryptPHIWithVersion,
  getCurrentKeyVersion,
} from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

/**
 * PHI fields configuration
 *
 * Maps model names to arrays of field names that contain PHI.
 * Add new models/fields here as needed.
 */
const PHI_FIELDS_CONFIG: Record<string, string[]> = {
  Patient: [
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'primaryContactPhone',
    'primaryContactEmail',
    'primaryContactAddress',
    'secondaryContactPhone',
    'secondaryContactEmail',
    'emergencyContactPhone',
    // Brazilian national IDs (CRITICAL for LGPD compliance)
    'cpf',
    'rg',
    'cns',
    // Medical Record Numbers
    'mrn',
    'externalMrn',
  ],
  Prescription: [
    'patientInstructions', // May contain sensitive info
    'pharmacyNotes',
  ],
  Consultation: [
    'chiefComplaint',
    'historyOfPresentIllness',
    'reviewOfSystems',
    'physicalExamination',
    'assessmentAndPlan',
    'notes',
  ],
  LabResult: [
    'interpretation',
    'notes',
  ],
  Invoice: [
    'billingAddress',
    'patientNotes',
  ],
};

/**
 * Get key version field name for a given field
 *
 * @param fieldName - Field name (e.g., 'firstName')
 * @returns Key version field name (e.g., 'firstNameKeyVersion')
 */
function getKeyVersionField(fieldName: string): string {
  return `${fieldName}KeyVersion`;
}

/**
 * Check if a field is PHI for a given model
 *
 * @param modelName - Prisma model name
 * @param fieldName - Field name
 * @returns true if field contains PHI
 */
function isPHIField(modelName: string, fieldName: string): boolean {
  const phiFields = PHI_FIELDS_CONFIG[modelName] || [];
  return phiFields.includes(fieldName);
}

/**
 * Encrypt all PHI fields in a data object
 *
 * @param modelName - Prisma model name
 * @param data - Input data object
 * @returns Data object with PHI fields encrypted
 */
async function encryptPHIFields(
  modelName: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  const encrypted: Record<string, any> = { ...data };
  const phiFields = PHI_FIELDS_CONFIG[modelName] || [];

  for (const fieldName of phiFields) {
    if (fieldName in data) {
      const plaintext = data[fieldName];

      // Skip if already encrypted (starts with 'v{version}:')
      if (typeof plaintext === 'string' && /^v\d+:/.test(plaintext)) {
        continue;
      }

      // Encrypt field
      const ciphertext = await encryptPHIWithVersion(plaintext);
      encrypted[fieldName] = ciphertext;

      // Set key version field
      const keyVersionField = getKeyVersionField(fieldName);
      encrypted[keyVersionField] = getCurrentKeyVersion();

      logger.debug({
        event: 'phi_field_encrypted',
        model: modelName,
        field: fieldName,
        keyVersion: getCurrentKeyVersion(),
      }, `Encrypted PHI field: ${modelName}.${fieldName}`);
    }
  }

  return encrypted;
}

/**
 * Decrypt all PHI fields in a result object
 *
 * @param modelName - Prisma model name
 * @param result - Query result object
 * @returns Result object with PHI fields decrypted
 */
async function decryptPHIFields(
  modelName: string,
  result: Record<string, any> | null
): Promise<Record<string, any> | null> {
  if (!result) return null;

  const decrypted: Record<string, any> = { ...result };
  const phiFields = PHI_FIELDS_CONFIG[modelName] || [];

  for (const fieldName of phiFields) {
    if (fieldName in result) {
      const ciphertext = result[fieldName];

      // Decrypt field
      const plaintext = await decryptPHIWithVersion(ciphertext);
      decrypted[fieldName] = plaintext;

      // Remove key version field from result (internal metadata)
      const keyVersionField = getKeyVersionField(fieldName);
      if (keyVersionField in decrypted) {
        delete decrypted[keyVersionField];
      }

      logger.debug({
        event: 'phi_field_decrypted',
        model: modelName,
        field: fieldName,
      }, `Decrypted PHI field: ${modelName}.${fieldName}`);
    }
  }

  return decrypted;
}

/**
 * Decrypt PHI fields in an array of results
 *
 * @param modelName - Prisma model name
 * @param results - Array of query results
 * @returns Array with PHI fields decrypted
 */
async function decryptPHIFieldsArray(
  modelName: string,
  results: Record<string, any>[]
): Promise<Record<string, any>[]> {
  return Promise.all(
    results.map((result) => decryptPHIFields(modelName, result))
  ) as Promise<Record<string, any>[]>;
}

/**
 * Prisma Client Extension for Transparent Encryption
 *
 * This extension automatically:
 * 1. Encrypts PHI fields before CREATE/UPDATE operations
 * 2. Decrypts PHI fields after READ operations
 * 3. Tracks encryption key versions for rotation support
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { encryptionExtension } from './encryption-extension';
 *
 * const prisma = new PrismaClient().$extends(encryptionExtension);
 * ```
 */
export const encryptionExtension = Prisma.defineExtension({
  name: 'transparent-phi-encryption',

  query: {
    // Universal handler for all models
    $allModels: {
      /**
       * Intercept CREATE operations
       * Encrypt PHI fields before insertion
       */
      async create({ model, operation, args, query }) {
        if (args.data) {
          args.data = (await encryptPHIFields(model, args.data)) as typeof args.data;
        }

        const result = await query(args);

        // Decrypt result for return
        return decryptPHIFields(model, result);
      },

      /**
       * Intercept CREATE MANY operations
       * Encrypt PHI fields in all records
       */
      async createMany({ model, operation, args, query }) {
        if (args.data) {
          if (Array.isArray(args.data)) {
            args.data = (await Promise.all(
              args.data.map((record) => encryptPHIFields(model, record))
            )) as typeof args.data;
          } else {
            args.data = (await encryptPHIFields(model, args.data)) as typeof args.data;
          }
        }

        return query(args);
      },

      /**
       * Intercept UPDATE operations
       * Encrypt PHI fields in update data
       */
      async update({ model, operation, args, query }) {
        if (args.data) {
          args.data = (await encryptPHIFields(model, args.data)) as typeof args.data;
        }

        const result = await query(args);

        // Decrypt result for return
        return decryptPHIFields(model, result);
      },

      /**
       * Intercept UPDATE MANY operations
       * Encrypt PHI fields in update data
       */
      async updateMany({ model, operation, args, query }) {
        if (args.data) {
          args.data = (await encryptPHIFields(model, args.data)) as typeof args.data;
        }

        return query(args);
      },

      /**
       * Intercept UPSERT operations
       * Encrypt PHI fields in both create and update data
       */
      async upsert({ model, operation, args, query }) {
        if (args.create) {
          args.create = (await encryptPHIFields(model, args.create)) as typeof args.create;
        }
        if (args.update) {
          args.update = (await encryptPHIFields(model, args.update)) as typeof args.update;
        }

        const result = await query(args);

        // Decrypt result for return
        return decryptPHIFields(model, result);
      },

      /**
       * Intercept FIND UNIQUE operations
       * Decrypt PHI fields in result
       */
      async findUnique({ model, operation, args, query }) {
        const result = await query(args);

        return decryptPHIFields(model, result);
      },

      /**
       * Intercept FIND FIRST operations
       * Decrypt PHI fields in result
       */
      async findFirst({ model, operation, args, query }) {
        const result = await query(args);

        return decryptPHIFields(model, result);
      },

      /**
       * Intercept FIND MANY operations
       * Decrypt PHI fields in all results
       */
      async findMany({ model, operation, args, query }) {
        const results = await query(args);

        if (Array.isArray(results)) {
          return decryptPHIFieldsArray(model, results);
        }

        return results;
      },

      /**
       * Intercept DELETE operations
       * Decrypt PHI fields in deleted record (for audit logs)
       */
      async delete({ model, operation, args, query }) {
        const result = await query(args);

        return decryptPHIFields(model, result);
      },

      /**
       * Note: DELETE MANY does not return deleted records,
       * so no decryption needed
       */
    },
  },
});

/**
 * Helper: Manually encrypt a single field
 *
 * Use this for edge cases where you need manual control.
 *
 * @param value - Plaintext value
 * @returns Encrypted value with key version
 *
 * @example
 * ```typescript
 * const encrypted = await encryptField('John Doe');
 * ```
 */
export async function encryptField(value: string | null): Promise<string | null> {
  return encryptPHIWithVersion(value);
}

/**
 * Helper: Manually decrypt a single field
 *
 * Use this for edge cases where you need manual control.
 *
 * @param value - Encrypted value
 * @returns Decrypted plaintext value
 *
 * @example
 * ```typescript
 * const plaintext = await decryptField(encrypted);
 * ```
 */
export async function decryptField(value: string | null): Promise<string | null> {
  return decryptPHIWithVersion(value);
}

/**
 * Helper: Check if a value is encrypted
 *
 * @param value - Value to check
 * @returns true if value is encrypted (starts with version prefix)
 *
 * @example
 * ```typescript
 * if (isEncrypted(patient.firstName)) {
 *   // Already encrypted, skip re-encryption
 * }
 * ```
 */
export function isEncrypted(value: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^v\d+:/.test(value);
}

/**
 * Helper: Get encryption key version from encrypted value
 *
 * @param value - Encrypted value
 * @returns Key version number, or null if not encrypted
 *
 * @example
 * ```typescript
 * const version = getEncryptionVersion(patient.firstName);
 * console.log(`Encrypted with key version: ${version}`);
 * ```
 */
export function getEncryptionVersion(value: string | null): number | null {
  if (!isEncrypted(value)) return null;

  const match = value!.match(/^v(\d+):/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Helper: Bulk re-encrypt records with new key version
 *
 * Use this during key rotation to re-encrypt all records.
 *
 * @param modelName - Prisma model name
 * @param records - Array of records to re-encrypt
 * @returns Re-encrypted records
 *
 * @example
 * ```typescript
 * const patients = await prisma.patient.findMany();
 * const reencrypted = await reencryptRecords('Patient', patients);
 *
 * for (const patient of reencrypted) {
 *   await prisma.patient.update({
 *     where: { id: patient.id },
 *     data: patient,
 *   });
 * }
 * ```
 */
export async function reencryptRecords(
  modelName: string,
  records: Record<string, any>[]
): Promise<Record<string, any>[]> {
  const phiFields = PHI_FIELDS_CONFIG[modelName] || [];

  return Promise.all(
    records.map(async (record) => {
      const reencrypted = { ...record };

      for (const fieldName of phiFields) {
        if (fieldName in record) {
          // Decrypt with old key
          const plaintext = await decryptPHIWithVersion(record[fieldName]);

          // Re-encrypt with current key
          const ciphertext = await encryptPHIWithVersion(plaintext);
          reencrypted[fieldName] = ciphertext;

          // Update key version
          const keyVersionField = getKeyVersionField(fieldName);
          reencrypted[keyVersionField] = getCurrentKeyVersion();
        }
      }

      logger.info({
        event: 'record_reencrypted',
        model: modelName,
        recordId: record.id,
        newKeyVersion: getCurrentKeyVersion(),
      }, `Re-encrypted record: ${modelName}#${record.id}`);

      return reencrypted;
    })
  );
}

/**
 * Export PHI fields configuration for external use
 */
export { PHI_FIELDS_CONFIG };
