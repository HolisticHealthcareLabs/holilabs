import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/auditor/auditor.service', () => ({
  auditorService: {
    findRevenueGaps: jest.fn(),
    getSummary: jest.fn(),
    scanRecentNotes: jest.fn(),
  },
}));

const { GET, POST } = require('../route');
const { auditorService } = require('@/services/auditor/auditor.service');

const ctx = { user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' } };

const mockGaps = [
  {
    id: 'gap-1',
    documentedAt: new Date('2026-03-01'),
    procedure: { code: 'CPT-99213', description: 'Office visit', estimatedValue: 15000 },
  },
];

const mockSummary = {
  totalGaps: 5,
  totalPotentialValue: 75000,
  byCategory: { OFFICE_VISIT: { count: 5, value: 75000 } },
  topProcedures: [{ code: 'CPT-99213', count: 5, totalValue: 75000 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  (auditorService.findRevenueGaps as jest.Mock).mockResolvedValue(mockGaps);
  (auditorService.getSummary as jest.Mock).mockResolvedValue(mockSummary);
  (auditorService.scanRecentNotes as jest.Mock).mockResolvedValue([
    { noteId: 'note-1', noteDate: new Date(), detectedProcedures: [], scanTimeMs: 120 },
  ]);
});

describe('GET /api/auditor', () => {
  it('returns revenue gaps for a specific patient', async () => {
    const req = new NextRequest('http://localhost:3000/api/auditor?patientId=patient-1');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.patientId).toBe('patient-1');
    expect(json.data.gaps).toHaveLength(1);
    expect(json.data.totalPotentialValueFormatted).toContain('R$');
  });

  it('returns clinic-wide summary when no patientId is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/auditor');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.totalGaps).toBe(5);
    expect(json.data.topProcedures).toHaveLength(1);
  });
});

describe('POST /api/auditor', () => {
  it('scans recent notes and returns gaps for a patient', async () => {
    const req = new NextRequest('http://localhost:3000/api/auditor', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1', lookbackHours: 48 }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.patientId).toBe('patient-1');
    expect(json.data.summary.notesScanned).toBe(1);
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auditor', {
      method: 'POST',
      body: JSON.stringify({ lookbackHours: 24 }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/patientId is required/i);
  });
});
