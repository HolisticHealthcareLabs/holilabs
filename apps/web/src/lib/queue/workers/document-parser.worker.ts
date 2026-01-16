/**
 * CDSS V3 - Document Parser Worker
 *
 * BullMQ worker that processes document parsing jobs.
 * Delegates parsing to the sandboxed Python container.
 *
 * Flow:
 * 1. Receive job with file path and patient ID
 * 2. Call SandboxClient to parse document in isolated container
 * 3. Validate output with Zod schema
 * 4. Save ParsedDocument to database
 * 5. Return result with document ID
 */

import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import logger from '@/lib/logger';
import { getSandboxClient, ParsedContent } from '@/lib/security/sandbox-client';
import { prisma } from '@/lib/prisma';
import { ParsedDocumentSchema } from '@/lib/schemas/parsed-document.schema';
import type {
  DocumentParseJobData,
  DocumentParseJobResult,
} from '../types';

// Worker concurrency - limit to prevent overwhelming the system
const WORKER_CONCURRENCY = parseInt(
  process.env.DOCUMENT_PARSE_CONCURRENCY || '3',
  10
);

/**
 * Process a document parsing job
 */
async function processDocumentParseJob(
  job: Job<DocumentParseJobData>
): Promise<DocumentParseJobResult> {
  const { patientId, filePath, originalName, mimeType, encounterId, uploadedBy, fileSizeBytes } =
    job.data;

  logger.info({
    event: 'document_parse_job_started',
    queue: QueueName.DOCUMENT_PARSE,
    jobId: job.id,
    patientId,
    originalName,
    fileSizeBytes,
  });

  try {
    // Update progress: Starting
    await job.updateProgress(10);

    // 1. Call sandboxed parser
    const sandboxClient = getSandboxClient();
    const rawResult: ParsedContent = await sandboxClient.parseDocument(filePath);

    await job.updateProgress(60);

    // 2. Check if parsing succeeded
    if (!rawResult.success) {
      throw new Error(rawResult.error || 'Document parsing failed in sandbox');
    }

    // 3. Validate output with Zod schema
    const validatedData = ParsedDocumentSchema.parse({
      pageCount: rawResult.pageCount || 0,
      text: rawResult.text || '',
      tables: rawResult.tables || [],
      metadata: rawResult.metadata || {},
      sections: rawResult.sections || [],
      contentHash: rawResult.contentHash || '',
      warnings: rawResult.warnings || [],
    });

    await job.updateProgress(80);

    // 4. Check for duplicate by content hash
    const existingDoc = await prisma.parsedDocument.findFirst({
      where: {
        patientId,
        fileHash: validatedData.contentHash,
      },
    });

    if (existingDoc) {
      logger.info({
        event: 'document_parse_duplicate',
        jobId: job.id,
        patientId,
        existingDocId: existingDoc.id,
        contentHash: validatedData.contentHash,
      });

      await job.updateProgress(100);

      return {
        documentId: existingDoc.id,
        success: true,
        pageCount: validatedData.pageCount,
        tableCount: validatedData.tables.length,
        warnings: ['Duplicate document detected, returning existing record'],
      };
    }

    // 5. Create AnalysisJob record (for tracking)
    const analysisJob = await prisma.analysisJob.create({
      data: {
        type: 'DOCUMENT_PARSE',
        status: 'COMPLETED',
        progress: 100,
        patientId,
        encounterId: encounterId || null,
        inputData: {
          filePath,
          originalName,
          mimeType,
          fileSizeBytes,
          uploadedBy,
        },
        resultData: {
          pageCount: validatedData.pageCount,
          tableCount: validatedData.tables.length,
          sectionCount: validatedData.sections.length,
        },
        bullmqJobId: job.id,
        startedAt: new Date(job.processedOn || Date.now()),
        completedAt: new Date(),
      },
    });

    // 6. Save ParsedDocument to database
    const savedDocument = await prisma.parsedDocument.create({
      data: {
        patientId,
        jobId: analysisJob.id,
        originalName,
        fileType: mimeType.split('/')[1] || 'pdf',
        fileSizeBytes,
        fileHash: validatedData.contentHash,
        extractedText: validatedData.text,
        structuredData: {
          pageCount: validatedData.pageCount,
          tables: validatedData.tables,
          metadata: validatedData.metadata,
          sections: validatedData.sections,
          warnings: validatedData.warnings,
        },
        fhirResources: [], // Will be populated by FHIR extraction service
      },
    });

    await job.updateProgress(100);

    logger.info({
      event: 'document_parse_job_completed',
      queue: QueueName.DOCUMENT_PARSE,
      jobId: job.id,
      patientId,
      documentId: savedDocument.id,
      pageCount: validatedData.pageCount,
      tableCount: validatedData.tables.length,
    });

    return {
      documentId: savedDocument.id,
      success: true,
      pageCount: validatedData.pageCount,
      tableCount: validatedData.tables.length,
      warnings: validatedData.warnings.length > 0 ? validatedData.warnings : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during document parsing';

    logger.error({
      event: 'document_parse_job_failed',
      queue: QueueName.DOCUMENT_PARSE,
      jobId: job.id,
      patientId,
      error: errorMessage,
    });

    // Create failed AnalysisJob record
    await prisma.analysisJob.create({
      data: {
        type: 'DOCUMENT_PARSE',
        status: 'FAILED',
        progress: job.progress as number,
        patientId,
        encounterId: encounterId || null,
        inputData: {
          filePath,
          originalName,
          mimeType,
          fileSizeBytes,
          uploadedBy,
        },
        errorMessage,
        bullmqJobId: job.id,
        startedAt: new Date(job.processedOn || Date.now()),
        completedAt: new Date(),
      },
    });

    // Re-throw to mark job as failed in BullMQ
    throw error;
  }
}

/**
 * Start the document parser worker
 */
export function startDocumentParserWorker(): Worker<
  DocumentParseJobData,
  DocumentParseJobResult
> {
  const worker = new Worker<DocumentParseJobData, DocumentParseJobResult>(
    QueueName.DOCUMENT_PARSE,
    processDocumentParseJob,
    {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'document_parser_worker_job_failed',
      queue: QueueName.DOCUMENT_PARSE,
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info({
      event: 'document_parser_worker_job_completed',
      queue: QueueName.DOCUMENT_PARSE,
      jobId: job.id,
      documentId: result.documentId,
      success: result.success,
    });
  });

  worker.on('progress', (job, progress) => {
    logger.debug({
      event: 'document_parser_worker_progress',
      queue: QueueName.DOCUMENT_PARSE,
      jobId: job.id,
      progress,
    });
  });

  logger.info({
    event: 'document_parser_worker_started',
    queue: QueueName.DOCUMENT_PARSE,
    concurrency: WORKER_CONCURRENCY,
  });

  return worker;
}
