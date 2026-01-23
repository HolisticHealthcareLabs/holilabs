/**
 * Prescription Workflow Tests (Integration)
 *
 * Tests the complete prescription workflow including:
 * - Prescription creation with medications
 * - Electronic signature (PIN and signature pad)
 * - Sending to pharmacy
 * - Status transitions (PENDING → SIGNED → SENT)
 * - Tenant isolation (HIPAA compliance)
 * - Blockchain hash generation
 * - Audit logging
 *
 * Coverage Target: 80%+ (critical medical prescriptions)
 * Compliance: HIPAA tenant isolation, 21 CFR Part 11 e-signatures
 *
 * REQUIRES: Database connection and ENCRYPTION_KEY environment variable
 * Skip in unit test mode - run in CI with proper environment
 */

// Skip integration tests if required environment is not available
const isIntegrationTest = process.env.ENCRYPTION_KEY && process.env.DATABASE_URL;
const describeIntegration = isIntegrationTest ? describe : describe.skip;

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Only import database-dependent modules if running integration tests
let CREATE_PRESCRIPTION: any, LIST_PRESCRIPTIONS: any, GET_PRESCRIPTION: any;
let UPDATE_PRESCRIPTION: any, DELETE_PRESCRIPTION: any, SIGN_PRESCRIPTION: any;
let SEND_TO_PHARMACY: any, prisma: any;

if (isIntegrationTest) {
  const routeModule = require('../route');
  CREATE_PRESCRIPTION = routeModule.POST;
  LIST_PRESCRIPTIONS = routeModule.GET;
  const detailModule = require('../[id]/route');
  GET_PRESCRIPTION = detailModule.GET;
  UPDATE_PRESCRIPTION = detailModule.PATCH;
  DELETE_PRESCRIPTION = detailModule.DELETE;
  SIGN_PRESCRIPTION = require('../[id]/sign/route').POST;
  SEND_TO_PHARMACY = require('../[id]/send-to-pharmacy/route').POST;
  prisma = require('@/lib/prisma').prisma;
}

// Test data
const TEST_CLINICIAN = {
  id: 'test-clinician-prescription-1',
  email: 'clinician@test.com',
  role: 'CLINICIAN' as const,
  firstName: 'Dr. John',
  lastName: 'Smith',
  licenseNumber: 'LIC-12345',
};

const TEST_PATIENT = {
  id: 'test-patient-prescription-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'patient@test.com',
  mrn: 'MRN-PRES-001',
  dateOfBirth: new Date('1985-05-15'),
};

const TEST_MEDICATIONS = [
  {
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    dose: '500mg',
    frequency: 'Three times daily',
    route: 'oral',
    instructions: 'Take with food',
  },
  {
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    dose: '200mg',
    frequency: 'As needed',
    route: 'oral',
    instructions: 'For pain relief',
  },
];

// Mock context with authenticated clinician
const mockContext = {
  user: TEST_CLINICIAN,
  params: {},
};

