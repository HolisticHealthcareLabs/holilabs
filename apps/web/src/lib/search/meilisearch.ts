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
import { logger } from '@/lib/logger';

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
export const PROVIDER_INDEX = 'providers';

/**
 * Runtime availability check — true only if Meilisearch is reachable
 * AND an API key is configured. Cached for a short window.
 */
let _meiliAvailable: boolean | null = null;
let _meiliAvailableExpiry = 0;
const MEILI_AVAILABILITY_TTL_MS = 30_000;

export async function isMeilisearchAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_meiliAvailable !== null && now < _meiliAvailableExpiry) {
    return _meiliAvailable;
  }

  if (!process.env.MEILI_MASTER_KEY) {
    _meiliAvailable = false;
    _meiliAvailableExpiry = now + MEILI_AVAILABILITY_TTL_MS;
    return false;
  }

  try {
    const client = getMeiliClient();
    await client.health();
    _meiliAvailable = true;
  } catch {
    _meiliAvailable = false;
  }
  _meiliAvailableExpiry = now + MEILI_AVAILABILITY_TTL_MS;
  return _meiliAvailable;
}

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

    logger.info({ event: 'initialized' }, '[Meilisearch]');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Meilisearch');
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
    logger.error({ err: error }, 'Failed to index patient');
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
    logger.error({ err: error }, 'Failed to index patients');
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
    logger.error({ err: error }, 'Failed to update patient');
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
    logger.error({ err: error }, 'Failed to delete patient');
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
    logger.error({ err: error }, 'Failed to delete patients');
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
    logger.error({ err: error }, 'Failed to search patients');
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
    logger.error({ err: error }, 'Failed to clear patient index');
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
    logger.error({ err: error }, 'Failed to get index stats');
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
    logger.info({ event: 'reindexing_patients', count: totalPatients }, '[Meilisearch]');

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
      logger.info({ event: 'patient_batch_indexed', processed, total: totalPatients }, '[Meilisearch]');
    }

    logger.info({ event: 'patient_reindex_complete' }, '[Meilisearch]');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to reindex patients');
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

    logger.info({ event: 'message_index_initialized' }, '[Meilisearch]');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize message search index');
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
    logger.error({ err: error }, 'Failed to index message');
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
    logger.error({ err: error }, 'Failed to index messages');
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
    logger.error({ err: error }, 'Failed to update message index');
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
    logger.error({ err: error }, 'Failed to delete message from index');
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
    logger.error({ err: error }, 'Failed to search messages');
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
    console.error('[Meilisearch]', { event: 'reindexing_messages', count: totalMessages });

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
      console.error('[Meilisearch]', { event: 'message_batch_indexed', processed, total: totalMessages });
    }

    console.error('[Meilisearch]', { event: 'message_reindex_complete' });
    return true;
  } catch (error) {
    console.error('❌ Failed to reindex messages:', error);
    return false;
  }
}

// ============================================================================
// PROVIDER SEARCH (Doctoralia-model public directory)
// ============================================================================

/**
 * Provider document indexed in Meilisearch.
 * Flat shape for fast filtering — joins resolved at index time.
 */
export interface ProviderSearchDocument {
  id: string;
  name: string;
  country: string;
  registryId: string;
  registryState: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  _geo?: { lat: number; lng: number };
  claimStatus: string;
  avgRating: number;
  reviewCount: number;
  completenessScore: number;
  isRegistryActive: boolean;
  publicProfileEnabled: boolean;
  bio: string | null;
  languages: string[];
  /** Array of specialty slugs for faceted filtering */
  specialtySlugs: string[];
  /** Array of specialty display names (EN/PT/ES concatenated) for fuzzy search */
  specialtyNames: string[];
  /** MedicalSystemType values accepted by this provider */
  systemTypes: string[];
  /** CAM flag — true if any specialty is CAM */
  hasCamSpecialty: boolean;
  /** Insurance plan slugs accepted */
  insurancePlanSlugs: string[];
  /** Establishment city-state strings */
  establishmentLocations: string[];
  updatedAt: number;
}

export async function initializeProviderIndex() {
  const client = getMeiliClient();
  try {
    const idx = client.index(PROVIDER_INDEX);

    await idx.updateSearchableAttributes([
      'name',
      'specialtyNames',
      'city',
      'state',
      'bio',
    ]);

    await idx.updateFilterableAttributes([
      'country',
      'state',
      'city',
      'claimStatus',
      'isRegistryActive',
      'publicProfileEnabled',
      'specialtySlugs',
      'systemTypes',
      'hasCamSpecialty',
      'insurancePlanSlugs',
      'languages',
      '_geo',
    ]);

    await idx.updateSortableAttributes([
      'avgRating',
      'reviewCount',
      'completenessScore',
      'name',
      'updatedAt',
      '_geo',
    ]);

    await idx.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'completenessScore:desc',
      'avgRating:desc',
    ]);

    await idx.updateTypoTolerance({
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    });

    logger.info({ event: 'provider_index_initialized' }, '[Meilisearch]');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize provider search index');
    return false;
  }
}

export async function indexProvider(doc: ProviderSearchDocument) {
  const client = getMeiliClient();
  try {
    await client.index(PROVIDER_INDEX).addDocuments([doc]);
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to index provider');
    return false;
  }
}

export async function indexProviders(docs: ProviderSearchDocument[]) {
  if (docs.length === 0) return true;
  const client = getMeiliClient();
  try {
    await client.index(PROVIDER_INDEX).addDocuments(docs);
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to index providers');
    return false;
  }
}

