import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = (id: string) => ({
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: { id },
});

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const mockInvoice = {
  id: 'inv-1',
  status: 'PENDING',
  totalAmount: 500,
  taxRate: 16,
  discountAmount: 0,
  paidDate: null,
  voidedDate: null,
  dueDate: futureDate,
  patient: { id: 'pat-1', firstName: 'Ana', lastName: 'Lima', mrn: 'MRN001', email: 'ana@example.com', phone: null },
  lineItems: [{ quantity: 1, unitPrice: 500, taxable: true, createdAt: new Date() }],
  payments: [],
};

describe('GET /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
  });

  it('returns invoice with computed fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/invoices/inv-1');
    const res = await GET(req, mockContext('inv-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('inv-1');
    expect(data.data.amountDue).toBeDefined();
    expect(data.data.totalPaid).toBeDefined();
  });

  it('returns 404 when invoice not found', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/invoices/nonexistent');
    const res = await GET(req, mockContext('nonexistent'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('PATCH /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(mockInvoice);
    (prisma.invoice.update as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'PAID' });
  });

  it('returns 404 when invoice not found', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/invoices/nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' }),
    });
    const res = await PATCH(req, mockContext('nonexistent'));

    expect(res.status).toBe(404);
  });

  it('returns 400 when trying to modify a PAID invoice', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'PAID' });
    const req = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING' }),
    });
    const res = await PATCH(req, mockContext('inv-1'));

    expect(res.status).toBe(400);
  });

  it('marks invoice as paid when markPaid is true', async () => {
    const req = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markPaid: true }),
    });
    const res = await PATCH(req, mockContext('inv-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('DELETE /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({ ...mockInvoice, payments: [] });
    (prisma.invoice.update as jest.Mock).mockResolvedValue({ ...mockInvoice, status: 'VOID' });
  });

  it('voids an invoice successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/invoices/inv-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('inv-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('voided');
  });

  it('returns 403 when invoice has payments', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
      ...mockInvoice,
      payments: [{ id: 'pay-1', status: 'COMPLETED', amount: 500 }],
    });
    const req = new NextRequest('http://localhost:3000/api/invoices/inv-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('inv-1'));

    expect(res.status).toBe(403);
  });

  it('returns 404 when invoice not found', async () => {
    (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/invoices/nonexistent', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('nonexistent'));

    expect(res.status).toBe(404);
  });
});
