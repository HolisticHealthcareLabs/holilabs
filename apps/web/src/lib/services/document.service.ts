/**
 * CDSS V3 - Document Service
 *
 * Single-responsibility service for document parsing orchestration.
 * Enqueues parsing jobs and tracks their status.
 */

import { getDocumentParseQueue } from '@/lib/queue/queues';
import { JobRepository, DocumentRepository } from '@/lib/repositories';
import logger from '@/lib/logger';
import type { DocumentParseJobData } from '@/lib/queue/types';
import type { ParsedDocument } from '@prisma/client';

export interface EnqueueDocumentResult {
  jobId: string;
  bullmqJobId: string;
}

export interface DocumentUploadInput {
  patientId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  encounterId?: string;
  uploadedBy: string;
}

export class DocumentService {
  constructor(
    private readonly jobRepo: JobRepository,
    private readonly documentRepo: DocumentRepository
  ) {}

  /**
   * Enqueue a document for parsing
   * Returns immediately with job ID - caller should poll for status
   */
  async enqueueParseJob(input: DocumentUploadInput): Promise<EnqueueDocumentResult> {
    const { patientId, filePath, originalName, mimeType, fileSizeBytes, encounterId, uploadedBy } = input;

    logger.info({
      event: 'document_parse_enqueue_start',
      patientId,
      originalName,
      fileSizeBytes,
    });

    // Create job record in database for tracking
    const analysisJob = await this.jobRepo.create({
      type: 'DOCUMENT_PARSE',
      patientId,
      encounterId,
      inputData: {
        filePath,
        originalName,
        mimeType,
        fileSizeBytes,
        uploadedBy,
      },
    });

    // Prepare job data for BullMQ
    const jobData: DocumentParseJobData = {
      patientId,
      filePath,
      originalName,
      mimeType,
      encounterId,
      uploadedBy,
      fileSizeBytes,
    };

    // Add to BullMQ queue
    const queue = getDocumentParseQueue();
    const bullmqJob = await queue.add('parse-document', jobData, {
      jobId: analysisJob.id, // Use our job ID as BullMQ job ID for correlation
    });

    // Update job record with BullMQ job ID
    await this.jobRepo.update(analysisJob.id, {
      bullmqJobId: bullmqJob.id,
    });

    logger.info({
      event: 'document_parse_enqueued',
      jobId: analysisJob.id,
      bullmqJobId: bullmqJob.id,
      patientId,
      originalName,
    });

    return {
      jobId: analysisJob.id,
      bullmqJobId: bullmqJob.id!,
    };
  }

  /**
   * Get parsing job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    documentId?: string;
    error?: string;
  } | null> {
    const job = await this.jobRepo.findById(jobId);

    if (!job) {
      return null;
    }

    const result = job.resultData as { documentId?: string } | null;

    return {
      status: job.status,
      progress: job.progress,
      documentId: result?.documentId,
      error: job.errorMessage || undefined,
    };
  }

  /**
   * Get parsed document by ID
   */
  async getDocument(documentId: string): Promise<ParsedDocument | null> {
    return this.documentRepo.findById(documentId);
  }

  /**
   * Get all documents for a patient
   */
  async getPatientDocuments(patientId: string, limit?: number): Promise<ParsedDocument[]> {
    return this.documentRepo.getPatientDocuments(patientId, limit);
  }

  /**
   * Get recent documents for pre-visit display
   */
  async getPreVisitDocuments(patientId: string): Promise<ParsedDocument[]> {
    return this.documentRepo.getRecentDocuments(patientId, 30);
  }

  /**
   * Check if a document already exists (by content hash)
   */
  async checkDuplicate(patientId: string, fileHash: string): Promise<ParsedDocument | null> {
    return this.documentRepo.findByHash(patientId, fileHash);
  }

  /**
   * Get document count for a patient
   */
  async getDocumentCount(patientId: string): Promise<number> {
    return this.documentRepo.countByPatient(patientId);
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.documentRepo.delete(documentId);
    logger.info({ event: 'document_deleted', documentId });
  }
}

// Export factory function for dependency injection
export function createDocumentService(
  jobRepo: JobRepository = new JobRepository(),
  documentRepo: DocumentRepository = new DocumentRepository()
): DocumentService {
  return new DocumentService(jobRepo, documentRepo);
}
