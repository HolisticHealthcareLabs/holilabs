"use strict";
/**
 * Full-Text Search Utility
 *
 * Powerful search across all healthcare data
 * Simple, fast, intelligent results
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.searchPatients = searchPatients;
exports.getRecentSearches = getRecentSearches;
exports.saveSearchQuery = saveSearchQuery;
const prisma_1 = require("./prisma");
const logger_1 = __importDefault(require("./logger"));
/**
 * Search across all data types
 */
async function search(options) {
    const { userId, userType, query, limit = 20, types } = options;
    if (!query || query.trim().length < 2) {
        return [];
    }
    const searchTerm = query.trim().toLowerCase();
    const results = [];
    try {
        // Search patients (clinicians only)
        if (userType === 'clinician' && (!types || types.includes('patient'))) {
            const patients = await prisma_1.prisma.patient.findMany({
                where: {
                    OR: [
                        { firstName: { contains: searchTerm, mode: 'insensitive' } },
                        { lastName: { contains: searchTerm, mode: 'insensitive' } },
                        { email: { contains: searchTerm, mode: 'insensitive' } },
                        { mrn: { contains: searchTerm, mode: 'insensitive' } },
                        { tokenId: { contains: searchTerm, mode: 'insensitive' } },
                        { cpf: { contains: searchTerm.replace(/\D/g, '') } }, // Remove non-digits from CPF search
                        { cns: { contains: searchTerm.replace(/\D/g, '') } }, // Remove non-digits from CNS search
                    ],
                    assignedClinicianId: userId,
                },
                take: 5,
                orderBy: { updatedAt: 'desc' },
            });
            results.push(...patients.map((patient) => ({
                id: patient.id,
                type: 'patient',
                title: `${patient.firstName} ${patient.lastName}`,
                description: `MRN: ${patient.mrn}${patient.tokenId ? ` • Token: ${patient.tokenId}` : ''}${patient.cpf ? ` • CPF: ${patient.cpf}` : ''}`,
                date: patient.updatedAt,
                url: `/dashboard/patients/${patient.id}`,
                metadata: {
                    mrn: patient.mrn,
                    tokenId: patient.tokenId,
                    dateOfBirth: patient.dateOfBirth,
                    cpf: patient.cpf,
                    cns: patient.cns,
                    isPalliativeCare: patient.isPalliativeCare,
                },
            })));
        }
        // Search appointments
        if (!types || types.includes('appointment')) {
            const appointmentWhere = userType === 'clinician'
                ? { clinicianId: userId }
                : { patientId: userId };
            const appointments = await prisma_1.prisma.appointment.findMany({
                where: {
                    ...appointmentWhere,
                    OR: [
                        { title: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                },
                include: {
                    patient: true,
                    clinician: true,
                },
                take: 5,
                orderBy: { startTime: 'desc' },
            });
            results.push(...appointments.map((appt) => ({
                id: appt.id,
                type: 'appointment',
                title: appt.title,
                description: userType === 'clinician'
                    ? `Paciente: ${appt.patient.firstName} ${appt.patient.lastName}`
                    : `Dr. ${appt.clinician.firstName} ${appt.clinician.lastName}`,
                date: appt.startTime,
                url: userType === 'clinician'
                    ? `/dashboard/appointments/${appt.id}`
                    : `/portal/appointments/${appt.id}`,
                metadata: {
                    status: appt.status,
                    type: appt.type,
                    startTime: appt.startTime,
                },
            })));
        }
        // Search documents
        if (!types || types.includes('document')) {
            const documentWhere = userType === 'clinician'
                ? {
                    patient: {
                        assignedClinicianId: userId,
                    },
                }
                : { patientId: userId };
            const documents = await prisma_1.prisma.document.findMany({
                where: {
                    ...documentWhere,
                    fileName: { contains: searchTerm, mode: 'insensitive' },
                },
                include: {
                    patient: true,
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
            });
            results.push(...documents.map((doc) => ({
                id: doc.id,
                type: 'document',
                title: doc.fileName,
                description: userType === 'clinician'
                    ? `Paciente: ${doc.patient.firstName} ${doc.patient.lastName}`
                    : doc.documentType, // TODO: Changed from doc.type to doc.documentType (actual field name)
                date: doc.createdAt,
                url: userType === 'clinician'
                    ? `/dashboard/patients/${doc.patientId}#documents`
                    : `/portal/documents`,
                metadata: {
                    type: doc.documentType, // TODO: Changed from doc.type to doc.documentType
                    fileSize: doc.fileSize,
                },
            })));
        }
        // Search clinical notes (clinicians only)
        if (userType === 'clinician' && (!types || types.includes('note'))) {
            const notes = await prisma_1.prisma.clinicalNote.findMany({
                where: {
                    authorId: userId,
                    OR: [
                        { subjective: { contains: searchTerm, mode: 'insensitive' } },
                        { objective: { contains: searchTerm, mode: 'insensitive' } },
                        { assessment: { contains: searchTerm, mode: 'insensitive' } },
                        { plan: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                },
                include: {
                    patient: true,
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
            });
            results.push(...notes.map((note) => ({
                id: note.id,
                type: 'note',
                title: `Nota clínica - ${note.patient.firstName} ${note.patient.lastName}`,
                description: note.assessment?.substring(0, 100) || note.type,
                date: note.createdAt,
                url: `/dashboard/patients/${note.patientId}#notes`,
                metadata: {
                    type: note.type,
                },
            })));
        }
        // Search medications
        if (!types || types.includes('medication')) {
            const medicationWhere = userType === 'clinician'
                ? {
                    patient: {
                        assignedClinicianId: userId,
                    },
                }
                : { patientId: userId };
            const medications = await prisma_1.prisma.medication.findMany({
                where: {
                    ...medicationWhere,
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { genericName: { contains: searchTerm, mode: 'insensitive' } },
                    ],
                },
                include: {
                    patient: true,
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
            });
            results.push(...medications.map((med) => ({
                id: med.id,
                type: 'medication',
                title: med.name,
                description: userType === 'clinician'
                    ? `Paciente: ${med.patient.firstName} ${med.patient.lastName}`
                    : `${med.dose} - ${med.frequency}`,
                date: med.createdAt,
                url: userType === 'clinician'
                    ? `/dashboard/patients/${med.patientId}#medications`
                    : `/portal/medications`,
                metadata: {
                    dose: med.dose,
                    frequency: med.frequency,
                    isActive: med.isActive,
                },
            })));
        }
        // Sort by relevance (date for now, can be improved with scoring)
        const sortedResults = results
            .sort((a, b) => {
            if (!a.date || !b.date)
                return 0;
            return b.date.getTime() - a.date.getTime();
        })
            .slice(0, limit);
        logger_1.default.info({
            event: 'search_performed',
            userId,
            userType,
            query: searchTerm,
            resultsCount: sortedResults.length,
        });
        return sortedResults;
    }
    catch (error) {
        logger_1.default.error({
            event: 'search_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            userId,
            query: searchTerm,
        });
        return [];
    }
}
/**
 * Quick search for patients (clinicians only)
 */
async function searchPatients(clinicianId, query) {
    if (!query || query.trim().length < 2) {
        return [];
    }
    const searchTerm = query.trim().toLowerCase();
    const patients = await prisma_1.prisma.patient.findMany({
        where: {
            OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { mrn: { contains: searchTerm, mode: 'insensitive' } },
                { tokenId: { contains: searchTerm, mode: 'insensitive' } },
                { cpf: { contains: searchTerm.replace(/\D/g, '') } },
                { cns: { contains: searchTerm.replace(/\D/g, '') } },
            ],
            assignedClinicianId: clinicianId,
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
    });
    return patients;
}
/**
 * Get recent searches (for autocomplete/suggestions)
 */
async function getRecentSearches(userId, userType) {
    // This would typically be stored in a separate table
    // For now, return empty array
    return [];
}
/**
 * Save search query (for analytics and suggestions)
 */
async function saveSearchQuery(userId, userType, query, resultsCount) {
    // This would typically save to a search_history table
    // For now, just log it
    logger_1.default.info({
        event: 'search_query_saved',
        userId,
        userType,
        query,
        resultsCount,
    });
}
//# sourceMappingURL=search.js.map