export async function updateProviderIndex(doc: Partial<ProviderSearchDocument> & { id: string }) {
  const client = getMeiliClient();
  try {
    await client.index(PROVIDER_INDEX).updateDocuments([doc]);
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to update provider index');
    return false;
  }
}

export async function deleteProviderFromIndex(providerId: string) {
  const client = getMeiliClient();
  try {
    await client.index(PROVIDER_INDEX).deleteDocument(providerId);
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete provider from index');
    return false;
  }
}

export interface ProviderSearchOptions {
  query?: string;
  country?: string;
  state?: string;
  city?: string;
  specialtySlug?: string;
  systemType?: 'CONVENTIONAL' | 'INTEGRATIVE' | 'TRADITIONAL' | 'COMPLEMENTARY';
  isCam?: boolean;
  insurancePlanSlug?: string;
  /** Geospatial search in km */
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: 'relevance' | 'rating' | 'name';
  limit?: number;
  offset?: number;
}

export async function searchProvidersIndex(options: ProviderSearchOptions) {
  const client = getMeiliClient();
  const index = client.index(PROVIDER_INDEX);

  const filters: string[] = [
    'isRegistryActive = true',
    'publicProfileEnabled = true',
  ];

  if (options.country) filters.push(`country = "${options.country}"`);
  if (options.state) filters.push(`state = "${escapeFilterValue(options.state)}"`);
  if (options.city) filters.push(`city = "${escapeFilterValue(options.city)}"`);
  if (options.specialtySlug) filters.push(`specialtySlugs = "${options.specialtySlug}"`);
  if (options.systemType) filters.push(`systemTypes = "${options.systemType}"`);
  if (options.isCam !== undefined) filters.push(`hasCamSpecialty = ${options.isCam}`);
  if (options.insurancePlanSlug) filters.push(`insurancePlanSlugs = "${options.insurancePlanSlug}"`);

  if (options.lat !== undefined && options.lng !== undefined && options.radiusKm) {
    filters.push(`_geoRadius(${options.lat}, ${options.lng}, ${Math.round(options.radiusKm * 1000)})`);
  }

  const sort: string[] = [];
  if (options.sort === 'rating') sort.push('avgRating:desc');
  else if (options.sort === 'name') sort.push('name:asc');

  const results = await index.search(options.query ?? '', {
    filter: filters,
    sort: sort.length > 0 ? sort : undefined,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    attributesToHighlight: ['name', 'specialtyNames', 'bio'],
  });

  return {
    hits: results.hits as ProviderSearchDocument[],
    estimatedTotalHits: results.estimatedTotalHits ?? 0,
    processingTimeMs: results.processingTimeMs,
  };
}

function escapeFilterValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

export async function reindexAllProviders(prisma: any, batchSize = 100) {
  try {
    await initializeProviderIndex();

    const total = await prisma.physicianCatalog.count({
      where: { isRegistryActive: true },
    });
    logger.info({ event: 'reindexing_providers', count: total }, '[Meilisearch]');

    let processed = 0;
    while (processed < total) {
      const providers = await prisma.physicianCatalog.findMany({
        where: { isRegistryActive: true },
        take: batchSize,
        skip: processed,
        include: {
          specialties: { include: { specialty: true } },
          establishments: { include: { establishment: { select: { addressCity: true, addressState: true } } } },
          insurancePlans: { where: { isActive: true }, include: { insurancePlan: { select: { slug: true } } } },
        },
      });

      const docs: ProviderSearchDocument[] = providers.map((p: any) => ({
        id: p.id,
        name: p.name,
        country: p.country,
        registryId: p.registryId,
        registryState: p.registryState,
        photoUrl: p.photoUrl,
        city: p.addressCity,
        state: p.addressState,
        lat: p.lat ? Number(p.lat) : null,
        lng: p.lng ? Number(p.lng) : null,
        _geo: p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : undefined,
        claimStatus: p.claimStatus,
        avgRating: p.avgRating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        completenessScore: p.completenessScore ?? 0,
        isRegistryActive: p.isRegistryActive,
        publicProfileEnabled: p.publicProfileEnabled,
        bio: p.bio,
        languages: p.languages ?? [],
        specialtySlugs: p.specialties.map((ps: any) => ps.specialty.slug),
        specialtyNames: Array.from(new Set(p.specialties.flatMap((ps: any) => [
          ps.specialty.displayEn, ps.specialty.displayPt, ps.specialty.displayEs,
        ]).filter(Boolean))),
        systemTypes: Array.from(new Set(p.specialties.map((ps: any) => ps.specialty.systemType))),
        hasCamSpecialty: p.specialties.some((ps: any) => ps.specialty.isCam),
        insurancePlanSlugs: p.insurancePlans.map((ip: any) => ip.insurancePlan.slug),
        establishmentLocations: p.establishments.map((pe: any) =>
          [pe.establishment.addressCity, pe.establishment.addressState].filter(Boolean).join(', ')
        ),
        updatedAt: p.updatedAt.getTime(),
      }));

      await indexProviders(docs);
      processed += providers.length;
      logger.info({ event: 'provider_batch_indexed', processed, total }, '[Meilisearch]');
    }

    logger.info({ event: 'provider_reindex_complete' }, '[Meilisearch]');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to reindex providers');
    return false;
  }
}
