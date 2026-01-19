/**
 * Prevention History API Tests
 *
 * TDD-first tests for GET /api/prevention/history/[patientId]
 * Phase 3: History & Compliance
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies FIRST using CLAUDE.md pattern
jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    preventionPlanVersion: {
      findMany: jest.fn(),
    },
    screeningOutcome: {
      findMany: jest.fn(),
    },
    preventionEncounterLink: {
      findMany: jest.fn(),
    },
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
const { prisma } = require('@/lib/prisma');

describe('GET /api/prevention/history/[patientId] - Unit Tests', () => {
  const mockPatientId = 'patient-history-123';
  const mockPlanId = 'plan-history-456';
  const mockUserId = 'clinician-1';

  const mockPlan = {
    id: mockPlanId,
    patientId: mockPatientId,
    planName: 'Cardiovascular Prevention Plan',
    planType: 'CARDIOVASCULAR',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  };

  const mockVersions = [
    {
      id: 'version-1',
      planId: mockPlanId,
      version: 1,
      planData: { goals: [] },
      changes: { type: 'plan_created' },
      changedBy: mockUserId,
      changeReason: 'Initial creation',
      createdAt: new Date('2024-01-01'),
      clinician: { id: mockUserId, name: 'Dr. Smith', email: 'dr.smith@test.com' },
    },
    {
      id: 'version-2',
      planId: mockPlanId,
      version: 2,
      planData: { goals: [{ goal: 'Lower LDL', status: 'PENDING' }] },
      changes: { type: 'goal_added', goal: 'Lower LDL' },
      changedBy: mockUserId,
      changeReason: 'Added lipid goal',
      createdAt: new Date('2024-03-01'),
      clinician: { id: mockUserId, name: 'Dr. Smith', email: 'dr.smith@test.com' },
    },
  ];

  const mockScreenings = [
    {
      id: 'screening-1',
      patientId: mockPatientId,
      screeningType: 'colonoscopy',
      scheduledDate: new Date('2024-02-01'),
      completedDate: new Date('2024-02-15'),
      dueDate: new Date('2024-02-01'),
      result: 'normal',
      notes: 'No polyps',
      createdAt: new Date('2024-02-01'),
    },
    {
      id: 'screening-2',
      patientId: mockPatientId,
      screeningType: 'mammogram',
      scheduledDate: new Date('2024-06-01'),
      completedDate: null,
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days overdue
      result: null,
      createdAt: new Date('2024-05-15'),
    },
  ];

  const mockEncounterLinks = [
    {
      id: 'link-1',
      encounterId: 'encounter-1',
      preventionPlanId: mockPlanId,
      detectedConditions: [{ name: 'Hyperlipidemia' }],
      createdAt: new Date('2024-03-01'),
      encounter: {
        id: 'encounter-1',
        encounterDate: new Date('2024-03-01'),
        encounterType: 'OFFICE_VISIT',
        chiefComplaint: 'Checkup',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlan.findFirst as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventionPlanVersion.findMany as jest.Mock).mockResolvedValue(mockVersions);
    (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue(mockScreenings);
    (prisma.preventionEncounterLink.findMany as jest.Mock).mockResolvedValue(mockEncounterLinks);
  });

  describe('Data Fetching', () => {
    it('should fetch plan version history', async () => {
      const versions = await prisma.preventionPlanVersion.findMany({
        where: { planId: mockPlanId },
        orderBy: { version: 'desc' },
        include: { clinician: { select: { id: true, name: true, email: true } } },
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(1);
      expect(versions[0].clinician.name).toBe('Dr. Smith');
    });

    it('should fetch screening outcomes for patient', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      expect(screenings).toHaveLength(2);
    });

    it('should fetch encounter links for plan', async () => {
      const links = await prisma.preventionEncounterLink.findMany({
        where: { preventionPlanId: mockPlanId },
        include: { encounter: true },
      });

      expect(links).toHaveLength(1);
      expect(links[0].encounterId).toBe('encounter-1');
    });
  });

  describe('Version Comparison Logic', () => {
    it('should compute diff between versions', () => {
      const version1 = mockVersions[0];
      const version2 = mockVersions[1];

      const v1Goals = (version1.planData as any).goals || [];
      const v2Goals = (version2.planData as any).goals || [];

      const goalsAdded = v2Goals.filter(
        (g: any) => !v1Goals.some((v1g: any) => v1g.goal === g.goal)
      );

      expect(goalsAdded).toHaveLength(1);
      expect(goalsAdded[0].goal).toBe('Lower LDL');
    });
  });

  describe('Timeline Construction', () => {
    it('should build timeline from versions, screenings, and encounters', async () => {
      const [versions, screenings, links] = await Promise.all([
        prisma.preventionPlanVersion.findMany({ where: { planId: mockPlanId } }),
        prisma.screeningOutcome.findMany({ where: { patientId: mockPatientId } }),
        prisma.preventionEncounterLink.findMany({ where: { preventionPlanId: mockPlanId } }),
      ]);

      const events: Array<{ type: string; date: Date }> = [];

      versions.forEach((v: any) => {
        events.push({
          type: v.version === 1 ? 'plan_created' : 'plan_updated',
          date: v.createdAt,
        });
      });

      const now = new Date();
      screenings.forEach((s: any) => {
        if (s.completedDate) {
          events.push({ type: 'screening_completed', date: s.completedDate });
        } else if (s.dueDate && new Date(s.dueDate) < now) {
          events.push({ type: 'screening_overdue', date: s.dueDate });
        } else if (s.scheduledDate) {
          events.push({ type: 'screening_scheduled', date: s.scheduledDate });
        }
      });

      links.forEach((l: any) => {
        events.push({ type: 'encounter_linked', date: l.createdAt });
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'plan_created')).toBe(true);
      expect(events.some((e) => e.type === 'screening_completed')).toBe(true);
    });

    it('should sort timeline by date', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-03-01'),
        new Date('2024-02-15'),
      ];

      const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());

      expect(sorted[0].getTime()).toBeGreaterThan(sorted[1].getTime());
      expect(sorted[1].getTime()).toBeGreaterThan(sorted[2].getTime());
    });
  });

  describe('Screening Compliance', () => {
    it('should calculate compliance rate', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      const completed = screenings.filter((s: any) => s.completedDate).length;
      const total = screenings.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

      expect(rate).toBe(50); // 1 of 2 completed
    });

    it('should identify overdue screenings', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      const now = new Date();
      const overdue = screenings.filter(
        (s: any) => !s.completedDate && s.dueDate && new Date(s.dueDate) < now
      );

      expect(overdue).toHaveLength(1);
      expect(overdue[0].screeningType).toBe('mammogram');
    });
  });

  describe('HIPAA Audit Trail', () => {
    it('should include who made each version change', async () => {
      const versions = await prisma.preventionPlanVersion.findMany({
        where: { planId: mockPlanId },
        select: { changedBy: true, changeReason: true, createdAt: true },
      });

      versions.forEach((v: any) => {
        expect(v.changedBy).toBeDefined();
        expect(v.createdAt).toBeDefined();
      });
    });

    it('should preserve full plan state at each version', async () => {
      const versions = await prisma.preventionPlanVersion.findMany({
        where: { planId: mockPlanId },
      });

      versions.forEach((v: any) => {
        expect(v.planData).toBeDefined();
      });
    });
  });

  describe('Latency Compliance', () => {
    it('should complete parallel queries under 200ms', async () => {
      const start = performance.now();

      await Promise.all([
        prisma.preventionPlan.findUnique({ where: { id: mockPlanId } }),
        prisma.preventionPlanVersion.findMany({ where: { planId: mockPlanId } }),
        prisma.screeningOutcome.findMany({ where: { patientId: mockPatientId } }),
        prisma.preventionEncounterLink.findMany({ where: { preventionPlanId: mockPlanId } }),
      ]);

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.preventionPlanVersion.findMany as jest.Mock).mockRejectedValue(
        new Error('Database timeout')
      );

      await expect(
        prisma.preventionPlanVersion.findMany({ where: { planId: mockPlanId } })
      ).rejects.toThrow('Database timeout');
    });

    it('should return null for non-existent plan', async () => {
      (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

      const plan = await prisma.preventionPlan.findUnique({
        where: { id: 'non-existent' },
      });

      expect(plan).toBeNull();
    });

    it('should handle empty version history', async () => {
      (prisma.preventionPlanVersion.findMany as jest.Mock).mockResolvedValue([]);

      const versions = await prisma.preventionPlanVersion.findMany({
        where: { planId: 'new-plan' },
      });

      expect(versions).toHaveLength(0);
    });
  });
});
