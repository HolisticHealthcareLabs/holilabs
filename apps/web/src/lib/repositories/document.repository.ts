/**
 * CDSS V3 - Document Repository
 *
 * Data access layer for parsed document operations.
 */

import { prisma } from '@/lib/prisma';
import { Prisma, type ParsedDocument } from '@prisma/client';

export interface CreateParsedDocumentInput {
  patientId: string;
  jobId: string;
  originalName: string;
  fileType: string;
  fileSizeBytes: number;
  fileHash: string;
  extractedText?: string;
  structuredData: Prisma.JsonValue;
  fhirResources?: Prisma.JsonArray;
}

export class DocumentRepository {
  /**
   * Find document by ID
   */
  async findById(documentId: string): Promise<ParsedDocument | null> {
    return prisma.parsedDocument.findUnique({
      where: { id: documentId },
    });
  }

  /**
   * Find document by content hash (for deduplication)
   */
  async findByHash(
    patientId: string,
    fileHash: string
  ): Promise<ParsedDocument | null> {
    return prisma.parsedDocument.findFirst({
      where: {
        patientId,
        fileHash,
      },
    });
  }

  /**
   * Create a new parsed document
   */
  async create(data: CreateParsedDocumentInput): Promise<ParsedDocument> {
    return prisma.parsedDocument.create({
      data: {
        patientId: data.patientId,
        jobId: data.jobId,
        originalName: data.originalName,
        fileType: data.fileType,
        fileSizeBytes: data.fileSizeBytes,
        fileHash: data.fileHash,
        extractedText: data.extractedText,
        structuredData: data.structuredData ?? Prisma.JsonNull,
        fhirResources: data.fhirResources || [],
      },
    });
  }

  /**
   * Get all documents for a patient
   */
  async getPatientDocuments(
    patientId: string,
    limit: number = 20
  ): Promise<ParsedDocument[]> {
    return prisma.parsedDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get recent documents for a patient (for pre-visit display)
   */
  async getRecentDocuments(
    patientId: string,
    withinDays: number = 30
  ): Promise<ParsedDocument[]> {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    return prisma.parsedDocument.findMany({
      where: {
        patientId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update FHIR resources extracted from document
   */
  async updateFhirResources(
    documentId: string,
    fhirResources: Prisma.JsonArray
  ): Promise<ParsedDocument> {
    return prisma.parsedDocument.update({
      where: { id: documentId },
      data: { fhirResources },
    });
  }

  /**
   * Delete document by ID
   */
  async delete(documentId: string): Promise<void> {
    await prisma.parsedDocument.delete({
      where: { id: documentId },
    });
  }

  /**
   * Count documents for a patient
   */
  async countByPatient(patientId: string): Promise<number> {
    return prisma.parsedDocument.count({
      where: { patientId },
    });
  }
}

// Export singleton instance
export const documentRepository = new DocumentRepository();
