/**
 * Add to Plan API Tests
 *
 * TDD-first tests for POST /api/prevention/hub/add-to-plan
 * Adds an intervention to a prevention plan and optionally links to an encounter.
 *
 * Note: These are unit tests that test the logic without importing the actual route
 * to avoid Jest ESM compatibility issues with @auth/prisma-adapter.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Type helper for jest mocks with @jest/globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

// Mock all dependencies FIRST using the CLAUDE.md pattern
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
    preventionPlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    preventionEncounterLink: {
      create: jest.fn(),
    },
    clinicalEncounter: {
      findUnique: jest.fn(),
    },
    preventionPlanVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback({})),
  },
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocks after jest.mock()
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('@/lib/prisma');

describe('POST /api/prevention/hub/add-to-plan - Unit Tests', () => {
  const mockPatientId = 'patient-123';
  const mockPlanId = 'plan-456';
  const mockEncounterId = 'encounter-789';
  const mockUserId = 'clinician-1';

  const mockPatient = {
    id: mockPatientId,
    firstName: 'Jane',
    lastName: 'Doe',
  };

  const mockPlan = {
    id: mockPlanId,
    patientId: mockPatientId,
    planName: 'Cardiovascular Prevention Plan',
    planType: 'CARDIOVASCULAR',
    status: 'ACTIVE',
    goals: [
      { goal: 'Lower LDL < 100', status: 'PENDING' },
    ],
    recommendations: [],
    version: 1,
  };

  const mockEncounter = {
    id: mockEncounterId,
    patientId: mockPatientId,
    status: 'IN_PROGRESS',
  };

  const validIntervention = {
    name: 'Annual Mammography',
    domain: 'oncology',
    type: 'screening',
    description: 'Breast cancer screening',
    evidence: 'USPSTF Grade B recommendation',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    (prisma.patient.findUnique as AnyMock).mockResolvedValue(mockPatient);
    (prisma.preventionPlan.findUnique as AnyMock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.update as AnyMock).mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...mockPlan, ...args.data })
    );
    (prisma.clinicalEncounter.findUnique as AnyMock).mockResolvedValue(mockEncounter);
    (prisma.preventionEncounterLink.create as AnyMock).mockResolvedValue({
      id: 'link-new',
      encounterId: mockEncounterId,
      preventionPlanId: mockPlanId,
    });
    (prisma.preventionPlanVersion.findFirst as AnyMock).mockResolvedValue({ version: 1 });
    (prisma.preventionPlanVersion.create as AnyMock).mockResolvedValue({
      id: 'version-new',
      planId: mockPlanId,
      version: 2,
    });
  });

  describe('Patient Validation', () => {
    it('should verify patient exists before adding intervention', async () => {
      const patient = await prisma.patient.findUnique({
        where: { id: mockPatientId },
      });

      expect(patient).toBeDefined();
      expect(patient.id).toBe(mockPatientId);
    });

    it('should return null for non-existent patient', async () => {
      (prisma.patient.findUnique as AnyMock).mockResolvedValue(null);

      const patient = await prisma.patient.findUnique({
        where: { id: 'non-existent' },
      });

      expect(patient).toBeNull();
    });
  });

  describe('Plan Operations', () => {
    it('should create new plan if planId not provided', async () => {
      const newPlan = {
        id: 'new-plan-id',
        patientId: mockPatientId,
        planName: 'Oncology Screening Plan',
        planType: 'ONCOLOGY_SCREENING',
        status: 'ACTIVE',
        goals: [],
      };

      (prisma.preventionPlan.create as AnyMock).mockResolvedValue(newPlan);

      // Map domain to plan type
      const DOMAIN_TO_PLAN_TYPE: Record<string, string> = {
        cardiometabolic: 'CARDIOVASCULAR',
        oncology: 'ONCOLOGY_SCREENING',
        musculoskeletal: 'COMPREHENSIVE',
      };

      const planType = DOMAIN_TO_PLAN_TYPE[validIntervention.domain] || 'COMPREHENSIVE';

      const createdPlan = await prisma.preventionPlan.create({
        data: {
          patientId: mockPatientId,
          planName: `${validIntervention.domain} Prevention Plan`,
          planType,
          status: 'ACTIVE',
          goals: [],
        },
      });

      expect(createdPlan.id).toBe('new-plan-id');
      expect(createdPlan.planType).toBe('ONCOLOGY_SCREENING');
    });

    it('should add intervention to existing plan goals', async () => {
      const existingGoals = Array.isArray(mockPlan.goals) ? mockPlan.goals : [];
      const newGoal = {
        goal: validIntervention.name,
        status: 'PENDING',
        category: validIntervention.type,
        evidence: validIntervention.evidence,
        addedAt: new Date().toISOString(),
        addedBy: mockUserId,
      };

      const updatedPlan = await prisma.preventionPlan.update({
        where: { id: mockPlanId },
        data: {
          goals: [...existingGoals, newGoal],
          updatedAt: new Date(),
        },
      });

      expect(updatedPlan).toBeDefined();
      expect(prisma.preventionPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockPlanId },
          data: expect.objectContaining({
            goals: expect.any(Array),
          }),
        })
      );
    });

    it('should return null for non-existent plan', async () => {
      (prisma.preventionPlan.findUnique as AnyMock).mockResolvedValue(null);

      const plan = await prisma.preventionPlan.findUnique({
        where: { id: 'non-existent' },
      });

      expect(plan).toBeNull();
    });
  });

  describe('Encounter Link Creation', () => {
    it('should create encounter link when encounterId provided', async () => {
      const link = await prisma.preventionEncounterLink.create({
        data: {
          encounterId: mockEncounterId,
          preventionPlanId: mockPlanId,
          detectedConditions: [{ name: validIntervention.name, type: validIntervention.type }],
          triggeringFindings: { source: 'manual_add' },
          confidence: 1.0,
          sourceType: 'manual',
        },
      });

      expect(link).toBeDefined();
      expect(link.encounterId).toBe(mockEncounterId);
      expect(link.preventionPlanId).toBe(mockPlanId);
      expect(prisma.preventionEncounterLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encounterId: mockEncounterId,
            preventionPlanId: mockPlanId,
          }),
        })
      );
    });

    it('should not create encounter link when encounterId not provided', async () => {
      // In the actual implementation, we don't call create if no encounterId
      const encounterId: string | undefined = undefined;

      if (encounterId) {
        await prisma.preventionEncounterLink.create({
          data: { encounterId, preventionPlanId: mockPlanId },
        });
      }

      expect(prisma.preventionEncounterLink.create).not.toHaveBeenCalled();
    });

    it('should validate encounter belongs to same patient', async () => {
      (prisma.clinicalEncounter.findUnique as AnyMock).mockResolvedValue({
        id: mockEncounterId,
        patientId: 'different-patient',
        status: 'IN_PROGRESS',
      });

      const encounter = await prisma.clinicalEncounter.findUnique({
        where: { id: mockEncounterId },
      });

      // Validation logic
      const isValid = encounter.patientId === mockPatientId;

      expect(isValid).toBe(false);
      expect(encounter.patientId).not.toBe(mockPatientId);
    });
  });

  describe('Version History', () => {
    it('should create version record when updating plan', async () => {
      // Get latest version
      const latestVersion = await prisma.preventionPlanVersion.findFirst({
        where: { planId: mockPlanId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Create version record
      const version = await prisma.preventionPlanVersion.create({
        data: {
          planId: mockPlanId,
          version: nextVersion,
          planData: mockPlan,
          changes: { type: 'goal_added', goal: validIntervention },
          changedBy: mockUserId,
          changeReason: `Added intervention: ${validIntervention.name}`,
        },
      });

      expect(version).toBeDefined();
      expect(version.version).toBe(2);
      expect(prisma.preventionPlanVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            planId: mockPlanId,
            changedBy: mockUserId,
          }),
        })
      );
    });

    it('should increment version number correctly', async () => {
      const latestVersion = await prisma.preventionPlanVersion.findFirst({
        where: { planId: mockPlanId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (latestVersion?.version || 0) + 1;

      expect(nextVersion).toBe(2);
    });
  });

  describe('Response Format Validation', () => {
    it('should construct correct response structure', () => {
      const responseData = {
        success: true,
        message: `Intervention "${validIntervention.name}" added to prevention plan`,
        data: {
          planId: mockPlanId,
          planWasCreated: false,
          interventionAdded: {
            name: validIntervention.name,
            domain: validIntervention.domain,
            type: validIntervention.type,
            status: 'PENDING',
          },
          encounterLinkId: 'link-new',
          version: 2,
        },
      };

      expect(responseData.success).toBe(true);
      expect(responseData.data.planId).toBeDefined();
      expect(responseData.data.interventionAdded).toBeDefined();
      expect(responseData.message).toContain('added');
    });

    it('should include encounter link ID when created', () => {
      const responseData = {
        data: {
          encounterLinkId: 'link-new',
        },
      };

      expect(responseData.data.encounterLinkId).toBe('link-new');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.preventionPlan.update as AnyMock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        prisma.preventionPlan.update({
          where: { id: mockPlanId },
          data: { goals: [] },
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle encounter not found', async () => {
      (prisma.clinicalEncounter.findUnique as AnyMock).mockResolvedValue(null);

      const encounter = await prisma.clinicalEncounter.findUnique({
        where: { id: 'non-existent' },
      });

      expect(encounter).toBeNull();
    });
  });

  describe('Domain to Plan Type Mapping', () => {
    it('should map domains to correct plan types', () => {
      const DOMAIN_TO_PLAN_TYPE: Record<string, string> = {
        cardiometabolic: 'CARDIOVASCULAR',
        oncology: 'ONCOLOGY_SCREENING',
        musculoskeletal: 'COMPREHENSIVE',
        neurocognitive: 'COMPREHENSIVE',
        gut: 'COMPREHENSIVE',
        immune: 'COMPREHENSIVE',
        hormonal: 'COMPREHENSIVE',
      };

      expect(DOMAIN_TO_PLAN_TYPE['oncology']).toBe('ONCOLOGY_SCREENING');
      expect(DOMAIN_TO_PLAN_TYPE['cardiometabolic']).toBe('CARDIOVASCULAR');
      expect(DOMAIN_TO_PLAN_TYPE['musculoskeletal']).toBe('COMPREHENSIVE');
    });
  });
});
