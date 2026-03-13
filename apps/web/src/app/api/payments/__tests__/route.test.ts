import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    invoice: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err, opts) =>
    new (require('next/server').NextResponse)(JSON.stringify({ error: opts?.userMessage }), { status: 500 })
  ),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@clinic.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/payments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns payments for a given patient', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      { id: 'pay-1', amount: 500, status: 'COMPLETED', invoice: null, patient: null },
    ]);

    const req = new NextRequest('http://localhost:3000/api/payments?patientId=patient-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/payments');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/patientId/i);
  });

  it('filters payments by status', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/payments?patientId=patient-1&status=COMPLETED');
    await GET(req, mockContext);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) })
    );
  });
});

describe('POST /api/payments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a payment successfully', async () => {
    const mockPayment = { id: 'pay-new', paymentNumber: 'PAY-2025-0001', amount: 300 };
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/payments', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', amount: 300 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('returns 400 when amount is missing or zero', async () => {
    const req = new NextRequest('http://localhost:3000/api/payments', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', amount: 0 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/amount/i);
  });

  it('returns 404 when invoice is not found', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/payments', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', amount: 100, invoiceId: 'inv-999' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/invoice not found/i);
  });

  it('returns 400 when invoice is already paid', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      status: 'PAID',
      totalAmount: 500,
      payments: [],
    });

    const req = new NextRequest('http://localhost:3000/api/payments', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', amount: 100, invoiceId: 'inv-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already.*paid/i);
  });
});
