/**
 * CDSS Service Tests
 *
 * Tests for Clinical Decision Support System
 */

import { CDSSService } from '../cdss.service';
import { mockPatients, mockClinician } from '@/lib/__tests__/fixtures/cdss-test-data';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(), // Used by getPatientContext
      count: jest.fn(), // Used by checkOperationalOptimizations
    },
    manualReviewQueueItem: {
      create: jest.fn(),
    },
  },
}));

// Mock review queue service
jest.mock('../review-queue.service', () => ({
  reviewQueueService: {
    addToQueue: jest.fn(),
  },
}));

const { prisma } = require('@/lib/prisma');
const { reviewQueueService } = require('../review-queue.service');

// Helper to mock patient data for CDSS tests
function mockPatientData(patient: any) {
  const patientData = {
    ...patient,
    assignedClinicianId: mockClinician.id,
    vitalSigns: patient.vitals || [],
    medications: patient.medications || [],
    labResults: patient.labResults || [],
    allergies: patient.allergies || [],
    diagnoses: patient.diagnoses || [],
    appointments: patient.appointments || (patient.lastVisit ? [{ endTime: patient.lastVisit }] : []),
  };

  prisma.patient.findMany.mockResolvedValue([patientData]);
  prisma.patient.findUnique.mockResolvedValue(patientData);

  return patientData;
}

