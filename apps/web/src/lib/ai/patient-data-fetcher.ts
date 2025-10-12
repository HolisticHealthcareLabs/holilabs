/**
 * Patient Data Fetcher
 *
 * Utility functions to fetch patient data with all related information
 * for AI context generation
 */

import { prisma } from '@/lib/prisma';
import { PatientWithRelations } from './patient-context-formatter';

/**
 * Fetch patient with all related data for AI context
 */
export async function fetchPatientWithContext(patientId: string): Promise<PatientWithRelations | null> {
  try {
    const patient = await prisma.patient.findUnique({
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
  } catch (error) {
    console.error('Error fetching patient with context:', error);
    return null;
  }
}

/**
 * Fetch patient by MRN with all related data
 */
export async function fetchPatientByMRN(mrn: string): Promise<PatientWithRelations | null> {
  try {
    const patient = await prisma.patient.findUnique({
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
  } catch (error) {
    console.error('Error fetching patient by MRN:', error);
    return null;
  }
}

/**
 * Fetch patient for a specific appointment
 */
export async function fetchPatientForAppointment(appointmentId: string): Promise<PatientWithRelations | null> {
  try {
    const appointment = await prisma.appointment.findUnique({
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
  } catch (error) {
    console.error('Error fetching patient for appointment:', error);
    return null;
  }
}

/**
 * Search patients with context (for AI assistant)
 */
export async function searchPatientsWithContext(searchTerm: string, limit: number = 10): Promise<PatientWithRelations[]> {
  try {
    const patients = await prisma.patient.findMany({
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
  } catch (error) {
    console.error('Error searching patients:', error);
    return [];
  }
}

/**
 * Fetch recent patients (for dashboard)
 */
export async function fetchRecentPatients(clinicianId: string, limit: number = 5): Promise<PatientWithRelations[]> {
  try {
    // Get recent appointments for this clinician
    const recentAppointments = await prisma.appointment.findMany({
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
    const seenPatientIds = new Set<string>();
    const patients: PatientWithRelations[] = [];

    for (const appointment of recentAppointments) {
      if (!seenPatientIds.has(appointment.patient.id)) {
        seenPatientIds.add(appointment.patient.id);
        patients.push(appointment.patient);
      }
    }

    return patients;
  } catch (error) {
    console.error('Error fetching recent patients:', error);
    return [];
  }
}
