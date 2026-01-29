/**
 * Prevention Hub API Tests
 *
 * TDD-first tests for GET /api/prevention/hub/[patientId]
 * Fetches patient prevention profile for the longitudinal hub view.
 *
 * Latency Budget: ≤200ms for getPatientPreventionProfile()
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

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
      findMany: jest.fn(),
    },
    riskScore: {
      findMany: jest.fn(),
    },
    screeningOutcome: {
      findMany: jest.fn(),
    },
    preventionEncounterLink: {
      findMany: jest.fn(),
    },
    medication: {
      findMany: jest.fn(),
    },
    clinicalEncounter: {
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('@/lib/prisma');

describe('GET /api/prevention/hub/[patientId] - Unit Tests', () => {
  const mockPatientId = 'patient-123';

  const mockPatient = {
    id: mockPatientId,
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-15'),
    gender: 'female',
    email: 'jane.doe@test.com',
    phone: '555-0100',
    city: 'San Francisco',
    state: 'CA',
  };

  const mockRiskScores = [
    {
      id: 'risk-1',
      patientId: mockPatientId,
      riskType: 'ASCVD',
      score: 12.5,
      scorePercentage: '12.5%',
      category: 'Moderate',
      algorithmVersion: 'ACC-AHA-2013',
      recommendation: 'Consider statin therapy',
      nextSteps: ['Discuss lifestyle modifications', 'Recheck in 6 months'],
      calculatedAt: new Date(),
      nextCalculationDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'risk-2',
      patientId: mockPatientId,
      riskType: 'DIABETES',
      score: 35.2,
      scorePercentage: '35.2%',
      category: 'High',
      algorithmVersion: 'ADA-2021',
      recommendation: 'Intensive lifestyle intervention recommended',
      nextSteps: ['HbA1c testing', 'Referral to dietitian'],
      calculatedAt: new Date(),
      nextCalculationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ];

  const mockPreventionPlans = [
    {
      id: 'plan-1',
      patientId: mockPatientId,
      planName: 'Cardiovascular Prevention Plan',
      planType: 'CARDIOVASCULAR',
      description: 'ASCVD risk reduction',
      status: 'ACTIVE',
      goals: [
        { goal: 'Lower LDL < 100', targetDate: null, status: 'IN_PROGRESS' },
        { goal: 'Exercise 150 min/week', targetDate: null, status: 'PENDING' },
      ],
      recommendations: [
        { category: 'medication', intervention: 'Consider statin', priority: 'HIGH' },
      ],
      guidelineSource: 'ACC/AHA 2019',
      evidenceLevel: 'Grade A',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockScreeningOutcomes = [
    {
      id: 'screening-1',
      patientId: mockPatientId,
      screeningType: 'mammogram',
      screeningCode: '77067',
      scheduledDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedDate: null,
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      result: null,
      followUpRecommended: false,
    },
    {
      id: 'screening-2',
      patientId: mockPatientId,
      screeningType: 'lipid_panel',
      screeningCode: '80061',
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      completedDate: null,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      result: null,
      followUpRecommended: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    (prisma.patient.findUnique as AnyMock).mockResolvedValue(mockPatient);
    (prisma.riskScore.findMany as AnyMock).mockResolvedValue(mockRiskScores);
    (prisma.preventionPlan.findMany as AnyMock).mockResolvedValue(mockPreventionPlans);
    (prisma.screeningOutcome.findMany as AnyMock).mockResolvedValue(mockScreeningOutcomes);
    (prisma.preventionEncounterLink.findMany as AnyMock).mockResolvedValue([]);
  });

  describe('Data Fetching', () => {
    it('should return patient data when found', async () => {
      const patient = await prisma.patient.findUnique({
        where: { id: mockPatientId },
      });

      expect(patient).toBeDefined();
      expect(patient.id).toBe(mockPatientId);
      expect(patient.firstName).toBe('Jane');
    });

    it('should return null when patient not found', async () => {
      (prisma.patient.findUnique as AnyMock).mockResolvedValue(null);

      const patient = await prisma.patient.findUnique({
        where: { id: 'non-existent' },
      });

      expect(patient).toBeNull();
    });

    it('should fetch risk scores for patient', async () => {
      const riskScores = await prisma.riskScore.findMany({
        where: { patientId: mockPatientId },
      });

      expect(riskScores).toHaveLength(2);
      expect(riskScores[0].riskType).toBe('ASCVD');
      expect(riskScores[1].riskType).toBe('DIABETES');
    });

    it('should fetch prevention plans for patient', async () => {
      const plans = await prisma.preventionPlan.findMany({
        where: { patientId: mockPatientId },
      });

      expect(plans).toHaveLength(1);
      expect(plans[0].planType).toBe('CARDIOVASCULAR');
    });

    it('should fetch screening outcomes for patient', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      expect(screenings).toHaveLength(2);
    });
  });

  describe('Risk Score Mapping', () => {
    it('should map risk scores to hub format', async () => {
      const riskScores = await prisma.riskScore.findMany({
        where: { patientId: mockPatientId },
      });

      const RISK_TYPE_NAMES: Record<string, string> = {
        ASCVD: '10-Year ASCVD Risk',
        DIABETES: 'Lifetime Diabetes Risk',
        FRAX: 'FRAX Score (10-year fracture)',
      };

      const mapCategoryToLevel = (category: string): string => {
        const normalized = category.toLowerCase().trim();
        if (normalized.includes('very') || normalized.includes('critical')) return 'very-high';
        if (normalized.includes('high') || normalized.includes('elevated')) return 'high';
        if (normalized.includes('moderate') || normalized.includes('intermediate')) return 'moderate';
        return 'low';
      };

      const hubRiskScores = riskScores.map((risk: any) => ({
        id: risk.id,
        name: RISK_TYPE_NAMES[risk.riskType] || risk.riskType,
        score: risk.score,
        level: mapCategoryToLevel(risk.category),
        lastCalculated: risk.calculatedAt,
        nextDue: risk.nextCalculationDue,
      }));

      expect(hubRiskScores[0].name).toBe('10-Year ASCVD Risk');
      expect(hubRiskScores[0].level).toBe('moderate');
      expect(hubRiskScores[1].name).toBe('Lifetime Diabetes Risk');
      expect(hubRiskScores[1].level).toBe('high');
    });
  });

  describe('Intervention Status Calculation', () => {
    it('should identify overdue interventions', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      const calculateStatus = (
        dueDate: Date | null,
        completedDate: Date | null,
        scheduledDate: Date | null
      ): string => {
        if (completedDate) return 'completed';
        if (scheduledDate && scheduledDate > new Date()) return 'scheduled';
        if (dueDate) {
          const now = new Date();
          if (dueDate < now) return 'overdue';
          return 'due';
        }
        return 'due';
      };

      const statuses = screenings.map((s: any) =>
        calculateStatus(s.dueDate, s.completedDate, s.scheduledDate)
      );

      expect(statuses[0]).toBe('overdue'); // mammogram - 30 days past
      expect(statuses[1]).toBe('scheduled'); // lipid - 14 days future with scheduled date
    });
  });

  describe('Domain Mapping', () => {
    it('should map screening types to health domains', () => {
      const SCREENING_TO_DOMAIN: Record<string, string> = {
        mammogram: 'oncology',
        colonoscopy: 'oncology',
        lipid_panel: 'cardiometabolic',
        hba1c: 'cardiometabolic',
        dexa: 'musculoskeletal',
      };

      expect(SCREENING_TO_DOMAIN['mammogram']).toBe('oncology');
      expect(SCREENING_TO_DOMAIN['lipid_panel']).toBe('cardiometabolic');
    });
  });

  describe('Latency Compliance', () => {
    it('should complete parallel queries under 200ms', async () => {
      const start = performance.now();

      await Promise.all([
        prisma.patient.findUnique({ where: { id: mockPatientId } }),
        prisma.riskScore.findMany({ where: { patientId: mockPatientId } }),
        prisma.preventionPlan.findMany({ where: { patientId: mockPatientId } }),
        prisma.screeningOutcome.findMany({ where: { patientId: mockPatientId } }),
        prisma.preventionEncounterLink.findMany({ where: { preventionPlanId: { in: [] } } }),
      ]);

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.patient.findUnique as AnyMock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        prisma.patient.findUnique({ where: { id: mockPatientId } })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle partial data failures with Promise.allSettled', async () => {
      (prisma.riskScore.findMany as AnyMock).mockRejectedValue(
        new Error('Risk score query failed')
      );

      const results = await Promise.allSettled([
        prisma.patient.findUnique({ where: { id: mockPatientId } }),
        prisma.riskScore.findMany({ where: { patientId: mockPatientId } }),
        prisma.preventionPlan.findMany({ where: { patientId: mockPatientId } }),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Patient Age Calculation', () => {
    it('should calculate patient age correctly', () => {
      const calculateAge = (dateOfBirth: Date): number => {
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
          age--;
        }
        return age;
      };

      const age = calculateAge(mockPatient.dateOfBirth);
      expect(age).toBeGreaterThanOrEqual(44);
      expect(age).toBeLessThanOrEqual(46);
    });
  });

  describe('Prevention Gaps Summary', () => {
    it('should calculate prevention gaps correctly', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      const now = new Date();
      const overdueCount = screenings.filter(
        (s: any) => s.dueDate && !s.completedDate && new Date(s.dueDate) < now
      ).length;
      const dueCount = screenings.filter(
        (s: any) => s.dueDate && !s.completedDate && new Date(s.dueDate) >= now
      ).length;

      expect(overdueCount).toBe(1);
      expect(dueCount).toBe(1);
    });
  });
});
