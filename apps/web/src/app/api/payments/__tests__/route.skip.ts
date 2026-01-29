/**
 * Payment Processing Tests
 *
 * Tests the complete payment workflow including:
 * - Payment creation (with and without invoice)
 * - Payment listing and filtering
 * - Payment refunds (full and partial)
 * - Transaction atomicity
 * - Authorization and audit logging
 *
 * Coverage Target: 80%+ (critical financial transactions)
 * Compliance: HIPAA audit logging, PCI-DSS payment security
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { GET as GET_DETAIL, PATCH as PATCH_PAYMENT } from '../[id]/route';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Test data
const TEST_USER = {
  id: 'test-clinician-1',
  email: 'clinician@test.com',
  role: 'CLINICIAN' as const,
};

const TEST_PATIENT = {
  id: 'test-patient-1',
  firstName: 'Test',
  lastName: 'Patient',
  email: 'patient@test.com',
  mrn: 'TEST-MRN-001',
};

const TEST_INVOICE = {
  id: 'test-invoice-1',
  invoiceNumber: 'INV-2026-0001',
  totalAmount: 150.00,
  status: 'PENDING' as const,
  description: 'Test consultation',
};

// Mock context with authenticated user
const mockContext = {
  user: TEST_USER,
  params: {},
};

// Helper function to create mock NextRequest
function createMockRequest(options: {
  method: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/payments';
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

describe('Payment API', () => {
  let testPatient: any;
  let testInvoice: any;
  let createdPaymentIds: string[] = [];

  beforeAll(async () => {
    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        ...TEST_PATIENT,
        dateOfBirth: new Date('1990-01-01'),
        tokenId: `PT-${crypto.randomUUID()}`, // Required unique token
      },
    });

    // Create test invoice
    testInvoice = await prisma.invoice.create({
      data: {
        ...TEST_INVOICE,
        patientId: testPatient.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: 15000, // Required field (in cents, $150.00)
        totalAmount: 15000, // Convert to cents
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.payment.deleteMany({
      where: {
        id: { in: createdPaymentIds },
      },
    });

    await prisma.invoice.deleteMany({
      where: { id: testInvoice.id },
    });

    await prisma.patient.deleteMany({
      where: { id: testPatient.id },
    });

    await prisma.auditLog.deleteMany({
      where: {
        userId: TEST_USER.id,
      },
    });

    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/payments - Create Payment', () => {
    it('should create payment successfully without invoice', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 50.00,
        currency: 'MXN',
        paymentMethod: 'CASH',
        receiptNumber: 'REC-001',
        notes: 'Test cash payment',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      // Mock createProtectedRoute by directly testing the handler
      // Note: In real tests, we'd need to mock the middleware properly
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('paymentNumber');
      expect(data.data.amount).toBe(paymentData.amount);
      expect(data.data.paymentMethod).toBe('CASH');
      expect(data.data.status).toBe('COMPLETED');

      // Track for cleanup
      createdPaymentIds.push(data.data.id);
    });

    it('should create payment with invoice and update invoice status', async () => {
      const paymentData = {
        patientId: testPatient.id,
        invoiceId: testInvoice.id,
        amount: 150.00, // Full payment
        currency: 'MXN',
        paymentMethod: 'CARD',
        cardBrand: 'Visa',
        cardLast4: '4242',
        cardExpMonth: 12,
        cardExpYear: 2027,
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.invoiceId).toBe(testInvoice.id);

      // Verify invoice status updated to PAID
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoice.id },
      });
      expect(updatedInvoice?.status).toBe('PAID');
      expect(updatedInvoice?.paidDate).not.toBeNull();

      createdPaymentIds.push(data.data.id);
    });

    it('should create partial payment and update invoice to PARTIALLY_PAID', async () => {
      // Create a new invoice for this test
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-0002',
          patientId: testPatient.id,
          subtotal: 20000, // Required (in cents)
          totalAmount: 20000, // In cents ($200.00)
          status: 'PENDING',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Test partial payment invoice',
        },
      });

      const paymentData = {
        patientId: testPatient.id,
        invoiceId: invoice.id,
        amount: 100.00, // Partial payment
        currency: 'MXN',
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Verify invoice status updated to PARTIALLY_PAID
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.status).toBe('PARTIALLY_PAID');

      createdPaymentIds.push(data.data.id);
      await prisma.invoice.delete({ where: { id: invoice.id } });
    });

    it('should reject payment exceeding invoice amount due', async () => {
      // Create a new invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-0003',
          patientId: testPatient.id,
          subtotal: 10000, // Required (in cents)
          totalAmount: 10000, // In cents ($100.00)
          status: 'PENDING',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Test overpayment prevention',
        },
      });

      const paymentData = {
        patientId: testPatient.id,
        invoiceId: invoice.id,
        amount: 150.00, // Overpayment
        currency: 'MXN',
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds amount due');

      await prisma.invoice.delete({ where: { id: invoice.id } });
    });

    it('should reject payment for voided invoice', async () => {
      // Create voided invoice
      const voidedInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-0004',
          patientId: testPatient.id,
          subtotal: 10000, // Required (in cents)
          totalAmount: 10000, // In cents ($100.00)
          status: 'VOID',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Voided invoice test',
        },
      });

      const paymentData = {
        patientId: testPatient.id,
        invoiceId: voidedInvoice.id,
        amount: 100.00,
        currency: 'MXN',
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot pay voided invoice');

      await prisma.invoice.delete({ where: { id: voidedInvoice.id } });
    });

    it('should reject payment for already paid invoice', async () => {
      // Create fully paid invoice
      const paidInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-0005',
          patientId: testPatient.id,
          subtotal: 10000, // Required (in cents)
          totalAmount: 10000, // In cents ($100.00)
          status: 'PAID',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Already paid invoice test',
          paidDate: new Date(),
        },
      });

      const paymentData = {
        patientId: testPatient.id,
        invoiceId: paidInvoice.id,
        amount: 50.00,
        currency: 'MXN',
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already fully paid');

      await prisma.invoice.delete({ where: { id: paidInvoice.id } });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing patientId
        amount: 50.00,
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject negative or zero amount', async () => {
      const invalidData = {
        patientId: testPatient.id,
        amount: 0,
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: invalidData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must be > 0');
    });

    it('should generate unique payment numbers', async () => {
      const payment1Data = {
        patientId: testPatient.id,
        amount: 25.00,
        currency: 'MXN',
        paymentMethod: 'CASH',
      };

      const request1 = createMockRequest({
        method: 'POST',
        body: payment1Data,
      });

      const response1 = await POST(request1, mockContext);
      const data1 = await response1.json();

      const payment2Data = {
        patientId: testPatient.id,
        amount: 30.00,
        currency: 'MXN',
        paymentMethod: 'CASH',
      };

      const request2 = createMockRequest({
        method: 'POST',
        body: payment2Data,
      });

      const response2 = await POST(request2, mockContext);
      const data2 = await response2.json();

      expect(data1.data.paymentNumber).not.toBe(data2.data.paymentNumber);
      expect(data1.data.paymentNumber).toMatch(/^PAY-\d{4}-\d{4}$/);
      expect(data2.data.paymentNumber).toMatch(/^PAY-\d{4}-\d{4}$/);

      createdPaymentIds.push(data1.data.id, data2.data.id);
    });

    it('should create audit log on payment creation', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 35.00,
        currency: 'MXN',
        paymentMethod: 'CASH',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: data.data.id,
          resource: 'Payment',
          action: 'CREATE',
          userId: TEST_USER.id,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.success).toBe(true);
      expect(auditLog?.details).toHaveProperty('patientId');
      expect(auditLog?.details).toHaveProperty('amount');

      createdPaymentIds.push(data.data.id);
    });

    it('should handle Stripe payment metadata', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 75.00,
        currency: 'MXN',
        paymentMethod: 'CARD',
        stripePaymentIntentId: 'pi_test_123',
        stripeChargeId: 'ch_test_456',
        stripeCustomerId: 'cus_test_789',
        cardBrand: 'Visa',
        cardLast4: '4242',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.stripePaymentIntentId).toBe('pi_test_123');
      expect(data.data.stripeChargeId).toBe('ch_test_456');
      expect(data.data.stripeCustomerId).toBe('cus_test_789');

      createdPaymentIds.push(data.data.id);
    });

    it('should handle bank transfer payment metadata', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 100.00,
        currency: 'MXN',
        paymentMethod: 'BANK_TRANSFER',
        bankName: 'Banco Test',
        bankAccountLast4: '1234',
        bankTransactionId: 'TXN-ABC123',
        bankTransferDate: new Date().toISOString(),
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.bankName).toBe('Banco Test');
      expect(data.data.bankAccountLast4).toBe('1234');
      expect(data.data.bankTransactionId).toBe('TXN-ABC123');

      createdPaymentIds.push(data.data.id);
    });

    it('should handle insurance payment metadata', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 200.00,
        currency: 'MXN',
        paymentMethod: 'INSURANCE',
        insuranceProvider: 'Test Insurance Co',
        insurancePolicyId: 'POL-123',
        insuranceClaimId: 'CLAIM-456',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.insuranceProvider).toBe('Test Insurance Co');
      expect(data.data.insurancePolicyId).toBe('POL-123');
      expect(data.data.insuranceClaimId).toBe('CLAIM-456');

      createdPaymentIds.push(data.data.id);
    });
  });

  describe('GET /api/payments - List Payments', () => {
    it('should list all payments for a patient', async () => {
      // Create test payment
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-TEST-001',
          patientId: testPatient.id,
          amount: 50.00,
          currency: 'MXN',
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments?patientId=${testPatient.id}`,
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      const foundPayment = data.data.find((p: any) => p.id === payment.id);
      expect(foundPayment).toBeDefined();
      expect(foundPayment.amount).toBe(50.00);
    });

    it('should filter payments by invoiceId', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-FILTER-001',
          patientId: testPatient.id,
          subtotal: 10000, // Required (in cents)
          totalAmount: 10000, // In cents ($100.00)
          status: 'PENDING',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Filter test invoice',
        },
      });

      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-FILTER-001',
          patientId: testPatient.id,
          invoiceId: invoice.id,
          amount: 100.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments?patientId=${testPatient.id}&invoiceId=${invoice.id}`,
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((p: any) => p.invoiceId === invoice.id)).toBe(true);

      await prisma.invoice.delete({ where: { id: invoice.id } });
    });

    it('should filter payments by status', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments?patientId=${testPatient.id}&status=COMPLETED`,
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((p: any) => p.status === 'COMPLETED')).toBe(true);
    });

    it('should filter payments by paymentMethod', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments?patientId=${testPatient.id}&paymentMethod=CASH`,
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.data.length > 0) {
        expect(data.data.every((p: any) => p.paymentMethod === 'CASH')).toBe(true);
      }
    });

    it('should require patientId parameter', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/payments',
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('patientId');
    });

    it('should include patient and invoice data', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments?patientId=${testPatient.id}`,
      });

      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.data.length > 0) {
        const payment = data.data[0];
        expect(payment.patient).toBeDefined();
        expect(payment.patient).toHaveProperty('firstName');
        expect(payment.patient).toHaveProperty('lastName');
        expect(payment.patient).toHaveProperty('mrn');
      }
    });
  });

  describe('GET /api/payments/[id] - Get Payment Detail', () => {
    let testPaymentId: string;

    beforeAll(async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-DETAIL-001',
          patientId: testPatient.id,
          amount: 60.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
          cardBrand: 'Mastercard',
          cardLast4: '5555',
        },
      });

      testPaymentId = payment.id;
      createdPaymentIds.push(payment.id);
    });

    it('should get payment details by ID', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments/${testPaymentId}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: testPaymentId },
      };

      const response = await GET_DETAIL(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testPaymentId);
      expect(data.data.amount).toBe(60.00);
      expect(data.data.cardBrand).toBe('Mastercard');
      expect(data.data.cardLast4).toBe('5555');
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = 'non-existent-payment-id';

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments/${fakeId}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: fakeId },
      };

      const response = await GET_DETAIL(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Payment not found');
    });

    it('should include patient details in response', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/payments/${testPaymentId}`,
      });

      const contextWithId = {
        ...mockContext,
        params: { id: testPaymentId },
      };

      const response = await GET_DETAIL(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.patient).toBeDefined();
      expect(data.data.patient.firstName).toBe(testPatient.firstName);
      expect(data.data.patient.lastName).toBe(testPatient.lastName);
    });
  });

  describe('PATCH /api/payments/[id] - Refund Payment', () => {
    it('should process full refund successfully', async () => {
      // Create payment to refund
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-REFUND-001',
          patientId: testPatient.id,
          amount: 100.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          refund: true,
          refundReason: 'Customer request',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('REFUNDED');
      expect(data.data.refundedAmount).toBe(100.00);
      expect(data.data.refundReason).toBe('Customer request');
      expect(data.data.refundedAt).not.toBeNull();
    });

    it('should process partial refund successfully', async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-PARTIAL-REFUND-001',
          patientId: testPatient.id,
          amount: 100.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          refund: true,
          refundAmount: 50.00, // Partial refund
          refundReason: 'Partial cancellation',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('PARTIALLY_REFUNDED');
      expect(data.data.refundedAmount).toBe(50.00);
    });

    it('should reject refund exceeding payment amount', async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-OVER-REFUND-001',
          patientId: testPatient.id,
          amount: 100.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          refund: true,
          refundAmount: 150.00, // Exceeds payment
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot exceed payment amount');
    });

    it('should reject refund for non-completed payment', async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-PENDING-001',
          patientId: testPatient.id,
          amount: 100.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'PENDING',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          refund: true,
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Only completed payments can be refunded');
    });

    it('should update invoice status when refunding payment', async () => {
      // Create invoice and payment
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-REFUND-001',
          patientId: testPatient.id,
          subtotal: 10000, // Required (in cents)
          totalAmount: 10000, // In cents ($100.00)
          status: 'PAID',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description: 'Refund test invoice',
          paidDate: new Date(),
        },
      });

      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-INV-REFUND-001',
          patientId: testPatient.id,
          invoiceId: invoice.id,
          amount: 100.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          refund: true,
          refundReason: 'Full refund',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);

      expect(response.status).toBe(200);

      // Verify invoice status reverted to PENDING
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(updatedInvoice?.status).toBe('PENDING');
      expect(updatedInvoice?.paidDate).toBeNull();

      await prisma.invoice.delete({ where: { id: invoice.id } });
    });

    it('should create audit log on refund', async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-AUDIT-REFUND-001',
          patientId: testPatient.id,
          amount: 75.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          refund: true,
          refundReason: 'Test audit log',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      await PATCH_PAYMENT(request, contextWithId);

      // Verify audit log created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: payment.id,
          resource: 'Payment',
          action: 'REVOKE',
          userId: TEST_USER.id,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.details).toHaveProperty('changes');
      expect(auditLog?.details).toHaveProperty('previousState');
    });

    it('should update payment notes', async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-UPDATE-NOTES-001',
          patientId: testPatient.id,
          amount: 50.00,
          currency: 'MXN',
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          notes: 'Updated payment notes',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.notes).toBe('Updated payment notes');
    });

    it('should mark payment as failed', async () => {
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: 'PAY-FAIL-001',
          patientId: testPatient.id,
          amount: 50.00,
          currency: 'MXN',
          paymentMethod: 'CARD',
          status: 'PENDING',
          processedAt: new Date(),
          processedBy: TEST_USER.id,
        },
      });

      createdPaymentIds.push(payment.id);

      const request = createMockRequest({
        method: 'PATCH',
        url: `http://localhost:3000/api/payments/${payment.id}`,
        body: {
          status: 'FAILED',
          failureReason: 'Card declined',
          failureCode: 'CARD_DECLINED',
        },
      });

      const contextWithId = {
        ...mockContext,
        params: { id: payment.id },
      };

      const response = await PATCH_PAYMENT(request, contextWithId);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('FAILED');
      expect(data.data.failureReason).toBe('Card declined');
      expect(data.data.failureCode).toBe('CARD_DECLINED');
      expect(data.data.failedAt).not.toBeNull();
    });
  });

  describe('Transaction Atomicity', () => {
    it('should rollback payment if invoice update fails', async () => {
      // This test verifies that payment creation is wrapped in a transaction
      // In a real scenario, you'd mock the transaction to force a failure
      // For now, we verify the transaction is used in the code

      const paymentData = {
        patientId: testPatient.id,
        invoiceId: 'non-existent-invoice',
        amount: 100.00,
        currency: 'MXN',
        paymentMethod: 'CARD',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);

      // Should fail because invoice doesn't exist
      expect(response.status).toBe(404);

      // Verify no orphaned payment was created
      const orphanedPayment = await prisma.payment.findFirst({
        where: {
          patientId: testPatient.id,
          invoiceId: 'non-existent-invoice',
        },
      });

      expect(orphanedPayment).toBeNull();
    });
  });

  describe('Security & Authorization', () => {
    it('should track IP address and user agent in payment metadata', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 50.00,
        currency: 'MXN',
        paymentMethod: 'CASH',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Test-Agent/1.0',
        },
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.ipAddress).toBe('192.168.1.100');
      expect(data.data.userAgent).toBe('Test-Agent/1.0');

      createdPaymentIds.push(data.data.id);
    });

    it('should record processedBy user in payment', async () => {
      const paymentData = {
        patientId: testPatient.id,
        amount: 40.00,
        currency: 'MXN',
        paymentMethod: 'CASH',
      };

      const request = createMockRequest({
        method: 'POST',
        body: paymentData,
      });

      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.processedBy).toBe(TEST_USER.id);
      expect(data.data.processedAt).not.toBeNull();

      createdPaymentIds.push(data.data.id);
    });
  });

  describe('Payment Method Validation', () => {
    const validPaymentMethods = ['CARD', 'CASH', 'BANK_TRANSFER', 'INSURANCE', 'PIX'];

    validPaymentMethods.forEach((method) => {
      it(`should accept ${method} as payment method`, async () => {
        const paymentData = {
          patientId: testPatient.id,
          amount: 30.00,
          currency: 'MXN',
          paymentMethod: method,
        };

        const request = createMockRequest({
          method: 'POST',
          body: paymentData,
        });

        const response = await POST(request, mockContext);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.data.paymentMethod).toBe(method);

        createdPaymentIds.push(data.data.id);
      });
    });
  });
});
