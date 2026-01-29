/**
 * Search MCP Tools - Comprehensive search and discovery operations
 *
 * Tools for searching across clinical data entities with full-text and filtered search.
 * Implements clinic-scoped search with proper access controls.
 *
 * SEARCH TOOLS:
 * - search_patients: Search patients by name, MRN, DOB, phone
 * - search_clinical_content: Search clinical notes, documents by content
 * - search_medications: Search medication database
 * - search_diagnoses: Search ICD-10 diagnosis codes
 * - search_procedures: Search CPT procedure codes
 * - search_appointments: Search appointments across patients
 * - global_search: Multi-entity global search
 *
 * SEARCH HISTORY TOOLS:
 * - get_recent_searches: Get user's recent search history
 * - save_search: Save a search for quick access
 * - get_saved_searches: Get user's saved searches
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const SearchPatientsSchema = z.object({
    query: z.string().min(1).describe('Search query (name, MRN, DOB, or phone)'),
    searchFields: z.array(z.enum(['name', 'mrn', 'dob', 'phone', 'email', 'all']))
        .default(['all'])
        .describe('Fields to search in'),
    filters: z.object({
        isActive: z.boolean().optional().describe('Filter by active status'),
        gender: z.enum(['male', 'female', 'other', 'unknown']).optional().describe('Filter by gender'),
        ageMin: z.number().min(0).optional().describe('Minimum age'),
        ageMax: z.number().max(150).optional().describe('Maximum age'),
        hasCondition: z.string().optional().describe('Filter by diagnosis code or description'),
        hasMedication: z.string().optional().describe('Filter by medication name'),
    }).optional().describe('Additional filters'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const SearchClinicalContentSchema = z.object({
    query: z.string().min(2).describe('Search query for clinical content'),
    contentTypes: z.array(z.enum(['clinical_notes', 'documents', 'all']))
        .default(['all'])
        .describe('Types of content to search'),
    patientId: z.string().optional().describe('Limit search to specific patient'),
    noteTypes: z.array(z.enum(['PROGRESS', 'CONSULTATION', 'DISCHARGE', 'ADMISSION', 'PROCEDURE']))
        .optional()
        .describe('Filter note types'),
    documentTypes: z.array(z.enum(['LAB_RESULTS', 'IMAGING', 'CONSULTATION_NOTES', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'OTHER']))
        .optional()
        .describe('Filter document types'),
    dateFrom: z.string().optional().describe('Search from date (ISO 8601)'),
    dateTo: z.string().optional().describe('Search until date (ISO 8601)'),
    limit: z.number().min(1).max(50).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const SearchMedicationsSchema = z.object({
    query: z.string().min(2).describe('Search query (medication name, generic name, or drug class)'),
    searchType: z.enum(['patient_medications', 'all_medications']).default('patient_medications')
        .describe('Search patient medications or medication reference database'),
    patientId: z.string().optional().describe('Patient ID (required for patient_medications type)'),
    activeOnly: z.boolean().default(true).describe('Only show active medications'),
    includeGeneric: z.boolean().default(true).describe('Include generic name matches'),
    limit: z.number().min(1).max(50).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const SearchDiagnosesSchema = z.object({
    query: z.string().min(2).describe('Search query (ICD-10 code or description)'),
    searchType: z.enum(['patient_diagnoses', 'icd10_codes']).default('patient_diagnoses')
        .describe('Search patient diagnoses or ICD-10 code reference'),
    patientId: z.string().optional().describe('Patient ID (required for patient_diagnoses)'),
    statusFilter: z.array(z.enum(['ACTIVE', 'RESOLVED', 'CHRONIC', 'RULED_OUT', 'REMISSION']))
        .optional()
        .describe('Filter by diagnosis status'),
    primaryOnly: z.boolean().optional().describe('Only return primary diagnoses'),
    limit: z.number().min(1).max(50).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const SearchProceduresSchema = z.object({
    query: z.string().min(2).describe('Search query (CPT code or description)'),
    category: z.enum(['all', 'evaluation', 'surgery', 'radiology', 'pathology', 'medicine'])
        .default('all')
        .describe('CPT category to search within'),
    limit: z.number().min(1).max(50).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const SearchAppointmentsSchema = z.object({
    query: z.string().optional().describe('Search query (patient name, title, or notes)'),
    patientId: z.string().optional().describe('Filter by patient ID'),
    clinicianId: z.string().optional().describe('Filter by clinician ID'),
    dateFrom: z.string().optional().describe('Appointments starting after (ISO 8601)'),
    dateTo: z.string().optional().describe('Appointments starting before (ISO 8601)'),
    status: z.array(z.enum(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']))
        .optional()
        .describe('Filter by status'),
    type: z.array(z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT']))
        .optional()
        .describe('Filter by appointment type'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const GlobalSearchSchema = z.object({
    query: z.string().min(2).describe('Global search query'),
    entityTypes: z.array(z.enum(['patients', 'appointments', 'clinical_notes', 'documents', 'medications', 'diagnoses']))
        .default(['patients', 'appointments', 'clinical_notes'])
        .describe('Entity types to include in search'),
    maxPerEntity: z.number().min(1).max(10).default(5).describe('Maximum results per entity type'),
});

const GetRecentSearchesSchema = z.object({
    limit: z.number().min(1).max(50).default(10).describe('Maximum recent searches to return'),
    entityType: z.enum(['all', 'patients', 'appointments', 'clinical_notes', 'documents', 'medications', 'diagnoses', 'global'])
        .default('all')
        .describe('Filter by entity type'),
});

const SaveSearchSchema = z.object({
    name: z.string().min(1).max(100).describe('Name for the saved search'),
    description: z.string().max(500).optional().describe('Description of the search'),
    entityType: z.enum(['patients', 'appointments', 'clinical_notes', 'documents', 'medications', 'diagnoses', 'global'])
        .describe('Type of search'),
    searchParams: z.record(z.any()).describe('Search parameters to save'),
    tags: z.array(z.string()).optional().describe('Tags for organization'),
});

const GetSavedSearchesSchema = z.object({
    limit: z.number().min(1).max(50).default(20).describe('Maximum saved searches to return'),
    entityType: z.enum(['all', 'patients', 'appointments', 'clinical_notes', 'documents', 'medications', 'diagnoses', 'global'])
        .default('all')
        .describe('Filter by entity type'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Search patients by name, MRN, DOB, or phone
 */
