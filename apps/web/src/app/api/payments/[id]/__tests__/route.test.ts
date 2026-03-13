/**
 * Payment Detail API Route Tests
 *
 * GET   /api/payments/[id] - Get single payment
 * PATCH /api/payments/[id] - Update/refund payment
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: opts?.status ?? 500 }
    );
  }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
  params: { id: 'pay-1' },
};

describe('GET /api/payments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns payment with full details', async () => {
    const mockPayment = {
      id: 'pay-1',
      amount: 15000,
      status: 'COMPLETED',
      method: 'CREDIT_CARD',
      patient: { id: 'p-1', firstName: 'Maria', lastName: 'Lopez', mrn: 'MRN-001', email: 'maria@test.com', phone: '+5511999' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2025-0001', totalAmount: 15000, status: 'PAID' },
    };

    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(mockPayment);

    const request = new NextRequest('http://localhost:3000/api/payments/pay-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('pay-1');
    expect(data.data.amount).toBe(15000);
    expect(data.data.patient.firstName).toBe('Maria');
  });

  it('returns 404 when payment not found', async () => {
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/payments/nonexistent');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Payment not found');
  });
});

describe('PATCH /api/payments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates payment notes', async () => {
    const existing = { id: 'pay-1', amount: 15000, status: 'COMPLETED', invoice: { id: 'inv-1' } };
    const updated = { ...existing, notes: 'Patient requested receipt' };

    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(existing);
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        payment: { update: jest.fn().mockResolvedValue(updated) },
        invoice: { findUnique: jest.fn(), update: jest.fn() },
      };
      return cb(tx);
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const request = new NextRequest('http://localhost:3000/api/payments/pay-1', {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'Patient requested receipt' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('updated successfully');
  });

  it('returns 404 when payment not found', async () => {
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/payments/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'test' }),
    });
    const response = await PATCH(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Payment not found');
  });

  it('rejects modification of already-refunded payment', async () => {
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-1',
      amount: 15000,
      status: 'REFUNDED',
      invoice: { id: 'inv-1' },
    });

    const request = new NextRequest('http://localhost:3000/api/payments/pay-1', {
      method: 'PATCH',
      body: JSON.stringify({ notes: 'try to modify' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot modify payment');
  });

  it('rejects refund on non-completed payment', async () => {
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'pay-1',
      amount: 15000,
      status: 'PENDING',
      invoice: { id: 'inv-1' },
    });

    const request = new NextRequest('http://localhost:3000/api/payments/pay-1', {
      method: 'PATCH',
      body: JSON.stringify({ refund: true }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Only completed payments');
  });
});
