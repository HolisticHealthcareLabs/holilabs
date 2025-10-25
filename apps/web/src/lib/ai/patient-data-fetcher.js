"use strict";
/**
 * Patient Data Fetcher
 *
 * Utility functions to fetch patient data with all related information
 * for AI context generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPatientWithContext = fetchPatientWithContext;
exports.fetchPatientByMRN = fetchPatientByMRN;
exports.fetchPatientForAppointment = fetchPatientForAppointment;
exports.searchPatientsWithContext = searchPatientsWithContext;
exports.fetchRecentPatients = fetchRecentPatients;
const prisma_1 = require("@/lib/prisma");
/**
 * Fetch patient with all related data for AI context
 */
async function fetchPatientWithContext(patientId) {
    try {
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                medications: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                },
                appointments: {
                    orderBy: { startTime: 'desc' },
                    take: 10, // Last 10 appointments
                },
                consents: {
                    where: { isActive: true },
                    orderBy: { signedAt: 'desc' },
                },
            },
        });
        return patient;
    }
    catch (error) {
        console.error('Error fetching patient with context:', error);
        return null;
    }
}
/**
 * Fetch patient by MRN with all related data
 */
async function fetchPatientByMRN(mrn) {
    try {
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { mrn },
            include: {
                medications: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                },
                appointments: {
                    orderBy: { startTime: 'desc' },
                    take: 10,
                },
                consents: {
                    where: { isActive: true },
                    orderBy: { signedAt: 'desc' },
                },
            },
        });
        return patient;
    }
    catch (error) {
        console.error('Error fetching patient by MRN:', error);
        return null;
    }
}
/**
 * Fetch patient for a specific appointment
 */
async function fetchPatientForAppointment(appointmentId) {
    try {
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: {
                    include: {
                        medications: {
                            where: { isActive: true },
                            orderBy: { createdAt: 'desc' },
                        },
                        appointments: {
                            orderBy: { startTime: 'desc' },
                            take: 10,
                        },
                        consents: {
                            where: { isActive: true },
                            orderBy: { signedAt: 'desc' },
                        },
                    },
                },
            },
        });
        return appointment?.patient || null;
    }
    catch (error) {
        console.error('Error fetching patient for appointment:', error);
        return null;
    }
}
/**
 * Search patients with context (for AI assistant)
 */
async function searchPatientsWithContext(searchTerm, limit = 10) {
    try {
        const patients = await prisma_1.prisma.patient.findMany({
            where: {
                OR: [
                    { firstName: { contains: searchTerm, mode: 'insensitive' } },
                    { lastName: { contains: searchTerm, mode: 'insensitive' } },
                    { mrn: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                ],
                isActive: true,
            },
            include: {
                medications: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                appointments: {
                    orderBy: { startTime: 'desc' },
                    take: 5,
                },
                consents: {
                    where: { isActive: true },
                    orderBy: { signedAt: 'desc' },
                    take: 3,
                },
            },
            take: limit,
            orderBy: { lastName: 'asc' },
        });
        return patients;
    }
    catch (error) {
        console.error('Error searching patients:', error);
        return [];
    }
}
/**
 * Fetch recent patients (for dashboard)
 */
async function fetchRecentPatients(clinicianId, limit = 5) {
    try {
        // Get recent appointments for this clinician
        const recentAppointments = await prisma_1.prisma.appointment.findMany({
            where: {
                clinicianId,
                status: { in: ['COMPLETED', 'IN_PROGRESS'] },
            },
            orderBy: { startTime: 'desc' },
            take: limit,
            include: {
                patient: {
                    include: {
                        medications: {
                            where: { isActive: true },
                            orderBy: { createdAt: 'desc' },
                            take: 3,
                        },
                        appointments: {
                            orderBy: { startTime: 'desc' },
                            take: 5,
                        },
                        consents: {
                            where: { isActive: true },
                            orderBy: { signedAt: 'desc' },
                            take: 2,
                        },
                    },
                },
            },
        });
        // Extract unique patients
        const seenPatientIds = new Set();
        const patients = [];
        for (const appointment of recentAppointments) {
            if (!seenPatientIds.has(appointment.patient.id)) {
                seenPatientIds.add(appointment.patient.id);
                patients.push(appointment.patient);
            }
        }
        return patients;
    }
    catch (error) {
        console.error('Error fetching recent patients:', error);
        return [];
    }
}
//# sourceMappingURL=patient-data-fetcher.js.map