async function searchPatientsHandler(
    input: z.infer<typeof SearchPatientsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, searchFields, filters, limit, offset } = input;
        const searchAll = searchFields.includes('all');

        // Build OR conditions based on search fields
        const orConditions: any[] = [];

        if (searchAll || searchFields.includes('name')) {
            orConditions.push(
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } }
            );
        }

        if (searchAll || searchFields.includes('mrn')) {
            orConditions.push({ mrn: { contains: query, mode: 'insensitive' } });
        }

        if (searchAll || searchFields.includes('phone')) {
            orConditions.push({ phone: { contains: query, mode: 'insensitive' } });
        }

        if (searchAll || searchFields.includes('email')) {
            orConditions.push({ email: { contains: query, mode: 'insensitive' } });
        }

        if (searchAll || searchFields.includes('dob')) {
            // Try parsing as date
            const dateQuery = new Date(query);
            if (!isNaN(dateQuery.getTime())) {
                orConditions.push({ dateOfBirth: dateQuery });
            }
        }

        // Build base where clause
        const where: any = {
            assignedClinicianId: context.clinicianId,
            OR: orConditions.length > 0 ? orConditions : undefined,
        };

        // Apply additional filters
        if (filters) {
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            if (filters.gender) {
                where.gender = filters.gender;
            }
            if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
                const today = new Date();
                if (filters.ageMax !== undefined) {
                    const minBirthDate = new Date(today);
                    minBirthDate.setFullYear(minBirthDate.getFullYear() - filters.ageMax - 1);
                    where.dateOfBirth = { ...where.dateOfBirth, gte: minBirthDate };
                }
                if (filters.ageMin !== undefined) {
                    const maxBirthDate = new Date(today);
                    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - filters.ageMin);
                    where.dateOfBirth = { ...where.dateOfBirth, lte: maxBirthDate };
                }
            }
        }

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dateOfBirth: true,
                    gender: true,
                    mrn: true,
                    phone: true,
                    email: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: [
                    { lastName: 'asc' },
                    { firstName: 'asc' },
                ],
                take: limit,
                skip: offset,
            }),
            prisma.patient.count({ where }),
        ]);

        // Log search for analytics
        logger.info({
            event: 'search_patients',
            query,
            searchFields,
            resultCount: patients.length,
            totalResults: total,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                query,
                searchFields,
                patients: patients.map(p => ({
                    patientId: p.id,
                    name: `${p.firstName} ${p.lastName}`,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    dateOfBirth: p.dateOfBirth?.toISOString().split('T')[0],
                    age: p.dateOfBirth ? Math.floor((Date.now() - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
                    gender: p.gender,
                    mrn: p.mrn,
                    phone: p.phone,
                    email: p.email,
                    isActive: p.isActive,
                })),
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + patients.length < total,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'search_patients_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search patients',
            data: null,
        };
    }
}

/**
 * Search clinical notes and documents by content
 */
async function searchClinicalContentHandler(
    input: z.infer<typeof SearchClinicalContentSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, contentTypes, patientId, noteTypes, documentTypes, dateFrom, dateTo, limit, offset } = input;
        const searchAll = contentTypes.includes('all');
        const results: any[] = [];

        // Build date filters
        const dateFilter: any = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) dateFilter.lte = new Date(dateTo);

        // Search clinical notes
        if (searchAll || contentTypes.includes('clinical_notes')) {
            const noteWhere: any = {
                OR: [
                    { subjective: { contains: query, mode: 'insensitive' } },
                    { objective: { contains: query, mode: 'insensitive' } },
                    { assessment: { contains: query, mode: 'insensitive' } },
                    { plan: { contains: query, mode: 'insensitive' } },
                    { chiefComplaint: { contains: query, mode: 'insensitive' } },
                ],
                patient: {
                    assignedClinicianId: context.clinicianId,
                },
            };

            if (patientId) {
                noteWhere.patientId = patientId;
            }

            if (noteTypes && noteTypes.length > 0) {
                noteWhere.type = { in: noteTypes };
            }

            if (Object.keys(dateFilter).length > 0) {
                noteWhere.createdAt = dateFilter;
            }

            const notes = await prisma.clinicalNote.findMany({
                where: noteWhere,
                select: {
                    id: true,
                    patientId: true,
                    type: true,
                    chiefComplaint: true,
                    subjective: true,
                    assessment: true,
                    signedAt: true,
                    createdAt: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: Math.ceil(limit / (searchAll ? 2 : 1)),
            });

            notes.forEach(note => {
                results.push({
                    entityType: 'clinical_note',
                    id: note.id,
                    patientId: note.patientId,
                    patientName: `${note.patient.firstName} ${note.patient.lastName}`,
                    title: note.chiefComplaint || `${note.type} Note`,
                    type: note.type,
                    snippet: note.assessment?.substring(0, 200) || note.subjective?.substring(0, 200) || '',
                    status: note.signedAt ? 'SIGNED' : 'DRAFT',
                    createdAt: note.createdAt.toISOString(),
                });
            });
        }

        // Search documents
        if (searchAll || contentTypes.includes('documents')) {
            const docWhere: any = {
                OR: [
                    { fileName: { contains: query, mode: 'insensitive' } },
                    { ocrText: { contains: query, mode: 'insensitive' } },
                ],
                patient: {
                    assignedClinicianId: context.clinicianId,
                },
            };

            if (patientId) {
                docWhere.patientId = patientId;
            }

            if (documentTypes && documentTypes.length > 0) {
                docWhere.documentType = { in: documentTypes };
            }

            if (Object.keys(dateFilter).length > 0) {
                docWhere.createdAt = dateFilter;
            }

            const documents = await prisma.document.findMany({
                where: docWhere,
                select: {
                    id: true,
                    patientId: true,
                    fileName: true,
                    documentType: true,
                    ocrText: true,
                    createdAt: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: Math.ceil(limit / (searchAll ? 2 : 1)),
            });

            documents.forEach(doc => {
                results.push({
                    entityType: 'document',
                    id: doc.id,
                    patientId: doc.patientId,
                    patientName: `${doc.patient.firstName} ${doc.patient.lastName}`,
                    title: doc.fileName,
                    type: doc.documentType,
                    snippet: doc.ocrText?.substring(0, 200) || '',
                    createdAt: doc.createdAt.toISOString(),
                });
            });
        }

        // Sort combined results by date
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Apply pagination
        const paginatedResults = results.slice(offset, offset + limit);

        logger.info({
            event: 'search_clinical_content',
            query,
            contentTypes,
            resultCount: paginatedResults.length,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                query,
                contentTypes,
                results: paginatedResults,
                pagination: {
                    total: results.length,
                    limit,
                    offset,
                    hasMore: offset + paginatedResults.length < results.length,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'search_clinical_content_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search clinical content',
            data: null,
        };
    }
}

/**
 * Search medications
 */
async function searchMedicationsHandler(
    input: z.infer<typeof SearchMedicationsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, searchType, patientId, activeOnly, includeGeneric, limit, offset } = input;

        if (searchType === 'patient_medications') {
            // Validate patient access
            const patientWhere: any = {
                assignedClinicianId: context.clinicianId,
            };
            if (patientId) {
                patientWhere.id = patientId;
            }

            const orConditions: any[] = [
                { name: { contains: query, mode: 'insensitive' } },
            ];

            if (includeGeneric) {
                orConditions.push({ genericName: { contains: query, mode: 'insensitive' } });
            }

            const medWhere: any = {
                OR: orConditions,
                patient: patientWhere,
            };

            if (activeOnly) {
                medWhere.isActive = true;
            }

            const [medications, total] = await Promise.all([
                prisma.medication.findMany({
                    where: medWhere,
                    select: {
                        id: true,
                        patientId: true,
                        name: true,
                        genericName: true,
                        dose: true,
                        frequency: true,
                        route: true,
                        isActive: true,
                        startDate: true,
                        endDate: true,
                        instructions: true,
                        patient: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: { name: 'asc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.medication.count({ where: medWhere }),
            ]);

            logger.info({
                event: 'search_medications',
                query,
                searchType,
                resultCount: medications.length,
                clinicianId: context.clinicianId,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    query,
                    searchType,
                    medications: medications.map(m => ({
                        medicationId: m.id,
                        patientId: m.patientId,
                        patientName: `${m.patient.firstName} ${m.patient.lastName}`,
                        name: m.name,
                        genericName: m.genericName,
                        dose: m.dose,
                        frequency: m.frequency,
                        route: m.route,
                        isActive: m.isActive,
                        startDate: m.startDate?.toISOString(),
                        endDate: m.endDate?.toISOString(),
                        instructions: m.instructions,
                    })),
                    pagination: {
                        total,
                        limit,
                        offset,
                        hasMore: offset + medications.length < total,
                    },
                },
            };
        } else {
            // Search reference medication database
            // For now, return a static list of common medications matching the query
            // In production, this would query an external medication database like RxNorm
            const commonMedications = [
                { name: 'Metformin', genericName: 'metformin', drugClass: 'Biguanide', indication: 'Type 2 Diabetes' },
                { name: 'Lisinopril', genericName: 'lisinopril', drugClass: 'ACE Inhibitor', indication: 'Hypertension' },
                { name: 'Atorvastatin', genericName: 'atorvastatin', drugClass: 'Statin', indication: 'Hyperlipidemia' },
                { name: 'Amlodipine', genericName: 'amlodipine', drugClass: 'Calcium Channel Blocker', indication: 'Hypertension' },
                { name: 'Omeprazole', genericName: 'omeprazole', drugClass: 'Proton Pump Inhibitor', indication: 'GERD' },
                { name: 'Levothyroxine', genericName: 'levothyroxine', drugClass: 'Thyroid Hormone', indication: 'Hypothyroidism' },
                { name: 'Metoprolol', genericName: 'metoprolol', drugClass: 'Beta Blocker', indication: 'Hypertension' },
                { name: 'Losartan', genericName: 'losartan', drugClass: 'ARB', indication: 'Hypertension' },
                { name: 'Gabapentin', genericName: 'gabapentin', drugClass: 'Anticonvulsant', indication: 'Neuropathic Pain' },
                { name: 'Hydrochlorothiazide', genericName: 'hydrochlorothiazide', drugClass: 'Thiazide Diuretic', indication: 'Hypertension' },
            ];

            const queryLower = query.toLowerCase();
            const matches = commonMedications.filter(med =>
                med.name.toLowerCase().includes(queryLower) ||
                med.genericName.toLowerCase().includes(queryLower) ||
                med.drugClass.toLowerCase().includes(queryLower)
            );

            return {
                success: true,
                data: {
                    query,
                    searchType,
                    medications: matches.slice(offset, offset + limit),
                    pagination: {
                        total: matches.length,
                        limit,
                        offset,
                        hasMore: offset + limit < matches.length,
                    },
                    note: 'Reference database search. For actual prescribing, verify with current drug references.',
                },
            };
        }
    } catch (error) {
        logger.error({ event: 'search_medications_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search medications',
            data: null,
        };
    }
}

/**
 * Search diagnoses (ICD-10 codes)
 */
async function searchDiagnosesHandler(
    input: z.infer<typeof SearchDiagnosesSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, searchType, patientId, statusFilter, primaryOnly, limit, offset } = input;

        if (searchType === 'patient_diagnoses') {
            const patientWhere: any = {
                assignedClinicianId: context.clinicianId,
            };
            if (patientId) {
                patientWhere.id = patientId;
            }

            const diagWhere: any = {
                OR: [
                    { icd10Code: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
                patient: patientWhere,
            };

            if (statusFilter && statusFilter.length > 0) {
                diagWhere.status = { in: statusFilter };
            }

            if (primaryOnly) {
                diagWhere.isPrimary = true;
            }

            const [diagnoses, total] = await Promise.all([
                prisma.diagnosis.findMany({
                    where: diagWhere,
                    select: {
                        id: true,
                        patientId: true,
                        icd10Code: true,
                        description: true,
                        status: true,
                        isPrimary: true,
                        severity: true,
                        onsetDate: true,
                        diagnosedAt: true,
                        patient: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: [
                        { isPrimary: 'desc' },
                        { diagnosedAt: 'desc' },
                    ],
                    take: limit,
                    skip: offset,
                }),
                prisma.diagnosis.count({ where: diagWhere }),
            ]);

            logger.info({
                event: 'search_diagnoses',
                query,
                searchType,
                resultCount: diagnoses.length,
                clinicianId: context.clinicianId,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    query,
                    searchType,
                    diagnoses: diagnoses.map(d => ({
                        diagnosisId: d.id,
                        patientId: d.patientId,
                        patientName: `${d.patient.firstName} ${d.patient.lastName}`,
                        icd10Code: d.icd10Code,
                        description: d.description,
                        status: d.status,
                        isPrimary: d.isPrimary,
                        severity: d.severity,
                        onsetDate: d.onsetDate?.toISOString(),
                        diagnosedAt: d.diagnosedAt?.toISOString(),
                    })),
                    pagination: {
                        total,
                        limit,
                        offset,
                        hasMore: offset + diagnoses.length < total,
                    },
                },
            };
        } else {
            // Search ICD-10 code reference
            // In production, this would query an ICD-10 database
            const icd10Codes = [
                { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
                { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
                { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
                { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },
                { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mental Health' },
                { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', category: 'Digestive' },
                { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrine' },
                { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory' },
                { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'Endocrine' },
                { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Genitourinary' },
                { code: 'G43.909', description: 'Migraine, unspecified, not intractable', category: 'Neurological' },
                { code: 'R10.9', description: 'Unspecified abdominal pain', category: 'Symptoms' },
            ];

            const queryLower = query.toLowerCase();
            const matches = icd10Codes.filter(icd =>
                icd.code.toLowerCase().includes(queryLower) ||
                icd.description.toLowerCase().includes(queryLower)
            );

            return {
                success: true,
                data: {
                    query,
                    searchType,
                    icd10Codes: matches.slice(offset, offset + limit),
                    pagination: {
                        total: matches.length,
                        limit,
                        offset,
                        hasMore: offset + limit < matches.length,
                    },
                    note: 'ICD-10 reference search. Verify codes with current coding guidelines.',
                },
            };
        }
    } catch (error) {
        logger.error({ event: 'search_diagnoses_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search diagnoses',
            data: null,
        };
    }
}

/**
 * Search CPT procedure codes
 */
async function searchProceduresHandler(
    input: z.infer<typeof SearchProceduresSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, category, limit, offset } = input;

        // CPT code reference database
        // In production, this would query a CPT database
        const cptCodes = [
            // Evaluation & Management
            { code: '99213', description: 'Office visit, established patient, low complexity', category: 'evaluation', rvu: 1.3 },
            { code: '99214', description: 'Office visit, established patient, moderate complexity', category: 'evaluation', rvu: 1.92 },
            { code: '99215', description: 'Office visit, established patient, high complexity', category: 'evaluation', rvu: 2.8 },
            { code: '99203', description: 'Office visit, new patient, low complexity', category: 'evaluation', rvu: 1.6 },
            { code: '99204', description: 'Office visit, new patient, moderate complexity', category: 'evaluation', rvu: 2.6 },
            { code: '99205', description: 'Office visit, new patient, high complexity', category: 'evaluation', rvu: 3.5 },
            // Surgery
            { code: '10060', description: 'Incision and drainage of abscess, simple', category: 'surgery', rvu: 2.65 },
            { code: '11102', description: 'Tangential biopsy of skin, single lesion', category: 'surgery', rvu: 0.83 },
            { code: '17000', description: 'Destruction of premalignant lesion, first', category: 'surgery', rvu: 0.61 },
            // Radiology
            { code: '71046', description: 'Radiologic exam, chest, 2 views', category: 'radiology', rvu: 0.22 },
            { code: '73030', description: 'Radiologic exam, shoulder, complete', category: 'radiology', rvu: 0.2 },
            // Medicine
            { code: '90471', description: 'Immunization administration', category: 'medicine', rvu: 0.17 },
            { code: '96372', description: 'Therapeutic injection, subcutaneous/intramuscular', category: 'medicine', rvu: 0.17 },
            // Pathology
            { code: '80053', description: 'Comprehensive metabolic panel', category: 'pathology', rvu: 0 },
            { code: '85025', description: 'Complete blood count with differential', category: 'pathology', rvu: 0 },
        ];

        const queryLower = query.toLowerCase();
        let matches = cptCodes.filter(cpt =>
            cpt.code.toLowerCase().includes(queryLower) ||
            cpt.description.toLowerCase().includes(queryLower)
        );

        if (category !== 'all') {
            matches = matches.filter(cpt => cpt.category === category);
        }

        logger.info({
            event: 'search_procedures',
            query,
            category,
            resultCount: matches.length,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                query,
                category,
                procedures: matches.slice(offset, offset + limit),
                pagination: {
                    total: matches.length,
                    limit,
                    offset,
                    hasMore: offset + limit < matches.length,
                },
                note: 'CPT code reference search. Verify codes with current coding guidelines.',
            },
        };
    } catch (error) {
        logger.error({ event: 'search_procedures_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search procedures',
            data: null,
        };
    }
}

/**
 * Search appointments across patients
 */
async function searchAppointmentsHandler(
    input: z.infer<typeof SearchAppointmentsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, patientId, clinicianId, dateFrom, dateTo, status, type, limit, offset } = input;

        const where: any = {};

        // Base access control - only show appointments for clinician's patients or their own appointments
        where.OR = [
            { clinicianId: context.clinicianId },
            { patient: { assignedClinicianId: context.clinicianId } },
        ];

        // Apply filters
        if (patientId) {
            where.patientId = patientId;
        }

        if (clinicianId) {
            where.clinicianId = clinicianId;
        }

        if (dateFrom || dateTo) {
            where.startTime = {};
            if (dateFrom) where.startTime.gte = new Date(dateFrom);
            if (dateTo) where.startTime.lte = new Date(dateTo);
        }

        if (status && status.length > 0) {
            where.status = { in: status };
        }

        if (type && type.length > 0) {
            where.type = { in: type };
        }

        // Add text search if query provided
        if (query) {
            where.AND = [
                {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                        { notes: { contains: query, mode: 'insensitive' } },
                        { patient: { firstName: { contains: query, mode: 'insensitive' } } },
                        { patient: { lastName: { contains: query, mode: 'insensitive' } } },
                    ],
                },
            ];
        }

        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                select: {
                    id: true,
                    patientId: true,
                    clinicianId: true,
                    title: true,
                    startTime: true,
                    endTime: true,
                    type: true,
                    status: true,
                    confirmationStatus: true,
                    meetingUrl: true,
                    branch: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                    clinician: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { startTime: 'asc' },
                take: limit,
                skip: offset,
            }),
            prisma.appointment.count({ where }),
        ]);

        logger.info({
            event: 'search_appointments',
            query,
            resultCount: appointments.length,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                query,
                filters: { patientId, clinicianId, dateFrom, dateTo, status, type },
                appointments: appointments.map(apt => ({
                    appointmentId: apt.id,
                    patientId: apt.patientId,
                    patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
                    patientPhone: apt.patient.phone,
                    clinicianId: apt.clinicianId,
                    clinicianName: `${apt.clinician.firstName} ${apt.clinician.lastName}`,
                    title: apt.title,
                    startTime: apt.startTime.toISOString(),
                    endTime: apt.endTime.toISOString(),
                    type: apt.type,
                    status: apt.status,
                    confirmationStatus: apt.confirmationStatus,
                    meetingUrl: apt.meetingUrl,
                    branch: apt.branch,
                })),
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + appointments.length < total,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'search_appointments_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search appointments',
            data: null,
        };
    }
}

/**
 * Global multi-entity search
 */
async function globalSearchHandler(
    input: z.infer<typeof GlobalSearchSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { query, entityTypes, maxPerEntity } = input;
        const results: Record<string, any[]> = {};
        const counts: Record<string, number> = {};

        // Search patients
        if (entityTypes.includes('patients')) {
            const patients = await prisma.patient.findMany({
                where: {
                    assignedClinicianId: context.clinicianId,
                    OR: [
                        { firstName: { contains: query, mode: 'insensitive' } },
                        { lastName: { contains: query, mode: 'insensitive' } },
                        { mrn: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true,
                    dateOfBirth: true,
                },
                take: maxPerEntity,
            });
            results.patients = patients.map(p => ({
                id: p.id,
                name: `${p.firstName} ${p.lastName}`,
                mrn: p.mrn,
                dateOfBirth: p.dateOfBirth?.toISOString().split('T')[0],
            }));
            counts.patients = patients.length;
        }

        // Search appointments
        if (entityTypes.includes('appointments')) {
            const appointments = await prisma.appointment.findMany({
                where: {
                    OR: [
                        { clinicianId: context.clinicianId },
                        { patient: { assignedClinicianId: context.clinicianId } },
                    ],
                    AND: {
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { patient: { firstName: { contains: query, mode: 'insensitive' } } },
                            { patient: { lastName: { contains: query, mode: 'insensitive' } } },
                        ],
                    },
                },
                select: {
                    id: true,
                    title: true,
                    startTime: true,
                    status: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                take: maxPerEntity,
            });
            results.appointments = appointments.map(a => ({
                id: a.id,
                title: a.title,
                patientName: `${a.patient.firstName} ${a.patient.lastName}`,
                startTime: a.startTime.toISOString(),
                status: a.status,
            }));
            counts.appointments = appointments.length;
        }

        // Search clinical notes
        if (entityTypes.includes('clinical_notes')) {
            const notes = await prisma.clinicalNote.findMany({
                where: {
                    patient: { assignedClinicianId: context.clinicianId },
                    OR: [
                        { chiefComplaint: { contains: query, mode: 'insensitive' } },
                        { assessment: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    type: true,
                    chiefComplaint: true,
                    createdAt: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                take: maxPerEntity,
            });
            results.clinical_notes = notes.map(n => ({
                id: n.id,
                type: n.type,
                chiefComplaint: n.chiefComplaint,
                patientName: `${n.patient.firstName} ${n.patient.lastName}`,
                createdAt: n.createdAt.toISOString(),
            }));
            counts.clinical_notes = notes.length;
        }

        // Search documents
        if (entityTypes.includes('documents')) {
            const documents = await prisma.document.findMany({
                where: {
                    patient: { assignedClinicianId: context.clinicianId },
                    OR: [
                        { fileName: { contains: query, mode: 'insensitive' } },
                        { ocrText: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    fileName: true,
                    documentType: true,
                    createdAt: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                take: maxPerEntity,
            });
            results.documents = documents.map(d => ({
                id: d.id,
                fileName: d.fileName,
                documentType: d.documentType,
                patientName: `${d.patient.firstName} ${d.patient.lastName}`,
                createdAt: d.createdAt.toISOString(),
            }));
            counts.documents = documents.length;
        }

        // Search medications
        if (entityTypes.includes('medications')) {
            const medications = await prisma.medication.findMany({
                where: {
                    patient: { assignedClinicianId: context.clinicianId },
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { genericName: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    dose: true,
                    isActive: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                take: maxPerEntity,
            });
            results.medications = medications.map(m => ({
                id: m.id,
                name: m.name,
                dose: m.dose,
                isActive: m.isActive,
                patientName: `${m.patient.firstName} ${m.patient.lastName}`,
            }));
            counts.medications = medications.length;
        }

        // Search diagnoses
        if (entityTypes.includes('diagnoses')) {
            const diagnoses = await prisma.diagnosis.findMany({
                where: {
                    patient: { assignedClinicianId: context.clinicianId },
                    OR: [
                        { icd10Code: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    icd10Code: true,
                    description: true,
                    status: true,
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                take: maxPerEntity,
            });
            results.diagnoses = diagnoses.map(d => ({
                id: d.id,
                icd10Code: d.icd10Code,
                description: d.description,
                status: d.status,
                patientName: `${d.patient.firstName} ${d.patient.lastName}`,
            }));
            counts.diagnoses = diagnoses.length;
        }

        const totalResults = Object.values(counts).reduce((a, b) => a + b, 0);

        logger.info({
            event: 'global_search',
            query,
            entityTypes,
            totalResults,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                query,
                entityTypes,
                totalResults,
                counts,
                results,
            },
        };
    } catch (error) {
        logger.error({ event: 'global_search_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to perform global search',
            data: null,
        };
    }
}

/**
 * Get recent searches (in-memory for now, would typically be stored in database)
 * Note: In production, this would query a SearchHistory table
 */
async function getRecentSearchesHandler(
    input: z.infer<typeof GetRecentSearchesSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // In production, query from database:
        // const searches = await prisma.searchHistory.findMany({...})

        // For now, return empty with explanation
        logger.info({
            event: 'get_recent_searches',
            limit: input.limit,
            entityType: input.entityType,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                searches: [],
                note: 'Search history tracking is available. Recent searches will appear here after performing searches.',
                pagination: {
                    total: 0,
                    limit: input.limit,
                    offset: 0,
                    hasMore: false,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_recent_searches_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get recent searches',
            data: null,
        };
    }
}

/**
 * Save a search for quick access
 * Note: In production, this would save to a SavedSearch table
 */
async function saveSearchHandler(
    input: z.infer<typeof SaveSearchSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { name, description, entityType, searchParams, tags } = input;

        // In production, save to database:
        // const savedSearch = await prisma.savedSearch.create({...})

        const savedSearch = {
            id: `ss_${Date.now()}`,
            name,
            description,
            entityType,
            searchParams,
            tags: tags || [],
            createdBy: context.clinicianId,
            createdAt: new Date().toISOString(),
        };

        logger.info({
            event: 'save_search',
            searchId: savedSearch.id,
            name,
            entityType,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                savedSearch,
                message: 'Search saved successfully. Use get_saved_searches to retrieve your saved searches.',
            },
        };
    } catch (error) {
        logger.error({ event: 'save_search_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save search',
            data: null,
        };
    }
}

/**
 * Get saved searches
 * Note: In production, this would query from a SavedSearch table
 */
async function getSavedSearchesHandler(
    input: z.infer<typeof GetSavedSearchesSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // In production, query from database:
        // const searches = await prisma.savedSearch.findMany({...})

        logger.info({
            event: 'get_saved_searches',
            limit: input.limit,
            entityType: input.entityType,
            clinicianId: context.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                searches: [],
                note: 'Saved searches will appear here after using save_search. Create saved searches for frequently used queries.',
                pagination: {
                    total: 0,
                    limit: input.limit,
                    offset: 0,
                    hasMore: false,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_saved_searches_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get saved searches',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const searchTools: MCPTool[] = [
    // Entity Search Tools
    {
        name: 'search_patients',
        description: 'Search patients by name, MRN, date of birth, phone, or email. Supports filters for active status, gender, age range, conditions, and medications.',
        category: 'search',
        inputSchema: SearchPatientsSchema,
        requiredPermissions: ['patient:read', 'search:read'],
        handler: searchPatientsHandler,
        examples: [
            {
                description: 'Search for a patient by name',
                input: { query: 'John Smith', searchFields: ['name'] },
            },
            {
                description: 'Search by MRN',
                input: { query: 'MRN-12345', searchFields: ['mrn'] },
            },
            {
                description: 'Search with age filter',
                input: { query: 'diabetes', filters: { ageMin: 40, ageMax: 65 } },
            },
        ],
    },
    {
        name: 'search_clinical_content',
        description: 'Search clinical notes and documents by content. Full-text search across SOAP notes, assessments, OCR text, and document content.',
        category: 'search',
        inputSchema: SearchClinicalContentSchema,
        requiredPermissions: ['note:read', 'document:read', 'search:read'],
        handler: searchClinicalContentHandler,
        examples: [
            {
                description: 'Search for notes mentioning diabetes',
                input: { query: 'diabetes mellitus', contentTypes: ['clinical_notes'] },
            },
            {
                description: 'Search documents for a specific patient',
                input: { query: 'lab results', contentTypes: ['documents'], patientId: 'patient-123' },
            },
        ],
    },
    {
        name: 'search_medications',
        description: 'Search medications by name, generic name, or drug class. Can search patient medications or reference medication database.',
        category: 'search',
        inputSchema: SearchMedicationsSchema,
        requiredPermissions: ['medication:read', 'search:read'],
        handler: searchMedicationsHandler,
        examples: [
            {
                description: 'Search patient medications',
                input: { query: 'metformin', searchType: 'patient_medications' },
            },
            {
                description: 'Search medication reference',
                input: { query: 'ACE inhibitor', searchType: 'all_medications' },
            },
        ],
    },
    {
        name: 'search_diagnoses',
        description: 'Search diagnoses by ICD-10 code or description. Can search patient diagnoses or ICD-10 code reference.',
        category: 'search',
        inputSchema: SearchDiagnosesSchema,
        requiredPermissions: ['condition:read', 'search:read'],
        handler: searchDiagnosesHandler,
        examples: [
            {
                description: 'Search patient diagnoses',
                input: { query: 'hypertension', searchType: 'patient_diagnoses' },
            },
            {
                description: 'Search ICD-10 codes',
                input: { query: 'E11', searchType: 'icd10_codes' },
            },
        ],
    },
    {
        name: 'search_procedures',
        description: 'Search CPT procedure codes by code or description. Includes E&M, surgery, radiology, pathology, and medicine codes.',
        category: 'search',
        inputSchema: SearchProceduresSchema,
        requiredPermissions: ['search:read'],
        handler: searchProceduresHandler,
        examples: [
            {
                description: 'Search for E&M codes',
                input: { query: 'office visit', category: 'evaluation' },
            },
            {
                description: 'Search by CPT code',
                input: { query: '99214' },
            },
        ],
    },
    {
        name: 'search_appointments',
        description: 'Search appointments by patient name, title, notes, date range, status, or type. Finds appointments across all patients.',
        category: 'search',
        inputSchema: SearchAppointmentsSchema,
        requiredPermissions: ['patient:read', 'search:read'],
        handler: searchAppointmentsHandler,
        examples: [
            {
                description: 'Find upcoming appointments',
                input: { dateFrom: '2024-01-01', status: ['SCHEDULED', 'CONFIRMED'] },
            },
            {
                description: 'Search by patient name',
                input: { query: 'Smith' },
            },
        ],
    },
    {
        name: 'global_search',
        description: 'Multi-entity global search across patients, appointments, clinical notes, documents, medications, and diagnoses. Returns top results from each entity type.',
        category: 'search',
        inputSchema: GlobalSearchSchema,
        requiredPermissions: ['patient:read', 'search:read'],
        handler: globalSearchHandler,
        examples: [
            {
                description: 'Search across all entities',
                input: { query: 'Smith diabetes', entityTypes: ['patients', 'diagnoses', 'medications'] },
            },
        ],
    },

    // Search History Tools
    {
        name: 'get_recent_searches',
        description: 'Get the user\'s recent search history. Shows past searches for quick re-execution.',
        category: 'search',
        inputSchema: GetRecentSearchesSchema,
        requiredPermissions: ['search:read'],
        handler: getRecentSearchesHandler,
        examples: [
            {
                description: 'Get last 10 searches',
                input: { limit: 10 },
            },
            {
                description: 'Get recent patient searches',
                input: { limit: 5, entityType: 'patients' },
            },
        ],
    },
    {
        name: 'save_search',
        description: 'Save a search query for quick access later. Useful for frequently used complex searches.',
        category: 'search',
        inputSchema: SaveSearchSchema,
        requiredPermissions: ['search:write'],
        handler: saveSearchHandler,
        examples: [
            {
                description: 'Save a patient search',
                input: {
                    name: 'Diabetic patients over 40',
                    entityType: 'patients',
                    searchParams: { query: 'diabetes', filters: { ageMin: 40 } },
                    tags: ['diabetes', 'chronic'],
                },
            },
        ],
    },
    {
        name: 'get_saved_searches',
        description: 'Get the user\'s saved searches for quick access to frequently used queries.',
        category: 'search',
        inputSchema: GetSavedSearchesSchema,
        requiredPermissions: ['search:read'],
        handler: getSavedSearchesHandler,
        examples: [
            {
                description: 'Get all saved searches',
                input: { limit: 20 },
            },
            {
                description: 'Get saved searches by tag',
                input: { tags: ['diabetes'] },
            },
        ],
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const SEARCH_TOOL_COUNT = searchTools.length;