// Helper to create mock request
function createMockRequest(options: {
  method: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/prescriptions';
  const headers = new Headers(options.headers || {});

  if (options.body) {
    headers.set('content-type', 'application/json');
  }

  return new NextRequest(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describeIntegration('Prescription API', () => {
  let testPatient: any;
  let testClinician: any;
  let createdPrescriptionIds: string[] = [];

  beforeAll(async () => {
    // Create test clinician
    testClinician = await prisma.user.create({
      data: {
        ...TEST_CLINICIAN,
        password: 'hashed_password',
      },
    });

    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        ...TEST_PATIENT,
        assignedClinicianId: testClinician.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.medication.deleteMany({
      where: { patientId: testPatient.id },
    });

    await prisma.prescription.deleteMany({
      where: {
        id: { in: createdPrescriptionIds },
      },
    });

    await prisma.patient.deleteMany({
      where: { id: testPatient.id },
    });

    await prisma.user.deleteMany({
      where: { id: testClinician.id },
    });

    await prisma.auditLog.deleteMany({
      where: {
        userId: testClinician.id,
      },
    });

    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/prescriptions - Create Prescription', () => {
    it('should create prescription successfully with medications', async () => {
      const prescriptionData = {
        patientId: testPatient.id,
        medications: TEST_MEDICATIONS,
        instructions: 'Take medications as prescribed',
        diagnosis: 'Upper respiratory infection',
        signatureMethod: 'pin',
        signatureData: '1234',
      };

      const request = createMockRequest({
        method: 'POST',
        body: prescriptionData,
      });

      const response = await CREATE_PRESCRIPTION(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('prescriptionHash');
      expect(data.data.status).toBe('SIGNED');
      expect(data.data.patientId).toBe(testPatient.id);
      expect(data.data.clinicianId).toBe(testClinician.id);

      createdPrescriptionIds.push(data.data.id);

      // Verify medications were created
      const medications = await prisma.medication.findMany({
        where: { prescriptionHash: data.data.prescriptionHash },
      });

      expect(medications).toHaveLength(2);
    });

    it('should generate unique prescription hash', async () => {
      const prescriptionData = {
        patientId: testPatient.id,
        medications: [TEST_MEDICATIONS[0]],
        signatureMethod: 'pin',
        signatureData: '5678',
      };

      const request1 = createMockRequest({
        method: 'POST',
        body: prescriptionData,
      });

      const response1 = await CREATE_PRESCRIPTION(request1, mockContext);
      const data1 = await response1.json();

      const request2 = createMockRequest({
        method: 'POST',
        body: { ...prescriptionData, medications: [TEST_MEDICATIONS[1]] },
      });

      const response2 = await CREATE_PRESCRIPTION(request2, mockContext);
      const data2 = await response2.json();

      expect(data1.data.prescriptionHash).not.toBe(data2.data.prescriptionHash);

      createdPrescriptionIds.push(data1.data.id, data2.data.id);
    });

    it('should enforce tenant isolation - reject prescription for unassigned patient', async () => {
      // Create patient not assigned to this clinician
      const otherPatient = await prisma.patient.create({
        data: {
          firstName: 'Other',
          lastName: 'Patient',
          email: 'other@test.com',
          mrn: 'MRN-OTHER-001',
          dateOfBirth: new Date('1990-01-01'),
          assignedClinicianId: 'different-clinician-id',
        },
      });

      const prescriptionData = {
        patientId: otherPatient.id,
        medications: [TEST_MEDICATIONS[0]],
        signatureMethod: 'pin',
        signatureData: '1234',
      };

      const request = createMockRequest({
        method: 'POST',
        body: prescriptionData,
      });

      const response = await CREATE_PRESCRIPTION(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');

      await prisma.patient.delete({ where: { id: otherPatient.id } });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        patientId: testPatient.id,
        // Missing medications, signatureMethod, signatureData
      };

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
      });

      const response = await CREATE_PRESCRIPTION(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required field');
    });

    it('should return 404 for non-existent patient', async () => {
      const prescriptionData = {
        patientId: 'non-existent-patient-id',
        medications: [TEST_MEDICATIONS[0]],
        signatureMethod: 'pin',
        signatureData: '1234',
      };

      const request = createMockRequest({
        method: 'POST',
        body: prescriptionData,
      });

      const response = await CREATE_PRESCRIPTION(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Patient not found');
    });

    it('should create audit log on prescription creation', async () => {
      const prescriptionData = {
        patientId: testPatient.id,
        medications: [TEST_MEDICATIONS[0]],
        signatureMethod: 'signature_pad',
        signatureData: 'base64_signature_data',
      };

      const request = createMockRequest({
        method: 'POST',
        body: prescriptionData,
      });

      const response = await CREATE_PRESCRIPTION(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      createdPrescriptionIds.push(data.data.id);

      // Verify audit log created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: data.data.id,
          resource: 'Prescription',
          action: 'CREATE',
          userId: testClinician.id,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.success).toBe(true);
      expect(auditLog?.details).toHaveProperty('prescriptionHash');
      expect(auditLog?.details).toHaveProperty('medicationCount');
    });

    it('should include patient and clinician details in response', async () => {
      const prescriptionData = {
        patientId: testPatient.id,
        medications: [TEST_MEDICATIONS[0]],
        signatureMethod: 'pin',
        signatureData: '9999',
      };

      const request = createMockRequest({
        method: 'POST',
        body: prescriptionData,
      });

      const response = await CREATE_PRESCRIPTION(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.patient).toBeDefined();
      expect(data.data.patient.firstName).toBe(testPatient.firstName);
      expect(data.data.clinician).toBeDefined();
      expect(data.data.clinician.licenseNumber).toBe(testClinician.licenseNumber);

      createdPrescriptionIds.push(data.data.id);
    });
  });

  describe('GET /api/prescriptions - List Prescriptions', () => {
    let testPrescription: any;

    beforeAll(async () => {
      testPrescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'hashed_pin',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(testPrescription.id);
    });

    it('should list prescriptions for a specific patient', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/prescriptions?patientId=${testPatient.id}`,
      });

      const response = await LIST_PRESCRIPTIONS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      const found = data.data.find((p: any) => p.id === testPrescription.id);
      expect(found).toBeDefined();
    });

    it('should list all prescriptions for clinician when no patientId provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/prescriptions',
      });

      const response = await LIST_PRESCRIPTIONS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.every((p: any) => p.clinicianId === testClinician.id)).toBe(true);
    });

    it('should filter prescriptions by status', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/prescriptions?patientId=${testPatient.id}&status=SIGNED`,
      });

      const response = await LIST_PRESCRIPTIONS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((p: any) => p.status === 'SIGNED')).toBe(true);
    });

    it('should enforce tenant isolation when listing by patientId', async () => {
      const otherPatient = await prisma.patient.create({
        data: {
          firstName: 'Another',
          lastName: 'Patient',
          email: 'another@test.com',
          mrn: 'MRN-ANOTHER-001',
          dateOfBirth: new Date('1992-03-20'),
          assignedClinicianId: 'different-clinician',
        },
      });

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/prescriptions?patientId=${otherPatient.id}`,
      });

      const response = await LIST_PRESCRIPTIONS(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');

      await prisma.patient.delete({ where: { id: otherPatient.id } });
    });
  });

  describe('GET /api/prescriptions/[id] - Get Single Prescription', () => {
    let testPrescription: any;

    beforeAll(async () => {
      testPrescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[1]],
          status: 'SIGNED',
          signatureMethod: 'signature_pad',
          signatureData: 'signature_data',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(testPrescription.id);
    });

    it('should get prescription by ID', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/prescriptions/${testPrescription.id}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: testPrescription.id },
      };

      const response = await GET_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testPrescription.id);
      expect(data.data.patient).toBeDefined();
      expect(data.data.clinician).toBeDefined();
    });

    it('should return 404 for non-existent prescription', async () => {
      const fakeId = 'non-existent-prescription-id';

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/prescriptions/${fakeId}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: fakeId },
      };

      const response = await GET_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Prescription not found');
    });

    it('should enforce access control - only prescribing clinician or ADMIN', async () => {
      // Create prescription by different clinician
      const otherClinician = await prisma.user.create({
        data: {
          id: 'other-clinician-test',
          email: 'other@test.com',
          firstName: 'Other',
          lastName: 'Doctor',
          password: 'hashed',
          role: 'CLINICIAN',
        },
      });

      const otherPrescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: otherClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(otherPrescription.id);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/prescriptions/${otherPrescription.id}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: otherPrescription.id },
      };

      // Mock request has different user trying to access
      const modifiedRequest = { ...request, user: TEST_CLINICIAN };

      const response = await GET_PRESCRIPTION(modifiedRequest as any, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');

      await prisma.user.delete({ where: { id: otherClinician.id } });
    });
  });

  describe('POST /api/prescriptions/[id]/sign - Sign Prescription', () => {
    it('should sign prescription with PIN method', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: null,
          medications: [TEST_MEDICATIONS[0]],
          status: 'PENDING',
          signatureMethod: null,
          signatureData: null,
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/sign`,
        body: {
          signatureMethod: 'pin',
          signatureData: '1234',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SIGN_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('SIGNED');
      expect(data.data.signedAt).not.toBeNull();
      expect(data.data.prescriptionHash).not.toBeNull();

      // Verify PIN was hashed (not stored in plaintext)
      expect(data.data.signatureData).not.toBe('1234');
      expect(data.data.signatureData).toHaveLength(64); // SHA-256 hex
    });

    it('should sign prescription with signature pad method', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: null,
          medications: [TEST_MEDICATIONS[1]],
          status: 'PENDING',
          signatureMethod: null,
          signatureData: null,
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/sign`,
        body: {
          signatureMethod: 'signature_pad',
          signatureData: 'base64_encoded_signature_image_data',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SIGN_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('SIGNED');
      expect(data.data.signatureMethod).toBe('signature_pad');
    });

    it('should reject invalid PIN format', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: null,
          medications: [TEST_MEDICATIONS[0]],
          status: 'PENDING',
          signatureMethod: null,
          signatureData: null,
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/sign`,
        body: {
          signatureMethod: 'pin',
          signatureData: 'abc', // Invalid - not 4-6 digits
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SIGN_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid PIN format');
    });

    it('should reject signing already signed prescription', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'already_signed',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/sign`,
        body: {
          signatureMethod: 'pin',
          signatureData: '5678',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SIGN_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already signed');
    });

    it('should create audit log on signature', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: null,
          medications: [TEST_MEDICATIONS[0]],
          status: 'PENDING',
          signatureMethod: null,
          signatureData: null,
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/sign`,
        body: {
          signatureMethod: 'pin',
          signatureData: '7890',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      await SIGN_PRESCRIPTION(request, contextWithId);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: prescription.id,
          resource: 'Prescription',
          action: 'SIGN',
          userId: testClinician.id,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.details).toHaveProperty('signatureMethod');
      expect(auditLog?.details).toHaveProperty('prescriptionHash');
    });
  });

  describe('POST /api/prescriptions/[id]/send-to-pharmacy - Send to Pharmacy', () => {
    it('should send signed prescription to pharmacy', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
          sentToPharmacy: false,
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/send-to-pharmacy`,
        body: {
          pharmacyId: 'pharmacy-test-123',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SEND_TO_PHARMACY(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('SENT');
      expect(data.data.sentToPharmacy).toBe(true);
      expect(data.data.pharmacyId).toBe('pharmacy-test-123');
    });

    it('should reject sending unsigned prescription', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: null,
          medications: [TEST_MEDICATIONS[0]],
          status: 'PENDING',
          signatureMethod: null,
          signatureData: null,
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/send-to-pharmacy`,
        body: {
          pharmacyId: 'pharmacy-test-456',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SEND_TO_PHARMACY(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must be signed before sending');
    });

    it('should reject sending already sent prescription', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SENT',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
          sentToPharmacy: true,
          pharmacyId: 'existing-pharmacy',
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/send-to-pharmacy`,
        body: {
          pharmacyId: 'pharmacy-test-789',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SEND_TO_PHARMACY(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already been sent');
    });

    it('should require pharmacyId', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/send-to-pharmacy`,
        body: {}, // Missing pharmacyId
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await SEND_TO_PHARMACY(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('pharmacyId is required');
    });

    it('should create audit log when sending to pharmacy', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}/send-to-pharmacy`,
        body: {
          pharmacyId: 'audit-pharmacy-123',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      await SEND_TO_PHARMACY(request, contextWithId);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: prescription.id,
          resource: 'Prescription',
          userId: testClinician.id,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.details).toHaveProperty('action', 'SEND_TO_PHARMACY');
      expect(auditLog?.details).toHaveProperty('pharmacyId', 'audit-pharmacy-123');
    });
  });

  describe('PATCH /api/prescriptions/[id] - Update Prescription', () => {
    it('should update prescription status', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SENT',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}`,
        body: {
          status: 'DISPENSED',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await UPDATE_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('DISPENSED');
    });

    it('should update prescription instructions', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}`,
        body: {
          instructions: 'Updated instructions for patient',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await UPDATE_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.instructions).toBe('Updated instructions for patient');
    });
  });

  describe('DELETE /api/prescriptions/[id] - Delete Prescription', () => {
    it('should delete PENDING prescription', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: null,
          medications: [TEST_MEDICATIONS[0]],
          status: 'PENDING',
          signatureMethod: null,
          signatureData: null,
        },
      });

      const prescriptionId = prescription.id;

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/prescriptions/${prescriptionId}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescriptionId },
      };

      const response = await DELETE_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      expect(deleted).toBeNull();
    });

    it('should reject deleting SIGNED prescription', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          prescriptionHash: crypto.randomBytes(32).toString('hex'),
          medications: [TEST_MEDICATIONS[0]],
          status: 'SIGNED',
          signatureMethod: 'pin',
          signatureData: 'pin_hash',
          signedAt: new Date(),
        },
      });

      createdPrescriptionIds.push(prescription.id);

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/prescriptions/${prescription.id}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: prescription.id },
      };

      const response = await DELETE_PRESCRIPTION(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete prescription');
    });
  });

  describe('Prescription Workflow Integration', () => {
    it('should complete full workflow: create → sign → send', async () => {
      // Step 1: Create prescription
      const createData = {
        patientId: testPatient.id,
        medications: [TEST_MEDICATIONS[0]],
        signatureMethod: 'pin',
        signatureData: '4567',
      };

      const createRequest = createMockRequest({
        method: 'POST',
        body: createData,
      });

      const createResponse = await CREATE_PRESCRIPTION(createRequest, mockContext);
      const createResult = await createResponse.json();

      expect(createResponse.status).toBe(201);
      const prescriptionId = createResult.data.id;
      createdPrescriptionIds.push(prescriptionId);

      // Step 2: Verify signed (created as SIGNED)
      expect(createResult.data.status).toBe('SIGNED');

      // Step 3: Send to pharmacy
      const sendRequest = createMockRequest({
        method: 'POST',
        url: `http://localhost:3000/api/prescriptions/${prescriptionId}/send-to-pharmacy`,
        body: {
          pharmacyId: 'workflow-pharmacy-123',
        },
      });

      const sendContext = {
        ...mockContext,
        params: { id: prescriptionId },
      };

      const sendResponse = await SEND_TO_PHARMACY(sendRequest, sendContext);
      const sendResult = await sendResponse.json();

      expect(sendResponse.status).toBe(200);
      expect(sendResult.data.status).toBe('SENT');
      expect(sendResult.data.sentToPharmacy).toBe(true);
    });
  });

  describe('Blockchain Hash Verification', () => {
    it('should generate consistent hash for same prescription data', () => {
      const data1 = {
        patientId: 'test-patient',
        clinicianId: 'test-clinician',
        medications: [{ name: 'Aspirin', dose: '100mg' }],
        timestamp: '2026-01-07T00:00:00.000Z',
      };

      const data2 = { ...data1 };

      const hash1 = crypto.createHash('sha256').update(JSON.stringify(data1)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(JSON.stringify(data2)).digest('hex');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different prescription data', () => {
      const data1 = {
        patientId: 'test-patient',
        medications: [{ name: 'Aspirin' }],
      };

      const data2 = {
        patientId: 'test-patient',
        medications: [{ name: 'Ibuprofen' }],
      };

      const hash1 = crypto.createHash('sha256').update(JSON.stringify(data1)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(JSON.stringify(data2)).digest('hex');

      expect(hash1).not.toBe(hash2);
    });
  });
});
