import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/server', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(),
}));

jest.mock('@/lib/invoices/pdf-generator', () => ({
  InvoicePDF: jest.fn(),
}));

jest.mock('@/lib/invoices/cfdi-generator', () => ({
  generateCFDIQRCode: jest.fn(),
}));

// The route creates `const prisma = new PrismaClient()` at module level.
// We must provide a real implementation in the factory so the module-level
// construction gets a usable object (with invoice.findUnique and $disconnect).
jest.mock('@prisma/client', () => {
  const invoiceFindUnique = jest.fn();
  const disconnect = jest.fn();
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      invoice: { findUnique: invoiceFindUnique },
      $disconnect: disconnect,
    })),
    // Expose mock fns for test configuration
    __invoiceFindUnique: invoiceFindUnique,
  };
});

jest.mock('react', () => ({
  createElement: jest.fn().mockReturnValue({}),
}));

const { GET } = require('../route');
const { getCurrentUser } = require('@/lib/auth/server');
const { renderToBuffer } = require('@react-pdf/renderer');
// Access the shared mock fn exposed by the factory
const { __invoiceFindUnique: mockInvoiceFindUnique } = require('@prisma/client');

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  issueDate: new Date(),
  dueDate: new Date(),
  status: 'PAID',
  patientId: 'patient-1',
  currency: 'MXN',
  subtotal: 10000,
  taxAmount: 1600,
  taxRate: 0.16,
  discountAmount: 0,
  totalAmount: 11600,
  cfdiUUID: null,
  cfdiStampDate: null,
  cfdiSerie: null,
  cfdiNumber: null,
  rfc: null,
  billingName: null,
  billingAddress: null,
  billingCity: null,
  billingState: null,
  billingPostalCode: null,
  fiscalAddress: null,
  taxRegime: null,
  description: null,
  notes: null,
  patient: { firstName: 'Maria', lastName: 'Silva', email: 'maria@test.com', phone: null },
  lineItems: [
    { description: 'Consulta', quantity: 1, unitPrice: 10000, totalPrice: 10000 },
  ],
};

describe('GET /api/portal/invoices/[id]/pdf', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns PDF buffer for authorized user', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'ADMIN' });
    mockInvoiceFindUnique.mockResolvedValue(mockInvoice);
    (renderToBuffer as jest.Mock).mockResolvedValue(Buffer.from('pdf-content'));

    const req = new NextRequest('http://localhost:3000/api/portal/invoices/inv-1/pdf');
    const res = await GET(req, { params: { id: 'inv-1' } });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('invoice-INV-001.pdf');
  });

  it('returns 401 when user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/invoices/inv-1/pdf');
    const res = await GET(req, { params: { id: 'inv-1' } });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('No autenticado');
  });

  it('returns 404 when invoice is not found', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'ADMIN' });
    mockInvoiceFindUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/invoices/missing/pdf');
    const res = await GET(req, { params: { id: 'missing' } });
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 403 when patient tries to access another patients invoice', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'user-1',
      role: 'PATIENT',
      patientId: 'other-patient',
    });
    mockInvoiceFindUnique.mockResolvedValue(mockInvoice);

    const req = new NextRequest('http://localhost:3000/api/portal/invoices/inv-1/pdf');
    const res = await GET(req, { params: { id: 'inv-1' } });
    const data = await res.json();

    expect(res.status).toBe(403);
  });
});
