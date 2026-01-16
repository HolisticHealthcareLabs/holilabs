/**
 * CDSS V3 - Parsed Document Validation Schema
 *
 * Zod schemas for validating document parser output.
 * Used to ensure type-safe parsing results from the sandboxed Python container.
 */

import { z } from 'zod';

/**
 * Table extracted from document
 * Each table has a page number and a 2D array of cell data
 */
const tableSchema = z.object({
  page: z.number().int().min(0),
  data: z.array(z.array(z.string())),
});

/**
 * Document metadata extracted from PDF properties
 */
const documentMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  subject: z.string().optional(),
  creator: z.string().optional(),
  producer: z.string().optional(),
  creationDate: z.string().optional(),
  modDate: z.string().optional(),
});

/**
 * Clinical document section
 * Detected sections like "Chief Complaint", "HPI", "Assessment", etc.
 */
const sectionSchema = z.object({
  name: z.string(),
  startIndex: z.number().int().min(0),
  endIndex: z.number().int().min(0),
  detected: z.boolean(),
});

/**
 * Parsed Document Schema
 *
 * Validates the output from the sandboxed document parser.
 * This is the primary schema used by document-parser.worker.ts
 * to validate parsing results before saving to database.
 */
export const ParsedDocumentSchema = z.object({
  // Page count from the document
  pageCount: z.number().int().min(0).default(0),

  // Extracted text content
  text: z.string().default(''),

  // Tables extracted from the document
  tables: z.array(tableSchema).default([]),

  // PDF metadata
  metadata: documentMetadataSchema.default({}),

  // Detected clinical sections
  sections: z.array(sectionSchema).default([]),

  // SHA-256 hash of document content for deduplication
  contentHash: z.string().default(''),

  // Warnings generated during parsing (non-fatal issues)
  warnings: z.array(z.string()).default([]),
});

/**
 * Raw parser output schema
 * Includes success/error fields from the sandbox container
 */
export const ParserOutputSchema = z.object({
  success: z.boolean(),
  pageCount: z.number().int().min(0).optional(),
  text: z.string().optional(),
  tables: z.array(tableSchema).optional(),
  metadata: documentMetadataSchema.optional(),
  sections: z.array(sectionSchema).optional(),
  contentHash: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
  parsedAt: z.string().optional(),
});

/**
 * Database input schema
 * Used when creating a ParsedDocument record in Prisma
 */
export const CreateParsedDocumentSchema = z.object({
  patientId: z.string().cuid(),
  jobId: z.string().cuid(),
  originalName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(50),
  fileSizeBytes: z.number().int().min(0),
  fileHash: z.string().min(1),
  extractedText: z.string().optional(),
  structuredData: z.object({
    pageCount: z.number().int().min(0),
    tables: z.array(tableSchema),
    metadata: documentMetadataSchema,
    sections: z.array(sectionSchema),
    warnings: z.array(z.string()),
  }),
  fhirResources: z.array(z.unknown()).default([]),
});

// Export types for TypeScript
export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;
export type ParserOutput = z.infer<typeof ParserOutputSchema>;
export type CreateParsedDocumentInput = z.infer<typeof CreateParsedDocumentSchema>;
export type Table = z.infer<typeof tableSchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type Section = z.infer<typeof sectionSchema>;
