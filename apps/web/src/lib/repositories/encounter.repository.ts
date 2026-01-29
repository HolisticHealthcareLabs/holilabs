/**
 * CDSS V3 - Encounter Repository
 *
 * Data access layer for clinical encounter operations.
 */

import { prisma } from '@/lib/prisma';
import { Prisma, type ClinicalEncounter, type EncounterStatus } from '@prisma/client';

export interface CreateEncounterInput {
  patientId: string;
  providerId: string;
  appointmentId?: string;
  scheduledAt: Date;
  chiefComplaint?: string;
}

export interface UpdateEncounterInput {
  status?: EncounterStatus;
  startedAt?: Date;
  endedAt?: Date;
  chiefComplaint?: string;
  summaryDraft?: Prisma.JsonValue;
}

export interface EncounterWithRelations extends ClinicalEncounter {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  provider: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class EncounterRepository {
  /**
   * Find encounter by ID
   */
  async findById(encounterId: string): Promise<ClinicalEncounter | null> {
    return prisma.clinicalEncounter.findUnique({
      where: { id: encounterId },
    });
  }

  /**
   * Find encounter with patient and provider details
   */
  async findWithRelations(encounterId: string): Promise<EncounterWithRelations | null> {
    const encounter = await prisma.clinicalEncounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    return encounter as EncounterWithRelations | null;
  }

  /**
   * Create a new encounter
   */
  async create(data: CreateEncounterInput): Promise<ClinicalEncounter> {
    return prisma.clinicalEncounter.create({
      data: {
        patientId: data.patientId,
        providerId: data.providerId,
        appointmentId: data.appointmentId,
        scheduledAt: data.scheduledAt,
        chiefComplaint: data.chiefComplaint,
        status: 'SCHEDULED',
      },
    });
  }

  /**
   * Update encounter
   */
  async update(
    encounterId: string,
    data: UpdateEncounterInput
  ): Promise<ClinicalEncounter> {
    // Transform summaryDraft to handle null properly for Prisma
    const transformedData = {
      ...data,
      summaryDraft: data.summaryDraft === null ? Prisma.JsonNull : data.summaryDraft,
    };
    return prisma.clinicalEncounter.update({
      where: { id: encounterId },
      data: transformedData,
    });
  }

  /**
   * Start an encounter (set status to IN_PROGRESS)
   */
  async startEncounter(encounterId: string): Promise<ClinicalEncounter> {
    return prisma.clinicalEncounter.update({
      where: { id: encounterId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Complete an encounter
   */
  async completeEncounter(encounterId: string): Promise<ClinicalEncounter> {
    return prisma.clinicalEncounter.update({
      where: { id: encounterId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });
  }

  /**
   * Save summary draft
   */
  async saveSummaryDraft(
    encounterId: string,
    summaryDraft: Prisma.JsonValue
  ): Promise<ClinicalEncounter> {
    return prisma.clinicalEncounter.update({
      where: { id: encounterId },
      data: { summaryDraft: summaryDraft === null ? Prisma.JsonNull : summaryDraft },
    });
  }

  /**
   * Get active encounters for a provider
   */
  async getActiveEncounters(providerId: string): Promise<ClinicalEncounter[]> {
    return prisma.clinicalEncounter.findMany({
      where: {
        providerId,
        status: {
          in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'],
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get today's encounters for a provider
   */
  async getTodaysEncounters(providerId: string): Promise<EncounterWithRelations[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.clinicalEncounter.findMany({
      where: {
        providerId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}

// Export singleton instance
export const encounterRepository = new EncounterRepository();
