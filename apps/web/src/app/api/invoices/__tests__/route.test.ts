/**
 * Invoices API Route Tests
 *
 * GET  /api/invoices - List invoices for a patient
 * POST /api/invoices - Create new invoice with line items
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    invoiceLineItem: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns invoice list for patient', async () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        patientId: 'patient-1',
        invoiceNumber: 'INV-2025-0001',
        status: 'PENDING',
        totalAmount: 10000,
        issueDate: new Date,
        dueDate: new Date,
        paidDate: null,
        lineItems: [],
        payments: [],
      },
    ];

    (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

    const request = new NextRequest('http://localhost:3000/api/invoices?patientId=patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].invoiceNumber).toBe('INV-2025-0001');
    expect(data.data[0].totalAmount).toBe(10000);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 'patient-1' },
        include: expect.objectContaining({
          lineItems: expect.anything(),
          payments: expect.anything(),
        }),
      })
    );
  });

  it('rejects missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('patientId query parameter is required');
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/invoices', () => {
  const mockCreatedLineItem = {
    id: 'li-1',
    invoiceId: 'inv-new',
    description: 'Consultation',
    itemType: 'CONSULTATION',
    quantity: 1,
    unitPrice: 10000,
    totalPrice: 10000,
  };

  const mockCreatedInvoice = {
    id: 'inv-new',
    invoiceNumber: 'INV-2025-0001',
    patientId: 'patient-1',
    status: 'DRAFT',
    totalAmount: 11600,
    subtotal: 10000,
    taxAmount: 1600,
    lineItems: [mockCreatedLineItem],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (tx: any) => Promise<any>) => {
        const mockTx = {
          invoice: {
            create: jest.fn().mockResolvedValue(mockCreatedInvoice),
          },
          invoiceLineItem: {
            create: jest.fn().mockResolvedValue(mockCreatedLineItem),
          },
        };
        return callback(mockTx);
      }
    );
  });

  it('creates new invoice', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        dueDate: '2025-04-15',
        lineItems: [
          {
            description: 'Consultation',
            itemType: 'CONSULTATION',
            quantity: 1,
            unitPrice: 10000,
          },
        ],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.invoiceNumber).toBe('INV-2025-0001');
    expect(data.data.status).toBe('DRAFT');
    expect(data.message).toContain('created successfully');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('rejects invalid data - missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      body: JSON.stringify({
        dueDate: '2025-04-15',
        lineItems: [
          {
            description: 'Consultation',
            itemType: 'CONSULTATION',
            quantity: 1,
            unitPrice: 10000,
          },
        ],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid data - empty line items', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        dueDate: '2025-04-15',
        lineItems: [],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
    expect(data.error).toContain('at least one line item');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid data - incomplete line item', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        dueDate: '2025-04-15',
        lineItems: [
          {
            description: 'Consultation',
            itemType: 'CONSULTATION',
            quantity: 1,
            // missing unitPrice
          },
        ],
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Each line item must have');
    expect(data.error).toContain('description, itemType, quantity, unitPrice');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
