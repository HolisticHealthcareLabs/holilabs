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

// Initialize Meilisearch client (lazy initialization)
let _meiliClient: MeiliSearch | null = null;

const getMeiliClient = () => {
  if (_meiliClient) return _meiliClient;

  const host = process.env.MEILI_HOST || 'http://localhost:7700';
  const masterKey = process.env.MEILI_MASTER_KEY;

  if (!masterKey) {
    throw new Error('MEILI_MASTER_KEY environment variable is required for Meilisearch authentication');
  }

  _meiliClient = new MeiliSearch({
    host,
    apiKey: masterKey,
  });

  return _meiliClient;
};

// Index names
export const PATIENT_INDEX = 'patients';
export const MESSAGE_INDEX = 'messages';

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
 * Export client for advanced usage (lazy initialization)
 */
export function getMeilisearchClient() {
  return getMeiliClient();
}

// ============================================================================
// MESSAGE SEARCH
// ============================================================================

/**
 * Message document for Meilisearch
 */
export interface MessageSearchDocument {
  id: string;
  patientId: string;
  fromUserId: string;
  fromUserType: 'CLINICIAN' | 'PATIENT';
  fromUserName: string;
  toUserId: string;
  toUserType: 'CLINICIAN' | 'PATIENT';
  body: string;
  subject: string | null;
  hasAttachments: boolean;
  isRead: boolean;
  createdAt: number; // Unix timestamp for sorting
}

/**
 * Initialize Message search index
 */
export async function initializeMessageIndex() {
  const client = getMeiliClient();

  try {
    const messageIndex = client.index(MESSAGE_INDEX);

    // Configure searchable attributes (in order of importance)
    await messageIndex.updateSearchableAttributes([
      'body',
      'subject',
      'fromUserName',
    ]);

    // Configure filterable attributes
    await messageIndex.updateFilterableAttributes([
      'patientId',
      'fromUserId',
      'toUserId',
      'fromUserType',
      'toUserType',
      'isRead',
      'hasAttachments',
    ]);

    // Configure sortable attributes
    await messageIndex.updateSortableAttributes(['createdAt']);

    // Configure displayed attributes
    await messageIndex.updateDisplayedAttributes([
      'id',
      'patientId',
      'fromUserId',
      'fromUserType',
      'fromUserName',
      'toUserId',
      'toUserType',
      'body',
      'subject',
      'hasAttachments',
      'isRead',
      'createdAt',
    ]);

    // Configure ranking rules
    await messageIndex.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'createdAt:desc',
    ]);

    // Configure typo tolerance
    await messageIndex.updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
    });

    console.log('✅ Message search index initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize message search index:', error);
    return false;
  }
}

/**
 * Index a single message document
 */
export async function indexMessage(message: MessageSearchDocument) {
  const client = getMeiliClient();
  const index = client.index(MESSAGE_INDEX);

  try {
    await index.addDocuments([message]);
    return true;
  } catch (error) {
    console.error('Failed to index message:', error);
    return false;
  }
}

/**
 * Index multiple message documents in bulk
 */
export async function indexMessages(messages: MessageSearchDocument[]) {
  const client = getMeiliClient();
  const index = client.index(MESSAGE_INDEX);

  try {
    await index.addDocuments(messages);
    return true;
  } catch (error) {
    console.error('Failed to index messages:', error);
    return false;
  }
}

/**
 * Update a message document (e.g., when marked as read)
 */
export async function updateMessageIndex(message: Partial<MessageSearchDocument> & { id: string }) {
  const client = getMeiliClient();
  const index = client.index(MESSAGE_INDEX);

  try {
    await index.updateDocuments([message]);
    return true;
  } catch (error) {
    console.error('Failed to update message index:', error);
    return false;
  }
}

/**
 * Delete a message from search index
 */
export async function deleteMessageFromIndex(messageId: string) {
  const client = getMeiliClient();
  const index = client.index(MESSAGE_INDEX);

  try {
    await index.deleteDocument(messageId);
    return true;
  } catch (error) {
    console.error('Failed to delete message from index:', error);
    return false;
  }
}

/**
 * Search messages with filters
 */
export interface MessageSearchOptions {
  query: string;
  patientId?: string; // Filter by conversation (patient context)
  userId?: string; // Filter by participant (from or to)
  fromUserType?: 'CLINICIAN' | 'PATIENT';
  isRead?: boolean;
  hasAttachments?: boolean;
  limit?: number;
  offset?: number;
  sort?: string[];
}

export async function searchMessages(options: MessageSearchOptions) {
  const client = getMeiliClient();
  const index = client.index(MESSAGE_INDEX);

  try {
    // Build filter string
    const filters: string[] = [];

    if (options.patientId) {
      filters.push(`patientId = "${options.patientId}"`);
    }

    if (options.userId) {
      filters.push(`(fromUserId = "${options.userId}" OR toUserId = "${options.userId}")`);
    }

    if (options.fromUserType) {
      filters.push(`fromUserType = "${options.fromUserType}"`);
    }

    if (options.isRead !== undefined) {
      filters.push(`isRead = ${options.isRead}`);
    }

    if (options.hasAttachments !== undefined) {
      filters.push(`hasAttachments = ${options.hasAttachments}`);
    }

    // Perform search
    const results = await index.search(options.query, {
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      limit: options.limit || 20,
      offset: options.offset || 0,
      sort: options.sort || ['createdAt:desc'],
      attributesToHighlight: ['body', 'subject'],
      attributesToCrop: ['body'],
      cropLength: 100,
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
    console.error('Failed to search messages:', error);
    throw error;
  }
}

/**
 * Reindex all messages from database
 */
export async function reindexAllMessages(prisma: any, batchSize: number = 100) {
  const client = getMeiliClient();

  try {
    // Get total count
    const totalMessages = await prisma.message.count({
      where: { archivedAt: null },
    });
    console.log(`🔄 Reindexing ${totalMessages} messages...`);

    // Process in batches
    let processed = 0;
    while (processed < totalMessages) {
      const messages = await prisma.message.findMany({
        where: { archivedAt: null },
        take: batchSize,
        skip: processed,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Convert to search documents
      const documents: MessageSearchDocument[] = await Promise.all(
        messages.map(async (m: any) => {
          // Get sender name based on type
          let fromUserName = 'Unknown';
          if (m.fromUserType === 'PATIENT') {
            fromUserName = `${m.patient.firstName} ${m.patient.lastName}`;
          } else {
            const clinician = await prisma.user.findUnique({
              where: { id: m.fromUserId },
              select: { firstName: true, lastName: true },
            });
            if (clinician) {
              fromUserName = `Dr. ${clinician.firstName} ${clinician.lastName}`;
            }
          }

          return {
            id: m.id,
            patientId: m.patientId,
            fromUserId: m.fromUserId,
            fromUserType: m.fromUserType,
            fromUserName,
            toUserId: m.toUserId,
            toUserType: m.toUserType,
            body: m.body,
            subject: m.subject,
            hasAttachments: m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0,
            isRead: !!m.readAt,
            createdAt: m.createdAt.getTime(),
          };
        })
      );

      // Index batch
      await indexMessages(documents);

      processed += messages.length;
      console.log(`  ✓ Indexed ${processed}/${totalMessages} messages`);
    }

    console.log('✅ Message reindexing complete');
    return true;
  } catch (error) {
    console.error('❌ Failed to reindex messages:', error);
    return false;
  }
}
