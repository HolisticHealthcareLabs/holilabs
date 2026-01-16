/**
 * CDSS V3 - Patient Repository
 *
 * Data access layer for patient-related operations.
 * Isolates Prisma queries from business logic for testability.
 */

import { prisma } from '@/lib/prisma';
import type { Patient, Medication, VitalSign, LabResult, Allergy, Diagnosis } from '@prisma/client';

export interface PatientWithMedications extends Patient {
  medications: Medication[];
}

export interface PatientContext {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: string;
  medications: Array<{
    id: string;
    name: string;
    dose: string;
    frequency: string;
    isActive: boolean;
  }>;
  vitals: Array<{
    temperature?: number | null;
    heartRate?: number | null;
    systolicBP?: number | null;
    diastolicBP?: number | null;
    respiratoryRate?: number | null;
    oxygenSaturation?: number | null;
    createdAt: Date;
  }>;
  labResults: Array<{
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    isCritical: boolean;
    createdAt: Date;
  }>;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
  }>;
  diagnoses: Array<{
    icd10Code: string;
    description: string;
    diagnosedAt: Date;
  }>;
  conditions: string[];
  lastVisit?: Date;
}

export class PatientRepository {
  /**
   * Find patient by ID with basic info
   */
  async findById(patientId: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { id: patientId },
    });
  }

  /**
   * Find patient with active medications
   */
  async findWithMedications(patientId: string): Promise<PatientWithMedications | null> {
    return prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get full patient context for CDSS analysis
   */
  async getPatientContext(patientId: string): Promise<PatientContext | null> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        vitalSigns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        labResults: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        allergies: true,
        diagnoses: {
          orderBy: { diagnosedAt: 'desc' },
          take: 10,
        },
        appointments: {
          where: { status: 'COMPLETED' },
          orderBy: { endTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!patient) {
      return null;
    }

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex || 'unknown',
      medications: patient.medications.map((m) => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        frequency: m.frequency || 'as directed',
        isActive: m.isActive,
      })),
      vitals: patient.vitalSigns.map((v) => ({
        temperature: v.temperature,
        heartRate: v.heartRate,
        systolicBP: v.systolicBP,
        diastolicBP: v.diastolicBP,
        respiratoryRate: v.respiratoryRate,
        oxygenSaturation: v.oxygenSaturation,
        createdAt: v.createdAt,
      })),
      labResults: patient.labResults.map((l) => ({
        testName: l.testName,
        value: l.value || '',
        unit: l.unit || '',
        referenceRange: l.referenceRange || '',
        isAbnormal: l.isAbnormal,
        isCritical: l.isCritical,
        createdAt: l.createdAt,
      })),
      allergies: patient.allergies.map((a) => ({
        allergen: a.allergen,
        reaction: a.reactions?.join(', ') || '',
        severity: (a.severity as 'MILD' | 'MODERATE' | 'SEVERE') || 'MILD',
      })),
      diagnoses: patient.diagnoses.map((d) => ({
        icd10Code: d.icd10Code,
        description: d.description,
        diagnosedAt: d.diagnosedAt,
      })),
      conditions: patient.diagnoses.map((d) => d.description),
      lastVisit: patient.appointments[0]?.endTime || undefined,
    };
  }

  /**
   * Get patients for a clinician
   */
  async getClinicianPatients(
    clinicianId: string,
    limit: number = 50
  ): Promise<Patient[]> {
    return prisma.patient.findMany({
      where: {
        OR: [
          { appointments: { some: { clinicianId } } },
          { soapNotes: { some: { clinicianId } } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get critical lab results for a patient within specified days
   */
  async getCriticalLabs(
    patientId: string,
    withinDays: number = 7
  ): Promise<LabResult[]> {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    return prisma.labResult.findMany({
      where: {
        patientId,
        isCritical: true,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get recent hospitalizations for a patient
   */
  async getRecentHospitalizations(
    patientId: string,
    withinDays: number = 30
  ): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    // Check for discharge notes as proxy for hospitalization
    const count = await prisma.clinicalNote.count({
      where: {
        patientId,
        type: 'Discharge',
        createdAt: { gte: since },
      },
    });

    return count;
  }
}

// Export singleton instance
export const patientRepository = new PatientRepository();
