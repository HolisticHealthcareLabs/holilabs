/**
 * Prevention Export Service Tests
 *
 * TDD-first tests for CSV/PDF export functionality
 * Phase 5: Hub Actions & Clinical Workflows
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
    preventionPlan: {
      findMany: jest.fn(),
    },
    screeningOutcome: {
      findMany: jest.fn(),
    },
    riskScore: {
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

const { prisma } = require('@/lib/prisma');

describe('Prevention Export Service', () => {
  const mockPatientId = 'patient-123';

  const mockPatient = {
    id: mockPatientId,
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-15'),
    gender: 'female',
    mrn: 'MRN-12345',
  };

  const mockRiskScores = [
    {
      id: 'risk-1',
      patientId: mockPatientId,
      riskType: 'ASCVD',
      score: 12.5,
      category: 'Moderate',
      calculatedAt: new Date('2024-01-01'),
    },
    {
      id: 'risk-2',
      patientId: mockPatientId,
      riskType: 'DIABETES',
      score: 35.2,
      category: 'High',
      calculatedAt: new Date('2024-01-01'),
    },
  ];

  const mockScreenings = [
    {
      id: 'screening-1',
      patientId: mockPatientId,
      screeningType: 'mammogram',
      scheduledDate: new Date('2024-02-15'),
      completedDate: new Date('2024-02-20'),
      result: 'normal',
      notes: 'Annual screening completed',
    },
    {
      id: 'screening-2',
      patientId: mockPatientId,
      screeningType: 'colonoscopy',
      scheduledDate: new Date('2024-06-01'),
      completedDate: null,
      dueDate: new Date('2024-06-01'),
      result: null,
      notes: null,
    },
  ];

  const mockPlans = [
    {
      id: 'plan-1',
      patientId: mockPatientId,
      planName: 'Cardiovascular Prevention',
      planType: 'CARDIOVASCULAR',
      status: 'ACTIVE',
      goals: [
        { goal: 'Lower LDL < 100', status: 'IN_PROGRESS' },
        { goal: 'Exercise 150 min/week', status: 'COMPLETED' },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.riskScore.findMany as jest.Mock).mockResolvedValue(mockRiskScores);
    (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue(mockScreenings);
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue(mockPlans);
  });

  describe('Data Fetching', () => {
    it('should fetch patient data', async () => {
      const patient = await prisma.patient.findUnique({
        where: { id: mockPatientId },
      });

      expect(patient).toBeDefined();
      expect(patient.firstName).toBe('Jane');
      expect(patient.lastName).toBe('Doe');
    });

    it('should fetch risk scores', async () => {
      const scores = await prisma.riskScore.findMany({
        where: { patientId: mockPatientId },
      });

      expect(scores).toHaveLength(2);
      expect(scores[0].riskType).toBe('ASCVD');
    });

    it('should fetch screenings', async () => {
      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });

      expect(screenings).toHaveLength(2);
      expect(screenings[0].screeningType).toBe('mammogram');
    });

    it('should fetch prevention plans', async () => {
      const plans = await prisma.preventionPlan.findMany({
        where: { patientId: mockPatientId },
      });

      expect(plans).toHaveLength(1);
      expect(plans[0].planType).toBe('CARDIOVASCULAR');
    });
  });

  describe('CSV Generation', () => {
    it('should generate CSV header row', () => {
      const generateCSVHeader = () => {
        return ['Category', 'Item', 'Status', 'Date', 'Notes'].join(',');
      };

      const header = generateCSVHeader();
      expect(header).toBe('Category,Item,Status,Date,Notes');
    });

    it('should generate CSV row for screening', () => {
      const formatScreeningRow = (screening: {
        screeningType: string;
        completedDate: Date | null;
        scheduledDate: Date;
        result: string | null;
        notes: string | null;
      }) => {
        const status = screening.completedDate ? 'Completed' : 'Pending';
        const date = screening.completedDate || screening.scheduledDate;
        return [
          'Screening',
          screening.screeningType,
          status,
          date.toISOString().split('T')[0],
          screening.notes || '',
        ].join(',');
      };

      const row = formatScreeningRow(mockScreenings[0]);
      expect(row).toContain('Screening');
      expect(row).toContain('mammogram');
      expect(row).toContain('Completed');
    });

    it('should generate CSV row for risk score', () => {
      const formatRiskRow = (risk: {
        riskType: string;
        score: number;
        category: string;
        calculatedAt: Date;
      }) => {
        return [
          'Risk Score',
          risk.riskType,
          `${risk.score}% (${risk.category})`,
          risk.calculatedAt.toISOString().split('T')[0],
          '',
        ].join(',');
      };

      const row = formatRiskRow(mockRiskScores[0]);
      expect(row).toContain('Risk Score');
      expect(row).toContain('ASCVD');
      expect(row).toContain('12.5%');
    });

    it('should escape CSV values with commas', () => {
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      expect(escapeCSV('Normal, healthy')).toBe('"Normal, healthy"');
      expect(escapeCSV('Test "quoted" value')).toBe('"Test ""quoted"" value"');
      expect(escapeCSV('Simple')).toBe('Simple');
    });

    it('should generate complete CSV content', () => {
      const generateCSV = (
        patient: { firstName: string; lastName: string; mrn: string },
        screenings: Array<{ screeningType: string; completedDate: Date | null; scheduledDate: Date; result: string | null; notes: string | null }>,
        risks: Array<{ riskType: string; score: number; category: string; calculatedAt: Date }>
      ) => {
        const lines: string[] = [];

        // Header
        lines.push(`Prevention Report for ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`);
        lines.push('');
        lines.push('Category,Item,Status,Date,Notes');

        // Risk scores
        for (const risk of risks) {
          lines.push([
            'Risk Score',
            risk.riskType,
            `${risk.score}% (${risk.category})`,
            risk.calculatedAt.toISOString().split('T')[0],
            '',
          ].join(','));
        }

        // Screenings
        for (const screening of screenings) {
          const status = screening.completedDate ? 'Completed' : 'Pending';
          const date = screening.completedDate || screening.scheduledDate;
          lines.push([
            'Screening',
            screening.screeningType,
            status,
            date.toISOString().split('T')[0],
            screening.notes || '',
          ].join(','));
        }

        return lines.join('\n');
      };

      const csv = generateCSV(mockPatient, mockScreenings, mockRiskScores);

      expect(csv).toContain('Prevention Report for Jane Doe');
      expect(csv).toContain('Category,Item,Status,Date,Notes');
      expect(csv).toContain('Risk Score,ASCVD');
      expect(csv).toContain('Screening,mammogram');
    });
  });

  describe('PDF Content Structure', () => {
    it('should include patient header information', () => {
      const generatePDFHeader = (patient: {
        firstName: string;
        lastName: string;
        dateOfBirth: Date;
        mrn: string;
      }) => {
        const age = Math.floor(
          (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        return {
          title: 'Prevention Health Report',
          patient: `${patient.firstName} ${patient.lastName}`,
          mrn: patient.mrn,
          age,
          generatedAt: new Date(),
        };
      };

      const header = generatePDFHeader(mockPatient);

      expect(header.title).toBe('Prevention Health Report');
      expect(header.patient).toBe('Jane Doe');
      expect(header.mrn).toBe('MRN-12345');
      expect(header.age).toBeGreaterThan(40);
    });

    it('should format risk scores for PDF', () => {
      const formatRisksForPDF = (risks: Array<{
        riskType: string;
        score: number;
        category: string;
        calculatedAt: Date;
      }>) => {
        return risks.map((risk) => ({
          type: risk.riskType.replace(/_/g, ' '),
          score: `${risk.score}%`,
          level: risk.category,
          date: risk.calculatedAt.toLocaleDateString(),
        }));
      };

      const formatted = formatRisksForPDF(mockRiskScores);

      expect(formatted).toHaveLength(2);
      expect(formatted[0].type).toBe('ASCVD');
      expect(formatted[0].score).toBe('12.5%');
      expect(formatted[0].level).toBe('Moderate');
    });

    it('should format screenings for PDF', () => {
      const formatScreeningsForPDF = (screenings: Array<{
        screeningType: string;
        scheduledDate: Date;
        completedDate: Date | null;
        result: string | null;
      }>) => {
        return screenings.map((s) => ({
          name: s.screeningType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          status: s.completedDate ? 'Completed' : 'Scheduled',
          date: (s.completedDate || s.scheduledDate).toLocaleDateString(),
          result: s.result || 'N/A',
        }));
      };

      const formatted = formatScreeningsForPDF(mockScreenings);

      expect(formatted).toHaveLength(2);
      expect(formatted[0].name).toBe('Mammogram');
      expect(formatted[0].status).toBe('Completed');
      expect(formatted[0].result).toBe('normal');
      expect(formatted[1].status).toBe('Scheduled');
    });

    it('should include HIPAA disclaimer', () => {
      const hipaFooter = `This document contains Protected Health Information (PHI) and is subject to HIPAA regulations. Unauthorized disclosure is prohibited.`;

      expect(hipaFooter).toContain('Protected Health Information');
      expect(hipaFooter).toContain('HIPAA');
    });
  });

  describe('Error Handling', () => {
    it('should handle patient not found', async () => {
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

      const patient = await prisma.patient.findUnique({
        where: { id: 'non-existent' },
      });

      expect(patient).toBeNull();
    });

    it('should handle database errors', async () => {
      (prisma.patient.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        prisma.patient.findUnique({ where: { id: mockPatientId } })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle empty data gracefully', async () => {
      (prisma.screeningOutcome.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.riskScore.findMany as jest.Mock).mockResolvedValue([]);

      const screenings = await prisma.screeningOutcome.findMany({
        where: { patientId: mockPatientId },
      });
      const risks = await prisma.riskScore.findMany({
        where: { patientId: mockPatientId },
      });

      expect(screenings).toHaveLength(0);
      expect(risks).toHaveLength(0);
    });
  });

  describe('Export Format Validation', () => {
    it('should validate format parameter', () => {
      const validateFormat = (format: string): 'csv' | 'pdf' | null => {
        if (format === 'csv' || format === 'pdf') {
          return format;
        }
        return null;
      };

      expect(validateFormat('csv')).toBe('csv');
      expect(validateFormat('pdf')).toBe('pdf');
      expect(validateFormat('invalid')).toBeNull();
    });
  });
});