describe('CDSSService', () => {
  let cdssService: CDSSService;

  beforeEach(() => {
    cdssService = new CDSSService();
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(mockClinician);
    prisma.patient.count.mockResolvedValue(0); // Default: no patients for operational insights
  });

  describe('generateInsights', () => {
    it('should return empty array when clinician has no patients', async () => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
      prisma.patient.findMany.mockResolvedValue([]);

      const insights = await cdssService.generateInsights(mockClinician.id);

      expect(insights).toEqual([]);
    });

    it('should generate insights for patients with clinical issues', async () => {
      mockPatientData(mockPatients.withDrugInteraction);

      const insights = await cdssService.generateInsights(mockClinician.id);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('id');
      expect(insights[0]).toHaveProperty('type');
      expect(insights[0]).toHaveProperty('priority');
      expect(insights[0]).toHaveProperty('title');
      expect(insights[0]).toHaveProperty('description');
    });

    it('should sort insights by priority (critical > high > medium > low)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
      prisma.patient.findMany.mockResolvedValue([
        {
          ...mockPatients.withSepsisRisk,
          assignedClinicianId: mockClinician.id,
          vitalSigns: mockPatients.withSepsisRisk.vitals,
        },
        {
          ...mockPatients.withDrugInteraction,
          assignedClinicianId: mockClinician.id,
          vitalSigns: mockPatients.withDrugInteraction.vitals,
        },
      ]);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const priorities = insights.map((i) => i.priority);
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      let lastPriorityIndex = -1;

      for (const priority of priorities) {
        const currentIndex = priorityOrder.indexOf(priority);
        expect(currentIndex).toBeGreaterThanOrEqual(lastPriorityIndex);
        lastPriorityIndex = currentIndex;
      }
    });

    it('should flag critical insights for review', async () => {
      const patientData = {
        ...mockPatients.withCriticalLabs,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withCriticalLabs.vitals || [],
        medications: mockPatients.withCriticalLabs.medications || [],
        labResults: mockPatients.withCriticalLabs.labResults || [],
        allergies: mockPatients.withCriticalLabs.allergies || [],
        diagnoses: mockPatients.withCriticalLabs.diagnoses || [],
        appointments: [],
      };
      prisma.user.findUnique.mockResolvedValue(mockClinician);
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      await cdssService.generateInsights(mockClinician.id);

      expect(reviewQueueService.addToQueue).toHaveBeenCalled();
    });
  });

  describe('Drug Interactions', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should detect warfarin + aspirin interaction', async () => {
      const patientWithInteraction = {
        ...mockPatients.withDrugInteraction,
        medications: [
          { id: 'med-1', name: 'Warfarin', dose: '5mg', isActive: true },
          { id: 'med-2', name: 'Aspirin', dose: '81mg', isActive: true },
        ],
      };
      mockPatientData(patientWithInteraction);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const interaction = insights.find((i) => i.type === 'interaction_warning');
      expect(interaction).toBeDefined();
      expect(interaction?.title).toContain('Drug Interaction');
      expect(interaction?.description.toLowerCase()).toContain('warfarin');
      expect(interaction?.description.toLowerCase()).toContain('aspirin');
    });

    it('should detect warfarin + ibuprofen interaction', async () => {
      const patientWithIbuprofen = {
        ...mockPatients.withDrugInteraction,
        medications: [
          { id: 'med-1', name: 'Warfarin', dose: '5mg', isActive: true },
          { id: 'med-2', name: 'Ibuprofen', dose: '400mg', isActive: true },
        ],
      };mockPatientData(patientWithIbuprofen);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const interaction = insights.find((i) => i.type === 'interaction_warning');
      expect(interaction).toBeDefined();
      expect(interaction?.description.toLowerCase()).toContain('warfarin');
    });

    it('should not flag when drugs do not interact', async () => {
      const patientNoInteractions = {
        ...mockPatients.healthy,
        medications: [
          { id: 'med-1', name: 'Lisinopril', dose: '10mg', isActive: true },
          { id: 'med-2', name: 'Metformin', dose: '500mg', isActive: true },
        ],
      };mockPatientData(patientNoInteractions);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const interaction = insights.find(
        (i) => i.type === 'interaction_warning' && i.patientId === patientNoInteractions.id
      );
      expect(interaction).toBeUndefined();
    });

    it('should handle case-insensitive drug names', async () => {
      const patientUpperCase = {
        ...mockPatients.withDrugInteraction,
        medications: [
          { id: 'med-1', name: 'WARFARIN', dose: '5mg', isActive: true },
          { id: 'med-2', name: 'ASPIRIN', dose: '81mg', isActive: true },
        ],
      };mockPatientData(patientUpperCase);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const interaction = insights.find((i) => i.type === 'interaction_warning');
      expect(interaction).toBeDefined();
    });
  });

  describe('Sepsis Risk (qSOFA)', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should flag sepsis when qSOFA >= 2', async () => {
      const patientData = {
        ...mockPatients.withSepsisRisk,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withSepsisRisk.vitals,
        medications: mockPatients.withSepsisRisk.medications || [],
        labResults: mockPatients.withSepsisRisk.labResults || [],
        allergies: mockPatients.withSepsisRisk.allergies || [],
        diagnoses: mockPatients.withSepsisRisk.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const sepsis = insights.find((i) => i.title?.includes('Sepsis'));
      expect(sepsis).toBeDefined();
      expect(sepsis?.priority).toBe('critical');
    });

    it('should not flag when vitals are normal', async () => {
      const patientData = {
        ...mockPatients.healthy,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.healthy.vitals,
        medications: mockPatients.healthy.medications || [],
        labResults: mockPatients.healthy.labResults || [],
        allergies: mockPatients.healthy.allergies || [],
        diagnoses: mockPatients.healthy.diagnoses || [],
        appointments: mockPatients.healthy.lastVisit ? [{ endTime: mockPatients.healthy.lastVisit }] : [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const sepsis = insights.find((i) => i.title?.includes('Sepsis') && i.patientId === mockPatients.healthy.id);
      expect(sepsis).toBeUndefined();
    });

    it('should handle missing vitals gracefully', async () => {
      const patientNoVitals = {
        ...mockPatients.withSepsisRisk,
        vitals: [],
      };mockPatientData(patientNoVitals);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const sepsis = insights.find((i) => i.patientId === patientNoVitals.id && i.title?.includes('Sepsis'));
      expect(sepsis).toBeUndefined();
    });

    it('should handle incomplete vital signs data', async () => {
      const patientIncompleteVitals = {
        ...mockPatients.withSepsisRisk,
        vitals: [
          {
            temperature: 38.5,
            // Missing other vitals
            createdAt: new Date(),
          },
        ],
      };mockPatientData(patientIncompleteVitals);

      // Should not throw error
      await expect(cdssService.generateInsights(mockClinician.id)).resolves.toBeDefined();
    });
  });

  describe('Cardiac Risk', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should flag hypertension when BP >= 140/90', async () => {
      const patientData = {
        ...mockPatients.withHypertension,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withHypertension.vitals,
        medications: mockPatients.withHypertension.medications || [],
        labResults: mockPatients.withHypertension.labResults || [],
        allergies: mockPatients.withHypertension.allergies || [],
        diagnoses: mockPatients.withHypertension.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const hypertension = insights.find((i) => i.title?.toLowerCase().includes('hypertension'));
      expect(hypertension).toBeDefined();
      expect(hypertension?.priority).toBe('high');
    });

    it('should not flag if already on hypertension medication', async () => {
      const patientOnHTNMeds = {
        ...mockPatients.withHypertension,
        medications: [
          { id: 'med-1', name: 'Lisinopril', dose: '10mg', isActive: true },
        ],
      };mockPatientData(patientOnHTNMeds);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const hypertension = insights.find(
        (i) => i.patientId === patientOnHTNMeds.id && i.title?.toLowerCase().includes('hypertension')
      );
      expect(hypertension).toBeUndefined();
    });

    it('should handle missing BP readings', async () => {
      const patientNoBP = {
        ...mockPatients.withHypertension,
        vitals: [
          {
            temperature: 36.8,
            heartRate: 75,
            // Missing BP
            respiratoryRate: 16,
            oxygenSaturation: 98,
            createdAt: new Date(),
          },
        ],
      };mockPatientData(patientNoBP);

      // Should not throw error
      await expect(cdssService.generateInsights(mockClinician.id)).resolves.toBeDefined();
    });
  });

  describe('Abnormal Labs', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    function setupCriticalLabsMock() {
      const patientData = {
        ...mockPatients.withCriticalLabs,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withCriticalLabs.vitals || [],
        medications: mockPatients.withCriticalLabs.medications || [],
        labResults: mockPatients.withCriticalLabs.labResults || [],
        allergies: mockPatients.withCriticalLabs.allergies || [],
        diagnoses: mockPatients.withCriticalLabs.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);
      return patientData;
    }

    it('should flag critical lab results', async () => {
      setupCriticalLabsMock();

      const insights = await cdssService.generateInsights(mockClinician.id);

      const criticalLab = insights.find((i) => i.title?.includes('Critical Lab'));
      expect(criticalLab).toBeDefined();
      expect(criticalLab?.priority).toBe('critical');
    });

    it('should use isCritical field correctly', async () => {
      setupCriticalLabsMock();

      const insights = await cdssService.generateInsights(mockClinician.id);

      const criticalLab = insights.find((i) => i.title?.includes('Critical Lab'));
      expect(criticalLab?.description).toContain('Potassium');
      expect(criticalLab?.description).toContain('6.5');
    });

    it('should include test details in insight', async () => {
      setupCriticalLabsMock();

      const insights = await cdssService.generateInsights(mockClinician.id);

      const criticalLab = insights.find((i) => i.title?.includes('Critical Lab'));
      expect(criticalLab?.description).toContain('mEq/L');
      expect(criticalLab?.description).toContain('3.5-5.0');
    });
  });

  describe('Preventive Care', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should flag overdue wellness visit (>365 days)', async () => {
      const patientData = {
        ...mockPatients.withOverduePreventiveCare,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withOverduePreventiveCare.vitals || [],
        medications: mockPatients.withOverduePreventiveCare.medications || [],
        labResults: mockPatients.withOverduePreventiveCare.labResults || [],
        allergies: mockPatients.withOverduePreventiveCare.allergies || [],
        diagnoses: mockPatients.withOverduePreventiveCare.diagnoses || [],
        appointments: [
          {
            endTime: mockPatients.withOverduePreventiveCare.lastVisit,
          },
        ],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      // Check for wellness visit insight (title may include "Wellness" or "Preventive")
      const preventive = insights.find(
        (i) => i.title?.includes('Wellness') || i.title?.includes('Preventive')
      );
      expect(preventive).toBeDefined();
    });

    it('should not flag recent wellness visit', async () => {
      const patientRecentVisit = {
        ...mockPatients.healthy,
      };

      const patientData = {
        ...patientRecentVisit,
        assignedClinicianId: mockClinician.id,
        vitalSigns: patientRecentVisit.vitals,
        medications: patientRecentVisit.medications || [],
        labResults: patientRecentVisit.labResults || [],
        allergies: patientRecentVisit.allergies || [],
        diagnoses: patientRecentVisit.diagnoses || [],
        appointments: [
          {
            endTime: patientRecentVisit.lastVisit,
          },
        ],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const preventive = insights.find(
        (i) => i.patientId === patientRecentVisit.id && (i.title?.includes('Wellness') || i.title?.includes('Preventive Care'))
      );
      expect(preventive).toBeUndefined();
    });

    it('should handle never-visited patients', async () => {
      const patientNeverVisited = {
        ...mockPatients.healthy,
        lastVisit: undefined,
      };

      const patientData = {
        ...patientNeverVisited,
        assignedClinicianId: mockClinician.id,
        vitalSigns: patientNeverVisited.vitals,
        medications: patientNeverVisited.medications || [],
        labResults: patientNeverVisited.labResults || [],
        allergies: patientNeverVisited.allergies || [],
        diagnoses: patientNeverVisited.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      // Should not throw error
      await expect(cdssService.generateInsights(mockClinician.id)).resolves.toBeDefined();
    });
  });

  describe('Polypharmacy', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should flag when patient has >= 10 medications', async () => {
      const patientData = {
        ...mockPatients.withPolypharmacy,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withPolypharmacy.vitals || [],
        medications: mockPatients.withPolypharmacy.medications || [],
        labResults: mockPatients.withPolypharmacy.labResults || [],
        allergies: mockPatients.withPolypharmacy.allergies || [],
        diagnoses: mockPatients.withPolypharmacy.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const polypharmacy = insights.find((i) => i.title?.includes('Polypharmacy'));
      expect(polypharmacy).toBeDefined();
      expect(polypharmacy?.priority).toBe('medium');
    });

    it('should not flag with < 10 medications', async () => {
      const patientData = {
        ...mockPatients.withDrugInteraction,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withDrugInteraction.vitals || [],
        medications: mockPatients.withDrugInteraction.medications || [],
        labResults: mockPatients.withDrugInteraction.labResults || [],
        allergies: mockPatients.withDrugInteraction.allergies || [],
        diagnoses: mockPatients.withDrugInteraction.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const polypharmacy = insights.find(
        (i) => i.patientId === mockPatients.withDrugInteraction.id && i.title?.includes('Polypharmacy')
      );
      expect(polypharmacy).toBeUndefined();
    });
  });

  describe('Renal Dosing', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should flag nephrotoxic drugs without recent creatinine', async () => {
      const patientData = {
        ...mockPatients.withRenalDosingNeed,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withRenalDosingNeed.vitals || [],
        medications: mockPatients.withRenalDosingNeed.medications || [],
        labResults: mockPatients.withRenalDosingNeed.labResults || [],
        allergies: mockPatients.withRenalDosingNeed.allergies || [],
        diagnoses: mockPatients.withRenalDosingNeed.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const renal = insights.find((i) => i.title?.toLowerCase().includes('renal'));
      expect(renal).toBeDefined();
    });

    it('should not flag if creatinine within 180 days', async () => {
      const patientRecentCreatinine = {
        ...mockPatients.withRenalDosingNeed,
        labResults: [
          {
            testName: 'Creatinine',
            value: '1.0',
            unit: 'mg/dL',
            referenceRange: '0.6-1.2',
            isAbnormal: false,
            isCritical: false,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          },
        ],
      };mockPatientData(patientRecentCreatinine);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const renal = insights.find(
        (i) => i.patientId === patientRecentCreatinine.id && i.title?.toLowerCase().includes('renal')
      );
      expect(renal).toBeUndefined();
    });
  });

  describe('Anticoagulation Monitoring', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should flag warfarin without INR in 30 days', async () => {
      const patientData = {
        ...mockPatients.withAnticoagulationNeedMonitoring,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withAnticoagulationNeedMonitoring.vitals || [],
        medications: mockPatients.withAnticoagulationNeedMonitoring.medications || [],
        labResults: mockPatients.withAnticoagulationNeedMonitoring.labResults || [],
        allergies: mockPatients.withAnticoagulationNeedMonitoring.allergies || [],
        diagnoses: mockPatients.withAnticoagulationNeedMonitoring.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const anticoag = insights.find((i) => i.title?.includes('INR'));
      expect(anticoag).toBeDefined();
    });

    it('should flag INR out of therapeutic range (< 2.0)', async () => {
      const patientData = {
        ...mockPatients.withINRTooLow,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withINRTooLow.vitals || [],
        medications: mockPatients.withINRTooLow.medications || [],
        labResults: mockPatients.withINRTooLow.labResults || [],
        allergies: mockPatients.withINRTooLow.allergies || [],
        diagnoses: mockPatients.withINRTooLow.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const anticoag = insights.find((i) => i.title?.includes('INR'));
      expect(anticoag).toBeDefined();
      expect(anticoag?.description).toContain('1.5');
    });

    it('should flag INR out of therapeutic range (> 3.5)', async () => {
      const patientData = {
        ...mockPatients.withINRTooHigh,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withINRTooHigh.vitals || [],
        medications: mockPatients.withINRTooHigh.medications || [],
        labResults: mockPatients.withINRTooHigh.labResults || [],
        allergies: mockPatients.withINRTooHigh.allergies || [],
        diagnoses: mockPatients.withINRTooHigh.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const anticoag = insights.find((i) => i.title?.includes('INR'));
      expect(anticoag).toBeDefined();
      expect(anticoag?.priority).toBe('critical');
    });

    it('should not flag if INR therapeutic and recent', async () => {
      const patientGoodINR = {
        ...mockPatients.withAnticoagulationNeedMonitoring,
        labResults: [
          {
            testName: 'INR',
            value: '2.5',
            unit: '',
            referenceRange: '2.0-3.5',
            isAbnormal: false,
            isCritical: false,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          },
        ],
      };mockPatientData(patientGoodINR);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const anticoag = insights.find(
        (i) => i.patientId === patientGoodINR.id && i.title?.includes('INR')
      );
      expect(anticoag).toBeUndefined();
    });
  });

  describe('Duplicate Therapy', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockClinician);
    });

    it('should detect multiple statins', async () => {
      const patientData = {
        ...mockPatients.withDuplicateTherapy,
        assignedClinicianId: mockClinician.id,
        vitalSigns: mockPatients.withDuplicateTherapy.vitals || [],
        medications: mockPatients.withDuplicateTherapy.medications || [],
        labResults: mockPatients.withDuplicateTherapy.labResults || [],
        allergies: mockPatients.withDuplicateTherapy.allergies || [],
        diagnoses: mockPatients.withDuplicateTherapy.diagnoses || [],
        appointments: [],
      };
      prisma.patient.findMany.mockResolvedValue([patientData]);
      prisma.patient.findUnique.mockResolvedValue(patientData);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const duplicate = insights.find((i) => i.title?.includes('Duplicate'));
      expect(duplicate).toBeDefined();
      expect(duplicate?.description.toLowerCase()).toContain('statin');
    });

    it('should detect multiple PPIs', async () => {
      const patientDuplicatePPIs = {
        ...mockPatients.withDuplicateTherapy,
        medications: [
          { id: 'med-1', name: 'Omeprazole', dose: '20mg', isActive: true },
          { id: 'med-2', name: 'Pantoprazole', dose: '40mg', isActive: true },
        ],
      };
      mockPatientData(patientDuplicatePPIs);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const duplicate = insights.find((i) => i.title?.includes('Duplicate'));
      expect(duplicate).toBeDefined();
    });

    it('should not flag single medications', async () => {
      const patientSingleMeds = {
        ...mockPatients.healthy,
        medications: [
          { id: 'med-1', name: 'Atorvastatin', dose: '20mg', isActive: true },
        ],
      };
      mockPatientData(patientSingleMeds);

      const insights = await cdssService.generateInsights(mockClinician.id);

      const duplicate = insights.find(
        (i) => i.patientId === patientSingleMeds.id && i.title?.includes('Duplicate')
      );
      expect(duplicate).toBeUndefined();
    });
  });
});
