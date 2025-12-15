/**
 * Meilisearch Client
 * Fast, typo-tolerant search engine for patient records
 *
 * Features:
 * - Sub-50ms search responses
 * - Typo tolerance (finds "Jhon" when searching for "John")
 * - Highlighting and snippeting
 * - Faceted search (filter by status, tags, etc.)
 */

import { MeiliSearch, Index } from 'meilisearch';

// Initialize Meilisearch client
const getMeiliClient = () => {
  const host = process.env.MEILI_HOST || 'http://localhost:7700';
  const masterKey = process.env.MEILI_MASTER_KEY;

  if (!masterKey) {
    throw new Error('MEILI_MASTER_KEY environment variable is required for Meilisearch authentication');
  }

  return new MeiliSearch({
    host,
    apiKey: masterKey,
  });
};

// Index names
export const PATIENT_INDEX = 'patients';

/**
 * Patient document for Meilisearch
 */
export interface PatientSearchDocument {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  fullName: string; // Searchable combined name
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null; // ISO string
  gender: string;
  address: string | null;
  assignedClinicianId: string;
  isActive: boolean;
  isPalliativeCare: boolean;
  createdAt: number; // Unix timestamp for sorting
  updatedAt: number;
}

/**
 * Initialize Meilisearch indexes with proper configuration
 */
export async function initializeMeilisearch() {
  const client = getMeiliClient();

  try {
    // Check if Meilisearch is available
    await client.health();

    // Create or get patient index
    const patientIndex = client.index(PATIENT_INDEX);

    // Configure searchable attributes (in order of importance)
    await patientIndex.updateSearchableAttributes([
      'fullName',
      'firstName',
      'lastName',
      'mrn',
      'email',
      'phone',
    ]);

    // Configure filterable attributes
    await patientIndex.updateFilterableAttributes([
      'assignedClinicianId',
      'isActive',
      'isPalliativeCare',
      'gender',
    ]);

    // Configure sortable attributes
    await patientIndex.updateSortableAttributes(['createdAt', 'updatedAt', 'lastName']);

    // Configure displayed attributes (what to return in results)
    await patientIndex.updateDisplayedAttributes([
      'id',
      'mrn',
      'firstName',
      'lastName',
      'fullName',
      'email',
      'phone',
      'dateOfBirth',
      'gender',
      'address',
      'assignedClinicianId',
      'isActive',
      'isPalliativeCare',
      'createdAt',
      'updatedAt',
    ]);

    // Configure ranking rules (how to rank results)
    await patientIndex.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'updatedAt:desc',
    ]);

    // Configure typo tolerance
    await patientIndex.updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
    });

    console.log('✅ Meilisearch initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Meilisearch:', error);
    return false;
  }
}

/**
 * Index a single patient document
 */
export async function indexPatient(patient: PatientSearchDocument) {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    await index.addDocuments([patient]);
    return true;
  } catch (error) {
    console.error('Failed to index patient:', error);
    return false;
  }
}

/**
 * Index multiple patient documents in bulk
 */
export async function indexPatients(patients: PatientSearchDocument[]) {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    await index.addDocuments(patients);
    // Note: Meilisearch indexing is asynchronous
    // The documents will be indexed in the background
    return true;
  } catch (error) {
    console.error('Failed to index patients:', error);
    return false;
  }
}

/**
 * Update a patient document
 */
export async function updatePatient(patient: Partial<PatientSearchDocument> & { id: string }) {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    await index.updateDocuments([patient]);
    return true;
  } catch (error) {
    console.error('Failed to update patient:', error);
    return false;
  }
}

/**
 * Delete a patient document
 */
export async function deletePatient(patientId: string) {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    await index.deleteDocument(patientId);
    return true;
  } catch (error) {
    console.error('Failed to delete patient:', error);
    return false;
  }
}

/**
 * Delete multiple patient documents
 */
export async function deletePatients(patientIds: string[]) {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    await index.deleteDocuments(patientIds);
    return true;
  } catch (error) {
    console.error('Failed to delete patients:', error);
    return false;
  }
}

/**
 * Search patients with filters
 */
export interface PatientSearchOptions {
  query: string;
  clinicianId?: string;
  isActive?: boolean;
  isPalliativeCare?: boolean;
  gender?: string;
  limit?: number;
  offset?: number;
  sort?: string[];
}

export async function searchPatients(options: PatientSearchOptions) {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    // Build filter string
    const filters: string[] = [];

    if (options.clinicianId) {
      filters.push(`assignedClinicianId = "${options.clinicianId}"`);
    }

    if (options.isActive !== undefined) {
      filters.push(`isActive = ${options.isActive}`);
    }

    if (options.isPalliativeCare !== undefined) {
      filters.push(`isPalliativeCare = ${options.isPalliativeCare}`);
    }

    if (options.gender) {
      filters.push(`gender = "${options.gender}"`);
    }

    // Perform search
    const results = await index.search(options.query, {
      filter: filters.length > 0 ? filters : undefined,
      limit: options.limit || 20,
      offset: options.offset || 0,
      sort: options.sort,
      attributesToHighlight: ['fullName', 'email', 'mrn'],
      attributesToCrop: ['address'],
      cropLength: 50,
    });

    return {
      hits: results.hits,
      estimatedTotalHits: results.estimatedTotalHits,
      query: results.query,
      limit: results.limit,
      offset: results.offset,
      processingTimeMs: results.processingTimeMs,
    };
  } catch (error) {
    console.error('Failed to search patients:', error);
    throw error;
  }
}

/**
 * Clear all documents from patient index (use with caution)
 */
export async function clearPatientIndex() {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    await index.deleteAllDocuments();
    return true;
  } catch (error) {
    console.error('Failed to clear patient index:', error);
    return false;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  const client = getMeiliClient();
  const index = client.index(PATIENT_INDEX);

  try {
    const stats = await index.getStats();
    return stats;
  } catch (error) {
    console.error('Failed to get index stats:', error);
    return null;
  }
}

/**
 * Reindex all patients from database
 * This should be run when first setting up Meilisearch or after data corruption
 */
export async function reindexAllPatients(prisma: any, batchSize: number = 100) {
  const client = getMeiliClient();

  try {
    // Get total count
    const totalPatients = await prisma.patient.count();
    console.log(`🔄 Reindexing ${totalPatients} patients...`);

    // Process in batches
    let processed = 0;
    while (processed < totalPatients) {
      const patients = await prisma.patient.findMany({
        take: batchSize,
        skip: processed,
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          assignedClinicianId: true,
          isActive: true,
          isPalliativeCare: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Convert to search documents
      const documents: PatientSearchDocument[] = patients.map((p: any) => ({
        id: p.id,
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        email: p.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth?.toISOString() || null,
        gender: p.gender,
        address: p.address,
        assignedClinicianId: p.assignedClinicianId,
        isActive: p.isActive,
        isPalliativeCare: p.isPalliativeCare || false,
        createdAt: p.createdAt.getTime(),
        updatedAt: p.updatedAt.getTime(),
      }));

      // Index batch
      await indexPatients(documents);

      processed += patients.length;
      console.log(`  ✓ Indexed ${processed}/${totalPatients} patients`);
    }

    console.log('✅ Reindexing complete');
    return true;
  } catch (error) {
    console.error('❌ Failed to reindex patients:', error);
    return false;
  }
}

/**
 * Export client for advanced usage
 */
export const meilisearchClient = getMeiliClient();
